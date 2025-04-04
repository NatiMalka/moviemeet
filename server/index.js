import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configure CORS for socket.io
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'https://movie-meet-1a81b.web.app'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Configure Express with enhanced CORS handling
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'https://movie-meet-1a81b.web.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires']
}));

// Additional CORS handling for preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://movie-meet-1a81b.web.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma, Expires');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).send();
});

app.use(express.json());

// Basic route for health check
app.get('/', (req, res) => {
  res.send('MovieMeet WebSocket Server is running');
});

// LiveKit token generation endpoint
app.post('/generate-token', (req, res) => {
  try {
    const { roomId, username } = req.body;
    
    if (!roomId || !username) {
      return res.status(400).json({ error: 'roomId and username are required' });
    }
    
    // Check if we have LiveKit credentials
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    if (!apiKey || apiSecret === 'your_api_secret_here' || !apiSecret) {
      console.log('LiveKit credentials not configured, suggest using development mode');
      return res.status(500).json({ 
        error: 'LiveKit API credentials not configured',
        devToken: true,
        message: 'Server not configured with LiveKit credentials. Use development mode instead.'
      });
    }
    
    // Create token with permissions
    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
    });
    
    at.addGrant({ 
      roomJoin: true, 
      room: roomId,
      canPublish: true,
      canSubscribe: true,
    });
    
    const token = at.toJwt();
    res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      message: error.message 
    });
  }
});

// Store active rooms and users
const rooms = new Map();

// REST API endpoints to match the updated frontend
// Join a room
app.post('/api/room/join', (req, res) => {
  try {
    const { roomId, username } = req.body;
    
    if (!roomId || !username) {
      return res.status(400).json({ error: 'roomId and username are required' });
    }
    
    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        videoState: {
          currentTime: 0,
          isPlaying: false
        },
        messages: []
      });
    }
    
    // Generate a unique ID for the user
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add user to room
    const room = rooms.get(roomId);
    
    // Check if any existing users have the same username and remove them
    for (const [existingUserId, existingUser] of room.users.entries()) {
      if (existingUser.username === username) {
        console.log(`Removing duplicated user ${username} from room ${roomId}`);
        room.users.delete(existingUserId);
      }
    }
    
    room.users.set(userId, { username, userId });
    
    // Add system message
    const messageId = Date.now().toString();
    const newMessage = {
      id: messageId,
      user: 'System',
      text: `${username} joined the room`,
      timestamp: new Date()
    };
    
    if (!room.messages) {
      room.messages = [];
    }
    
    room.messages.push(newMessage);
    
    // Broadcast user joined message via Socket.IO
    io.to(roomId).emit('user_joined', newMessage);
    
    return res.json({ 
      success: true, 
      userId,
      room: {
        users: Array.from(room.users.values()),
        videoState: room.videoState,
        messages: room.messages
      }
    });
  } catch (error) {
    console.error('Error joining room:', error);
    return res.status(500).json({ error: 'Failed to join room' });
  }
});

// Leave a room
app.post('/api/room/leave', (req, res) => {
  try {
    const { roomId, userId } = req.body;
    
    if (!roomId) {
      return res.status(400).json({ error: 'roomId is required' });
    }
    
    if (!rooms.has(roomId)) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = rooms.get(roomId);
    
    // Handle case where userId isn't provided but we want to clean up by username
    let user = null;
    if (userId && room.users.has(userId)) {
      // Direct match by userId
      user = room.users.get(userId);
      room.users.delete(userId);
    } else if (req.body.username) {
      // Try to find by username if userId doesn't match
      for (const [existingUserId, existingUser] of room.users.entries()) {
        if (existingUser.username === req.body.username) {
          user = existingUser;
          room.users.delete(existingUserId);
          break;
        }
      }
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found in room' });
    }
    
    // Add system message
    const messageId = Date.now().toString();
    const newMessage = {
      id: messageId,
      user: 'System',
      text: `${user.username} left the room`,
      timestamp: new Date()
    };
    
    if (!room.messages) {
      room.messages = [];
    }
    
    room.messages.push(newMessage);
    
    // Broadcast user left message via Socket.IO
    io.to(roomId).emit('user_left', newMessage);
    
    // Clean up empty rooms
    if (room.users.size === 0) {
      rooms.delete(roomId);
      return res.json({ success: true, roomDeleted: true });
    }
    
    return res.json({ success: true, roomDeleted: false });
  } catch (error) {
    console.error('Error leaving room:', error);
    return res.status(500).json({ error: 'Failed to leave room' });
  }
});

// Update video state
app.post('/api/room/video-state', (req, res) => {
  try {
    const { roomId, currentTime, isPlaying } = req.body;
    
    if (!roomId || currentTime === undefined || isPlaying === undefined) {
      return res.status(400).json({ error: 'roomId, currentTime, and isPlaying are required' });
    }
    
    if (!rooms.has(roomId)) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = rooms.get(roomId);
    
    // Update room's video state
    room.videoState = { currentTime, isPlaying };
    
    // Broadcast to everyone via Socket.IO
    io.to(roomId).emit('video_state_update', {
      currentTime,
      isPlaying
    });
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating video state:', error);
    return res.status(500).json({ error: 'Failed to update video state' });
  }
});

// Send chat message
app.post('/api/room/chat', (req, res) => {
  try {
    const { roomId, text, user } = req.body;
    
    if (!roomId || !text || !user) {
      return res.status(400).json({ error: 'roomId, text, and user are required' });
    }
    
    if (!rooms.has(roomId)) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = rooms.get(roomId);
    
    // Add message
    const messageId = Date.now().toString();
    const newMessage = {
      id: messageId,
      user,
      text,
      timestamp: new Date()
    };
    
    if (!room.messages) {
      room.messages = [];
    }
    
    room.messages.push(newMessage);
    
    // Broadcast to everyone via Socket.IO
    io.to(roomId).emit('chat_message', newMessage);
    
    return res.json({ success: true, messageId });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return res.status(500).json({ error: 'Failed to send chat message' });
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Track which rooms this socket is in
  const userRooms = new Set();
  
  // Debug socket events
  socket.onAny((event, ...args) => {
    console.log(`[SOCKET EVENT] ${event}`, args);
  });

  // Join a room
  socket.on('join_room', ({ roomId, username }) => {
    console.log(`${username} (${socket.id}) joining room ${roomId}`);
    
    // Leave any previous instances of this room first
    if (userRooms.has(roomId)) {
      console.log(`${username} was already in room ${roomId}, cleaning up...`);
      leaveRoomCleanup(socket, roomId, username);
    }
    
    // Join the room
    socket.join(roomId);
    userRooms.add(roomId);
    
    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),
        videoState: {
          currentTime: 0,
          isPlaying: false
        },
        messages: []
      });
    }
    
    // Add user to room
    const room = rooms.get(roomId);
    room.users.set(socket.id, { username, socketId: socket.id });
    
    // Broadcast user joined message
    io.to(roomId).emit('user_joined', {
      user: username,
      timestamp: new Date(),
      id: Date.now().toString(),
      text: `${username} joined the room`
    });
    
    // Send current users to the new user
    socket.emit('room_users', {
      users: Array.from(room.users.values()),
      videoState: room.videoState,
      messages: room.messages || []
    });
    
    console.log(`${username} joined room ${roomId}`);
  });
  
  // Helper function to clean up when a user leaves a room
  function leaveRoomCleanup(socket, roomId, username) {
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    let user = room.users.get(socket.id);
    
    // If we don't find the user by socket ID but have a username, try to find by username
    if (!user && username) {
      for (const [userId, userObj] of room.users.entries()) {
        if (userObj.username === username) {
          user = userObj;
          room.users.delete(userId);
          break;
        }
      }
    }
    
    if (user) {
      // Remove user from room if not already removed
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
      }
      
      // Broadcast user left message
      io.to(roomId).emit('user_left', {
        user: user.username,
        timestamp: new Date(),
        id: Date.now().toString(),
        text: `${user.username} left the room`
      });
      
      console.log(`${user.username} left room ${roomId}`);
      
      // Clean up empty rooms
      if (room.users.size === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
      }
    }
    
    socket.leave(roomId);
    userRooms.delete(roomId);
  }
  
  // Leave room
  socket.on('leave_room', ({ roomId, username }) => {
    leaveRoomCleanup(socket, roomId, username);
  });
  
  // Video state update
  socket.on('video_state_update', ({ currentTime, isPlaying, roomId }) => {
    if (!rooms.has(roomId)) return;
    
    const room = rooms.get(roomId);
    const user = room.users.get(socket.id);
    
    if (!user) return;
    
    // Update room's video state
    room.videoState = { currentTime, isPlaying };
    
    // Broadcast to everyone except sender
    socket.to(roomId).emit('video_state_update', {
      currentTime,
      isPlaying,
      userId: socket.id,
      username: user.username
    });
  });
  
  // Chat message
  socket.on('chat_message', ({ text, roomId, user, timestamp }) => {
    if (!rooms.has(roomId)) return;
    
    // Generate a unique message ID that will be consistent 
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messageId = uniqueId;
    
    // Add message to room's message history
    const room = rooms.get(roomId);
    if (!room.messages) {
      room.messages = [];
    }
    
    // Check if this exact message appears to be a duplicate
    // (same text from same user within last 2 seconds)
    const now = new Date();
    const recentDuplicates = room.messages.filter(msg => 
      msg.user === user && 
      msg.text === text && 
      (now.getTime() - new Date(msg.timestamp).getTime()) < 2000 // within 2 seconds
    );
    
    // If this appears to be a duplicate, don't process it
    if (recentDuplicates.length > 0) {
      console.log(`Detected duplicate message from ${user}: "${text}"`);
      return;
    }
    
    const newMessage = {
      id: messageId,
      user,
      text,
      timestamp: timestamp || new Date()
    };
    
    room.messages.push(newMessage);
    
    // Broadcast to everyone including sender
    io.to(roomId).emit('chat_message', newMessage);
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find which rooms the user was in and clean up
    userRooms.forEach(roomId => {
      // Find username for this socket in this room
      let username = undefined;
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const user = room.users.get(socket.id);
        if (user) {
          username = user.username;
        }
      }
      
      leaveRoomCleanup(socket, roomId, username);
    });
    
    // Legacy cleanup for older connections
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        const user = room.users.get(socket.id);
        leaveRoomCleanup(socket, roomId, user?.username);
      }
    });
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 