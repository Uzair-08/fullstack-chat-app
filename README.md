# ProChat - Real-Time Full-Stack Chat Application

![ProChat Demo](https://placehold.co/800x400/111b21/e9edef?text=Add+a+GIF+or+Screenshot+of+Your+App!)

A feature-rich, real-time chat application inspired by modern messaging platforms like WhatsApp and Slack. Built with a React front-end, Node.js/Express back-end, and a PostgreSQL database, this project showcases a complete full-stack architecture with secure authentication and real-time communication using WebSockets.

**Live Demo:** [Link to your deployed Vercel URL will go here]

---

## Features

- **Secure User Authentication:** Users can register and log in securely using JWT (JSON Web Tokens).
- **Multi-Channel Chat Rooms:** Create, join, and chat in multiple distinct public channels.
- **Real-Time Messaging:** Messages are delivered instantly to all users in a channel using Socket.IO.
- **Message Persistence:** Chat history is saved to a PostgreSQL database and loaded when joining a channel.
- **Image Uploads:** Users can upload and share images, which are stored securely on Cloudinary.
- **Message Editing:** Users can edit their own sent messages, with real-time updates for all participants.
- **Channel Ownership & Deletion:** The user who creates a channel is the only one who can delete it.
- **User Presence:** See a live list of which users are currently online in each channel.
- **Typing Indicators:** A "user is typing..." indicator appears in real-time to improve conversational flow.

---

## Tech Stack

| Category      | Technology                                       |
|---------------|--------------------------------------------------|
| **Front-End** | React, Axios, Socket.IO Client, JWT Decode       |
| **Back-End** | Node.js, Express.js, Socket.IO, Sequelize (ORM)  |
| **Database** | PostgreSQL                                       |
| **Security** | JWT (JSON Web Tokens), bcrypt (Password Hashing) |
| **File Storage**| Cloudinary, Multer                               |

---

## Local Setup

To run this project on your local machine, follow these steps:

### Prerequisites

- Node.js
- PostgreSQL
- A Cloudinary account

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
    cd your-repo-name
    ```

2.  **Set up the Back-End:**
    ```bash
    cd server
    npm install
    ```
    - Create a `.env` file in the `server` directory and fill in your database, JWT, and Cloudinary credentials.
    - Create a PostgreSQL database named `chatapp`.
    - Start the server:
    ```bash
    npm start
    ```

3.  **Set up the Front-End:**
    ```bash
    cd ../client
    npm install
    ```
    - Start the client:
    ```bash
    npm start
    ```

The application will be available at `http://localhost:3000`.
