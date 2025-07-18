// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users and messages
const users = {};
const messages = []; // legacy, keep for global
const typingUsers = {};
const rooms = { global: { name: 'Global', messages: [] } };

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', (username) => {
    users[socket.id] = { username, id: socket.id };
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, id: socket.id });
    socket.join('global');
    socket.emit('room_list', Object.keys(rooms).map((k) => ({ id: k, name: rooms[k].name })));
    socket.emit('joined_room', { roomId: 'global', name: 'Global' });
    console.log(`${username} joined the chat`);
  });

  // Handle creating a room
  socket.on('create_room', (roomName) => {
    if (!roomName || typeof roomName !== 'string' || !roomName.trim()) {
      socket.emit('error_event', { message: 'Room name cannot be empty.' });
      return;
    }
    if (Object.values(rooms).some((r) => r.name.toLowerCase() === roomName.trim().toLowerCase())) {
      socket.emit('error_event', { message: 'Room name already exists.' });
      return;
    }
    const roomId = `room_${Date.now()}`;
    rooms[roomId] = { name: roomName, messages: [] };
    io.emit('room_list', Object.keys(rooms).map((k) => ({ id: k, name: rooms[k].name })));
  });

  // Handle joining a room
  socket.on('join_room', (roomId) => {
    Object.keys(rooms).forEach((rid) => socket.leave(rid));
    socket.join(roomId);
    socket.emit('joined_room', { roomId, name: rooms[roomId]?.name });
    // Send last 100 messages for the room
    socket.emit('room_messages', rooms[roomId]?.messages?.slice(-100) || []);
  });

  // Handle chat messages (room-aware)
  socket.on('send_message', ({ message, roomId = 'global' }) => {
    if (!message || typeof message !== 'string' || !message.trim()) {
      socket.emit('error_event', { message: 'Cannot send an empty message.' });
      return;
    }
    const msg = {
      id: Date.now(),
      message,
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date().toISOString(),
      roomId,
      reactions: {}, // emoji: [userId, ...]
    };
    if (rooms[roomId]) {
      rooms[roomId].messages.push(msg);
      if (rooms[roomId].messages.length > 100) rooms[roomId].messages.shift();
      io.to(roomId).emit('receive_message', msg);
    }
  });

  // Handle message reactions
  socket.on('add_reaction', ({ messageId, emoji, roomId = 'global', userId }) => {
    if (!rooms[roomId]) return;
    const msg = rooms[roomId].messages.find((m) => m.id === messageId);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    // Toggle reaction: add if not present, remove if present
    const idx = msg.reactions[emoji].indexOf(userId);
    if (idx === -1) {
      msg.reactions[emoji].push(userId);
    } else {
      msg.reactions[emoji].splice(idx, 1);
      if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
    }
    io.to(roomId).emit('update_reactions', { messageId, reactions: msg.reactions });
  });

  // Handle typing indicator (room-aware)
  socket.on('typing', ({ isTyping, roomId = 'global' }) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      if (!typingUsers[roomId]) typingUsers[roomId] = {};
      if (isTyping) {
        typingUsers[roomId][socket.id] = username;
      } else {
        delete typingUsers[roomId][socket.id];
      }
      io.to(roomId).emit('typing_users', Object.values(typingUsers[roomId] || {}));
    }
  });

  // Handle private messages (unchanged)
  socket.on('private_message', ({ to, message }) => {
    const messageData = {
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      receiverId: to,
    };
    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const { username } = users[socket.id];
      io.emit('user_left', { username, id: socket.id });
      console.log(`${username} left the chat`);
    }
    delete users[socket.id];
    Object.values(typingUsers).forEach((room) => delete room[socket.id]);
    io.emit('user_list', Object.values(users));
    Object.keys(rooms).forEach((roomId) => {
      io.to(roomId).emit('typing_users', Object.values(typingUsers[roomId] || {}));
    });
  });
});

// API routes
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

// New: get all rooms
app.get('/api/rooms', (req, res) => {
  res.json(Object.keys(rooms).map((k) => ({ id: k, name: rooms[k].name })));
});

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io }; 