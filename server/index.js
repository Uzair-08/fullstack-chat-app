// ===================================================================================
// FILE: server/index.js (FINAL VERSION - LOGOUT FIX)
// ===================================================================================
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// --- SERVER AND DATABASE SETUP ---
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// --- DATABASE CONNECTION ---
let sequelize;
if (process.env.DATABASE_URL) {
  // This is the configuration for the deployed Render database
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Required for Render connections
      }
    }
  });
} else {
  // This is the configuration for your local database
  sequelize = new Sequelize('chatapp', 'postgres', 'MangoTree@08', {
    host: 'localhost',
    dialect: 'postgres',
    port: 5555,
    logging: false
  });
}

// --- CLOUDINARY CONFIG ---
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET 
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- MULTER SETUP ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- DATABASE MODELS ---
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password_hash: { type: DataTypes.STRING, allowNull: false }
});
const Channel = sequelize.define('Channel', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  creatorId: { type: DataTypes.INTEGER, allowNull: false }
});
const Message = sequelize.define('Message', {
  content: { type: DataTypes.TEXT, allowNull: true },
  imageUrl: { type: DataTypes.STRING, allowNull: true }
});

// --- MODEL ASSOCIATIONS ---
User.hasMany(Message, { onDelete: 'CASCADE' });
Message.belongsTo(User);
Channel.hasMany(Message, { onDelete: 'CASCADE' });
Message.belongsTo(Channel);
User.hasMany(Channel, { foreignKey: 'creatorId', as: 'createdChannels', onDelete: 'CASCADE' });
Channel.belongsTo(User, { as: 'creator', foreignKey: 'creatorId' });

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, email, password_hash: hashedPassword });
        res.status(201).json({ message: 'User created successfully', userId: newUser.id });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});

app.get('/api/channels', authenticateToken, async (req, res) => {
    try {
        const channels = await Channel.findAll({ order: [['name', 'ASC']] });
        res.json(channels);
    } catch (error) { res.status(500).json({ message: 'Error fetching channels' }); }
});

app.post('/api/channels', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Channel name is required' });
        const newChannel = await Channel.create({ name, creatorId: req.user.id });
        io.emit('newChannel', newChannel);
        res.status(201).json(newChannel);
    } catch (error) { res.status(500).json({ message: 'Error creating channel' }); }
});

app.delete('/api/channels/:channelId', authenticateToken, async (req, res) => {
    try {
        const channel = await Channel.findByPk(req.params.channelId);
        if (!channel) return res.status(404).json({ message: 'Channel not found' });
        if (channel.creatorId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
        await channel.destroy();
        io.emit('channelDeleted', req.params.channelId);
        res.status(200).json({ message: 'Channel deleted' });
    } catch (error) { res.status(500).json({ message: 'Error deleting channel' }); }
});

app.get('/api/channels/:channelId/messages', authenticateToken, async (req, res) => {
    try {
        const messages = await Message.findAll({
            where: { ChannelId: req.params.channelId },
            include: [{ model: User, attributes: ['id', 'username'] }],
            order: [['createdAt', 'ASC']],
            limit: 100
        });
        res.json(messages);
    } catch (error) { res.status(500).json({ message: 'Error fetching messages' }); }
});

app.put('/api/messages/:messageId', authenticateToken, async (req, res) => {
    try {
        const message = await Message.findByPk(req.params.messageId, { include: [User, Channel] });
        if (!message) return res.status(404).json({ message: 'Message not found' });
        if (message.UserId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
        message.content = req.body.content;
        await message.save();
        io.to(message.Channel.name).emit('messageUpdated', message);
        res.status(200).json(message);
    } catch (error) { res.status(500).json({ message: 'Error editing message' }); }
});

// Image Upload Route
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  const stream = cloudinary.uploader.upload_stream({ folder: "chat-app" }, (error, result) => {
    if (error) return res.status(500).send(error);
    res.status(200).json({ imageUrl: result.secure_url });
  });
  stream.end(req.file.buffer);
});

// --- SOCKET.IO LOGIC ---
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const channels = {}; 
const socketToChannel = {}; 

io.on('connection', (socket) => {
    const handleUserLeave = () => {
        const channelName = socketToChannel[socket.id];
        if (channelName && channels[channelName]) {
            channels[channelName] = channels[channelName].filter(u => u.socketId !== socket.id);
            io.to(channelName).emit('updateUserList', channels[channelName].map(u => u.username));
        }
        delete socketToChannel[socket.id];
    };

    socket.on('joinChannel', ({ channelName, username }) => {
        handleUserLeave(); // Leave previous channel before joining new one

        socket.join(channelName);
        socketToChannel[socket.id] = channelName;

        if (!channels[channelName]) {
            channels[channelName] = [];
        }
        if (!channels[channelName].some(u => u.socketId === socket.id)) {
            channels[channelName].push({ username, socketId: socket.id });
        }
        
        io.to(channelName).emit('updateUserList', channels[channelName].map(u => u.username));
    });

    socket.on('startTyping', (data) => socket.to(data.channel).emit('userTyping', data.user));
    socket.on('stopTyping', (data) => socket.to(data.channel).emit('userStoppedTyping', data.user));

    // NEW: Handle explicit logout event from client
    socket.on('logout', () => {
        handleUserLeave();
    });

    socket.on('disconnect', () => {
        handleUserLeave();
    });

    socket.on('chatMessage', async (msg) => {
        try {
            const user = await User.findOne({ where: { username: msg.user } });
            const channel = await Channel.findOne({ where: { name: msg.channel } });
            if (user && channel) {
                const newMessage = await Message.create({ 
                    content: msg.text || null,
                    imageUrl: msg.imageUrl || null,
                    UserId: user.id, 
                    ChannelId: channel.id 
                });
                const messageToSend = { ...newMessage.toJSON(), User: user };
                io.to(msg.channel).emit('chatMessage', messageToSend);
            }
        } catch (error) { console.error('Error saving message:', error); }
    });
});

// --- START SERVER ---
sequelize.sync({ alter: true }).then(async () => {
    try {
        const [systemUser] = await User.findOrCreate({
            where: { username: 'system' },
            defaults: { email: 'system@chat.app', password_hash: await bcrypt.hash('system_password', 10) }
        });
        // await Channel.findOrCreate({ where: { name: 'general' }, defaults: { creatorId: systemUser.id } });
        // await Channel.findOrCreate({ where: { name: 'random' }, defaults: { creatorId: systemUser.id } });
        server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    } catch (error) { console.error('Error during initial data setup:', error); }
}).catch(error => console.error('Unable to sync database:', error));
