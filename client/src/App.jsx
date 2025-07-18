import React, { useState, useRef, useEffect } from 'react'; 
import { useSocket } from './socket/socket';

const GLOBAL_CHAT = 'global';

const App = () => {
  const [username, setUsername] = useState('');
  const [inputName, setInputName] = useState('');
  const [message, setMessage] = useState('');
  const [isTyping, setIsTypingLocal] = useState(false);
  const [activeChat, setActiveChat] = useState(GLOBAL_CHAT);
  const [newRoomName, setNewRoomName] = useState('');
  const messageEndRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const {
    isConnected,
    messages,
    users,
    typingUsersByRoom,
    rooms,
    activeRoom,
    myId,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    createRoom,
    joinRoom,
    setActiveRoom: setSocketActiveRoom,
    addReaction,
    error,
    setError,
  } = useSocket();

  useEffect(() => setLoading(!isConnected), [isConnected]);

  useEffect(() => {
    if (!isConnected && username) setError('Connection lost. Trying to reconnect...');
    else setError('');
  }, [isConnected, username, setError]);

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return setError('Room name cannot be empty.');
    if (rooms.some(r => r.name.toLowerCase() === newRoomName.trim().toLowerCase()))
      return setError('Room name already exists.');
    setError('');
    createRoom(newRoomName.trim());
    setNewRoomName('');
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return setError('Cannot send an empty message.');
    setError('');
    if (activeChat === GLOBAL_CHAT || rooms.some((r) => r.id === activeChat)) {
      sendMessage(message.trim(), activeChat);
    } else {
      sendPrivateMessage(activeChat, message.trim());
    }
    setMessage('');
    setTyping(false, activeChat);
  };

  const filteredMessages = messages.filter((msg) => {
    if (activeChat === GLOBAL_CHAT) return !msg.isPrivate && (!msg.roomId || msg.roomId === GLOBAL_CHAT);
    if (rooms.some((r) => r.id === activeChat)) return !msg.isPrivate && msg.roomId === activeChat;
    return (
      msg.isPrivate &&
      ((msg.senderId === activeChat && msg.receiverId === myId) ||
       (msg.senderId === myId && msg.receiverId === activeChat))
    );
  });

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredMessages]);

  useEffect(() => {
    if (!isTyping) return;
    setTyping(true, activeChat);
    const timeout = setTimeout(() => setTyping(false, activeChat), 1500);
    return () => clearTimeout(timeout);
  }, [isTyping, setTyping, activeChat]);

  useEffect(() => {
    if (rooms.some((r) => r.id === activeChat) && activeRoom !== activeChat) {
      joinRoom(activeChat);
      setSocketActiveRoom(activeChat);
    }
  }, [activeChat, activeRoom, joinRoom, setSocketActiveRoom, rooms]);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (inputName.trim()) {
      setUsername(inputName.trim());
      connect(inputName.trim());
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    setIsTypingLocal(true);
  };

  const getActiveChatName = () => {
    if (activeChat === GLOBAL_CHAT) return 'Global Chat Room';
    const room = rooms.find((r) => r.id === activeChat);
    if (room) return `Room: ${room.name}`;
    const user = users.find((u) => u.id === activeChat);
    return user ? `Private Chat with ${user.username}` : 'Private Chat';
  };

  const EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢'];

  const typingNow = typingUsersByRoom?.[activeChat]?.filter((u) => u !== username) || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mb-4"></div>
          <span className="text-indigo-700 font-semibold">Connecting to chat server...</span>
        </div>
      </div>
    );
  }

  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
        <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center text-indigo-700">Enter your username to join the chat</h2>
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Username"
              required
              autoFocus
              className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white font-semibold py-2 rounded hover:bg-indigo-700 transition"
            >
              Join
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-100 to-indigo-200">
      {/* Sidebar: Rooms and Users */}
      <aside className="md:w-1/4 w-full bg-white/80 shadow-lg md:rounded-l-lg p-4 flex flex-col">
        <h3 className="text-lg font-semibold text-indigo-700 mb-2">Rooms</h3>
        <ul className="space-y-2 mb-4">
          <li
            className={`px-3 py-2 rounded flex items-center gap-2 cursor-pointer ${activeChat === GLOBAL_CHAT ? 'bg-indigo-200 font-bold text-indigo-700' : 'hover:bg-indigo-50'}`}
            onClick={() => setActiveChat(GLOBAL_CHAT)}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Global Chat
          </li>
          {rooms.filter((room) => room.id !== GLOBAL_CHAT).map((room) => (
            <li
              key={room.id}
              className={`px-3 py-2 rounded flex items-center gap-2 cursor-pointer ${activeChat === room.id ? 'bg-indigo-100 font-bold text-indigo-700' : 'hover:bg-indigo-50'}`}
              onClick={() => setActiveChat(room.id)}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              {room.name}
            </li>
          ))}
        </ul>
        <form className="flex gap-2 mb-6" onSubmit={handleCreateRoom}>
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="New room name"
            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
          >
            +
          </button>
        </form>
        <h3 className="text-lg font-semibold text-indigo-700 mb-2">Private Chats</h3>
        <ul className="flex-1 overflow-y-auto space-y-2">
          {users.filter((user) => user.username !== username).map((user) => (
            <li
              key={user.id}
              className={`px-3 py-2 rounded flex items-center gap-2 cursor-pointer ${activeChat === user.id ? 'bg-pink-100 font-bold text-pink-700' : 'hover:bg-pink-50'}`}
              onClick={() => setActiveChat(user.id)}
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {user.username}
            </li>
          ))}
        </ul>
      </aside>
      {/* Chat Main */}
      <main className="flex-1 flex flex-col bg-white/90 shadow-lg md:rounded-r-lg p-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-4 border-b pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-indigo-700">{getActiveChatName()}</h2>
            <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <button
            className="text-sm text-red-500 hover:underline"
            onClick={disconnect}
          >
            Logout
          </button>
        </header>
        {error && (
          <div className="mb-2 p-2 bg-red-100 text-red-700 rounded text-center text-sm">{error}</div>
        )}
        {/* Messages */}
        <section className="flex-1 overflow-y-auto mb-2 space-y-2 pr-2">
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.system ? 'items-center' : msg.sender === username ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg shadow-sm mb-1 whitespace-pre-line break-words
                  ${msg.system ? 'bg-gray-200 text-gray-600 text-xs italic' : msg.isPrivate ? 'bg-pink-100 text-pink-800 border border-pink-300' : msg.sender === username ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-800'}`}
              >
                {!msg.system && (
                  <span className="block text-xs font-semibold mb-1">
                    {msg.sender}{msg.isPrivate && ' (private)'}
                  </span>
                )}
                <span className="block">{msg.message}</span>
                <span className="block text-[10px] text-right mt-1 opacity-70">
                  {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {/* Reactions UI */}
                <div className="flex gap-1 mt-1">
                  {EMOJIS.map((emoji) => {
                    const count = msg.reactions?.[emoji]?.length || 0;
                    const reacted = msg.reactions?.[emoji]?.includes(userId);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        className={`text-lg px-1 rounded hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${reacted ? 'bg-indigo-200' : ''}`}
                        onClick={() => {
                          const roomId = msg.roomId || GLOBAL_CHAT;
                          addReaction(msg.id, emoji, roomId, userId);
                        }}
                      >
                        {emoji} {count > 0 && <span className="text-xs align-top">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messageEndRef} />
        </section>
        {/* Input */}
        <form className="flex gap-2 mt-2" onSubmit={handleSend}>
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            onFocus={() => setTyping(true)}
            onBlur={() => setTyping(false)}
            placeholder="Type your message..."
            disabled={!isConnected}
            autoFocus
            className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
          <button
            type="submit"
            disabled={!message.trim() || !isConnected}
            className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
          >
            Send
          </button>
        </form>
        {/* Typing Indicator */}
        <div className="h-6 mt-1">
          {typingUsers.length > 0 && (
            <span className="text-xs text-gray-500">
              {typingUsers.filter((u) => u !== username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
