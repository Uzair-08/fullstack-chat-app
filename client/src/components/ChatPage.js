// ===================================================================================
// FILE: client/src/components/ChatPage.js (FINAL VERSION - LOGOUT FIX)
// ===================================================================================
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import CreateChannelForm from './CreateChannelForm';

const socket = io('http://localhost:5000');

// --- HELPER COMPONENTS ---
const ChannelList = ({ channels, currentChannel, currentUser, onChannelSelect, onDeleteChannel }) => (
    <div className="channel-list">
        {channels.map(channel => (
            <div key={channel.id} className={`channel-item ${channel.id === currentChannel.id ? 'active' : ''}`} onClick={() => onChannelSelect(channel)}>
                <span># {channel.name}</span>
                {channel.creatorId === currentUser.id && (
                    <button onClick={(e) => { e.stopPropagation(); onDeleteChannel(channel.id) }} className="delete-channel-btn">🗑️</button>
                )}
            </div>
        ))}
    </div>
);

const MessageList = ({ messages, currentUser, onEditMessage, typingUsers }) => {
    const messageListRef = useRef(null);
    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages, typingUsers]);

    return (
        <div className="message-list" ref={messageListRef}>
            {messages.map(msg => (
                <div key={msg.id} className={`message-container ${msg.User.id === currentUser.id ? 'own-message' : ''}`}>
                    <div className={`message-bubble ${msg.User.id === currentUser.id ? 'own-message' : 'other-message'}`}>
                        {msg.User.id !== currentUser.id && <div className="message-sender">{msg.User.username}</div>}
                        
                        {msg.imageUrl ? (
                            <img src={msg.imageUrl} alt="chat attachment" className="message-image" />
                        ) : (
                            <div className="message-content" onDoubleClick={() => msg.User.id === currentUser.id && onEditMessage(msg)}>
                                {msg.content}
                            </div>
                        )}

                        <div className="message-timestamp">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>
            ))}
            {typingUsers.length > 0 && (
                <div className="message-container">
                    <div className="message-bubble other-message typing-bubble">
                        <div className="message-content">{`${typingUsers.join(', ')} is typing...`}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MessageInput = ({ onSendMessage, username, currentChannel }) => {
    const [text, setText] = useState('');
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            socket.emit('chatMessage', { channel: currentChannel, user: username, imageUrl: res.data.imageUrl });
        } catch (error) {
            alert("Image upload failed!");
        }
    };

    const handleTyping = () => {
        socket.emit('startTyping', { channel: currentChannel, user: username });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stopTyping', { channel: currentChannel, user: username });
        }, 3000);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim()) {
            onSendMessage(text);
            socket.emit('stopTyping', { channel: currentChannel, user: username });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            setText('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="message-input-form">
            <button type="button" className="attach-btn" onClick={() => fileInputRef.current.click()}>📎</button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleTyping} placeholder={`Message #${currentChannel}`} />
            <button type="submit">➤</button>
        </form>
    );
};

// --- MAIN CHAT PAGE COMPONENT ---
function ChatPage({ onLogout }) {
    const [channels, setChannels] = useState([]);
    const [currentChannel, setCurrentChannel] = useState({ id: null, name: '' });
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState({ id: null, username: '' });
    const [editingMessage, setEditingMessage] = useState(null);
    
    const currentChannelRef = useRef(currentChannel);
    useEffect(() => {
        currentChannelRef.current = currentChannel;
    }, [currentChannel]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { onLogout(); return; }
        const decodedUser = jwtDecode(token);
        setCurrentUser(decodedUser);

        const fetchInitialData = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/channels', { headers: { Authorization: `Bearer ${token}` } });
                const fetchedChannels = res.data;
                setChannels(fetchedChannels);
                
                if (fetchedChannels.length > 0) {
                    setCurrentChannel(fetchedChannels[0]);
                    socket.emit('joinChannel', { channelName: fetchedChannels[0].name, username: decodedUser.username });
                }
            } catch (error) { console.error("Failed to fetch channels", error); }
        };
        fetchInitialData();

        const handleChatMessage = (msg) => {
            if (msg.channel === currentChannelRef.current.name) {
                setMessages(prev => [...prev, msg]);
            }
        };
        
        const handleNewChannel = (newChannel) => {
            setChannels(prev => {
                const updatedChannels = [...prev, newChannel];
                if (prev.length === 0) {
                    setCurrentChannel(newChannel);
                    socket.emit('joinChannel', { channelName: newChannel.name, username: decodedUser.username });
                }
                return updatedChannels;
            });
        };
        
        const handleChannelDeleted = (channelId) => {
            setChannels(prevChannels => {
                const updatedChannels = prevChannels.filter(c => c.id !== parseInt(channelId));
                if (currentChannelRef.current.id === parseInt(channelId)) {
                    const fallbackChannel = updatedChannels[0] || { id: null, name: '' };
                    setCurrentChannel(fallbackChannel);
                    if (fallbackChannel.id) {
                        socket.emit('joinChannel', { channelName: fallbackChannel.name, username: decodedUser.username });
                    }
                }
                return updatedChannels;
            });
        };

        socket.on('chatMessage', handleChatMessage);
        socket.on('messageUpdated', (updatedMsg) => setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m)));
        socket.on('updateUserList', (users) => setOnlineUsers(users));
        socket.on('userTyping', (user) => setTypingUsers(prev => [...new Set([...prev, user])]));
        socket.on('userStoppedTyping', (user) => setTypingUsers(prev => prev.filter(u => u !== user)));
        socket.on('newChannel', handleNewChannel);
        socket.on('channelDeleted', handleChannelDeleted);

        return () => {
            socket.off('chatMessage', handleChatMessage);
            socket.off('updateUserList');
            socket.off('userTyping');
            socket.off('userStoppedTyping');
            socket.off('newChannel');
            socket.off('channelDeleted');
            socket.off('messageUpdated');
        };
    }, [onLogout]);

    useEffect(() => {
        const fetchMessages = async () => {
            if (currentChannel.id) {
                const token = localStorage.getItem('token');
                const res = await axios.get(`http://localhost:5000/api/channels/${currentChannel.id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
                setMessages(res.data);
            } else {
                setMessages([]);
            }
        };
        fetchMessages();
    }, [currentChannel]);

    const handleChannelSelect = (channel) => {
        socket.emit('joinChannel', { channelName: channel.name, username: currentUser.username });
        setCurrentChannel(channel);
    };

    const handleSendMessage = (text) => {
        socket.emit('chatMessage', { channel: currentChannel.name, user: currentUser.username, text });
    };

    const handleEditSubmit = async (messageId, newContent) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/messages/${messageId}`, { content: newContent }, { headers: { Authorization: `Bearer ${token}` } });
            setEditingMessage(null);
        } catch (error) { console.error("Failed to edit message", error); }
    };
    
    const handleDeleteChannel = async (channelId) => {
        if (window.confirm("Are you sure you want to delete this channel?")) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:5000/api/channels/${channelId}`, { headers: { Authorization: `Bearer ${token}` } });
            } catch (error) { console.error("Failed to delete channel", error); }
        }
    };

    // NEW: Updated handleLogout function
    const handleLogout = () => {
        socket.emit('logout'); // Tell the server we are logging out
        localStorage.removeItem('token');
        onLogout();
    };

    return (
        <div className="chat-page">
            <div className="sidebar">
                <div className="sidebar-header">
                    <h3>Channels</h3>
                     <button onClick={handleLogout} className="logout-button">🚪</button>
                </div>
                <ChannelList channels={channels} currentChannel={currentChannel} currentUser={currentUser} onChannelSelect={handleChannelSelect} onDeleteChannel={handleDeleteChannel} />
                <CreateChannelForm onChannelCreated={() => {}} />
            </div>
            <div className="chat-main">
                <div className="chat-header">
                    <h2># {currentChannel.name || 'No Channels'}</h2>
                    <div>{onlineUsers.length} users online: {onlineUsers.join(', ')}</div>
                </div>
                {editingMessage ? (
                    <div className="edit-form-container">
                        <form onSubmit={(e) => { e.preventDefault(); handleEditSubmit(editingMessage.id, editingMessage.content); }}>
                            <input type="text" value={editingMessage.content} onChange={(e) => setEditingMessage({ ...editingMessage, content: e.target.value })} autoFocus />
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setEditingMessage(null)}>Cancel</button>
                        </form>
                    </div>
                ) : (
                    <MessageList messages={messages} currentUser={currentUser} onEditMessage={setEditingMessage} typingUsers={typingUsers} />
                )}
                <div className="chat-footer">
                    <MessageInput onSendMessage={handleSendMessage} username={currentUser.username} currentChannel={currentChannel.name} />
                </div>
            </div>
        </div>
    );
}

export default ChatPage;
