// socket.js - Socket.io client setup

// socket/socket.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000'); // Update this to your server URL if different

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [myId, setMyId] = useState(null);
  const [typingUsersByRoom, setTypingUsersByRoom] = useState({});
  const [error, setError] = useState('');
  const usernameRef = useRef('');

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      setMyId(socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('chat:message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('chat:users', (allUsers) => {
      setUsers(allUsers);
    });

    socket.on('chat:rooms', (serverRooms) => {
      setRooms(serverRooms);
    });

    socket.on('chat:joinedRoom', (roomId) => {
      setActiveRoom(roomId);
    });

    socket.on('chat:typing', ({ roomId, username }) => {
      setTypingUsersByRoom(prev => ({
        ...prev,
        [roomId]: [...new Set([...(prev[roomId] || []), username])]
      }));
    });

    socket.on('chat:stopTyping', ({ roomId, username }) => {
      setTypingUsersByRoom(prev => ({
        ...prev,
        [roomId]: (prev[roomId] || []).filter(name => name !== username)
      }));
    });

    socket.on('chat:error', (msg) => {
      setError(msg);
    });

    return () => {
      socket.off();
    };
  }, []);

  const connect = useCallback((username) => {
    usernameRef.current = username;
    socket.emit('user:join', username);
  }, []);

  const disconnect = useCallback(() => {
    socket.disconnect();
  }, []);

  const sendMessage = useCallback((text, roomId) => {
    socket.emit('chat:message', { text, roomId });
  }, []);

  const sendPrivateMessage = useCallback((receiverId, text) => {
    socket.emit('chat:privateMessage', { to: receiverId, text });
  }, []);

  const setTyping = useCallback((typing, roomId) => {
    if (typing) {
      socket.emit('chat:typing', { roomId, username: usernameRef.current });
    } else {
      socket.emit('chat:stopTyping', { roomId, username: usernameRef.current });
    }
  }, []);

  const createRoom = useCallback((roomName) => {
    socket.emit('chat:createRoom', roomName);
  }, []);

  const joinRoom = useCallback((roomId) => {
    socket.emit('chat:joinRoom', roomId);
  }, []);

  const addReaction = useCallback((messageId, emoji) => {
    socket.emit('chat:reaction', { messageId, emoji });
  }, []);

  return {
    isConnected,
    messages,
    users,
    rooms,
    activeRoom,
    myId,
    typingUsersByRoom,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    createRoom,
    joinRoom,
    setActiveRoom,
    addReaction,
    error,
    setError,
  };
};