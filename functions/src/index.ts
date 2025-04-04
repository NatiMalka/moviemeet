/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { AccessToken } from 'livekit-server-sdk';

// Initialize Firebase Admin
admin.initializeApp();

const app = express();

// Configure Express
app.use(cors({ 
  origin: ['http://localhost:5173', 'https://movie-meet-1a81b.web.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));
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
    
    // Get LiveKit credentials from environment config
    const config = functions.config();
    const apiKey = config.livekit?.api_key;
    const apiSecret = config.livekit?.api_secret;
    
    if (!apiKey || !apiSecret) {
      console.log('LiveKit credentials not configured');
      return res.status(500).json({ 
        error: 'LiveKit API credentials not configured',
        message: 'Server not configured with LiveKit credentials.'
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
    return res.json({ token });
  } catch (error: any) {
    console.error('Error generating token:', error);
    return res.status(500).json({ 
      error: 'Failed to generate token',
      message: error.message 
    });
  }
});

// Archive.org proxy routes
// Proxy route for Archive.org thumbnails
app.get('/api/archive/thumbnail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format to prevent potential security issues
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid Archive.org ID format' });
    }
    
    // Proxy the request to Archive.org
    const response = await axios.get(`https://archive.org/services/img/${id}`, {
      responseType: 'stream'
    });
    
    // Forward the response headers and data
    response.headers['access-control-allow-origin'] = '*';
    res.set(response.headers);
    return response.data.pipe(res);
  } catch (error: any) {
    console.error('Error fetching Archive.org thumbnail:', error);
    return res.status(500).json({ error: 'Failed to fetch thumbnail' });
  }
});

// Proxy route to validate if an Archive.org ID exists
app.get('/api/archive/validate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
      return res.status(400).json({ error: 'Invalid Archive.org ID format' });
    }
    
    // Check if the ID exists by checking its metadata
    const response = await axios.get(`https://archive.org/metadata/${id}`);
    
    if (response.status === 200 && response.data && response.data.metadata) {
      return res.json({ 
        valid: true,
        metadata: {
          title: response.data.metadata.title,
          description: response.data.metadata.description,
          year: response.data.metadata.year
        }
      });
    } else {
      return res.json({ valid: false });
    }
  } catch (error: any) {
    // If the request fails, the ID probably doesn't exist
    return res.json({ valid: false, error: error.message });
  }
});

// Create an HTTP function for the Express app
export const api = functions.https.onRequest((req, res) => {
  // Set CORS headers for all responses
  res.set('Access-Control-Allow-Origin', 'https://movie-meet-1a81b.web.app');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  return app(req, res);
});

// For Firebase Realtime Database implementation to replace Socket.IO functionality

// Map to store room data
const roomsRef = admin.database().ref('rooms');

// Function to handle room updates
export const handleRoomJoin = functions.https.onCall(
  async (data: Record<string, any>, context: any) => {
    const { roomId, username } = data;
    
    if (!roomId || !username) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'roomId and username are required'
      );
    }
    
    // Get current room or create a new one
    const roomSnapshot = await roomsRef.child(roomId).once('value');
    const room = roomSnapshot.exists() ? roomSnapshot.val() : { 
      users: {},
      videoState: {
        currentTime: 0,
        isPlaying: false
      },
      messages: []
    };
    
    // Add user to room
    // Using a default anonymous ID if auth is not available
    const userId = (context && context.auth && context.auth.uid) || `anonymous-${Date.now()}`;
    room.users[userId] = { username, userId, joinedAt: Date.now() };
    
    // Add system message
    const messageId = Date.now().toString();
    const newMessage = {
      id: messageId,
      user: 'System',
      text: `${username} joined the room`,
      timestamp: Date.now()
    };
    
    if (!room.messages) {
      room.messages = [];
    }
    
    room.messages.push(newMessage);
    
    // Update room in database
    await roomsRef.child(roomId).set(room);
    
    return { success: true, room };
  }
);

// Handle leaving a room
export const handleRoomLeave = functions.https.onCall(
  async (data: Record<string, any>, context: any) => {
    const { roomId } = data;
    
    if (!roomId) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'roomId is required'
      );
    }
    
    // Using a default or provided userId if auth is not available
    const userId = (context && context.auth && context.auth.uid) || data.userId;
    if (!userId) {
      throw new functions.https.HttpsError(
        'unauthenticated', 
        'User must be authenticated or provide userId'
      );
    }
    
    // Get room
    const roomSnapshot = await roomsRef.child(roomId).once('value');
    if (!roomSnapshot.exists()) {
      throw new functions.https.HttpsError('not-found', 'Room not found');
    }
    
    const room = roomSnapshot.val();
    
    // Get user
    if (!room.users || !room.users[userId]) {
      throw new functions.https.HttpsError('not-found', 'User not in room');
    }
    
    const user = room.users[userId];
    
    // Remove user from room
    delete room.users[userId];
    
    // Add system message
    const messageId = Date.now().toString();
    const newMessage = {
      id: messageId,
      user: 'System',
      text: `${user.username} left the room`,
      timestamp: Date.now()
    };
    
    if (!room.messages) {
      room.messages = [];
    }
    
    room.messages.push(newMessage);
    
    // If room is empty, delete it
    if (Object.keys(room.users).length === 0) {
      await roomsRef.child(roomId).remove();
      return { success: true, roomDeleted: true };
    } else {
      // Otherwise update room
      await roomsRef.child(roomId).set(room);
      return { success: true, roomDeleted: false };
    }
  }
);

// Handle chat messages
export const sendChatMessage = functions.https.onCall(
  async (data: Record<string, any>, context: any) => {
    const { roomId, text, user } = data;
    
    if (!roomId || !text || !user) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'roomId, text, and user are required'
      );
    }
    
    // Get room
    const roomSnapshot = await roomsRef.child(roomId).once('value');
    if (!roomSnapshot.exists()) {
      throw new functions.https.HttpsError('not-found', 'Room not found');
    }
    
    const room = roomSnapshot.val();
    
    // Add message
    const messageId = Date.now().toString();
    const newMessage = {
      id: messageId,
      user,
      text,
      timestamp: Date.now()
    };
    
    if (!room.messages) {
      room.messages = [];
    }
    
    room.messages.push(newMessage);
    
    // Update room
    await roomsRef.child(roomId).set(room);
    
    return { success: true, messageId };
  }
);

// Update video state
export const updateVideoState = functions.https.onCall(
  async (data: Record<string, any>, context: any) => {
    const { roomId, currentTime, isPlaying } = data;
    
    if (!roomId || currentTime === undefined || isPlaying === undefined) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'roomId, currentTime, and isPlaying are required'
      );
    }
    
    // Get room
    const roomSnapshot = await roomsRef.child(roomId).once('value');
    if (!roomSnapshot.exists()) {
      throw new functions.https.HttpsError('not-found', 'Room not found');
    }
    
    const room = roomSnapshot.val();
    
    // Update video state
    room.videoState = { currentTime, isPlaying };
    
    // Update room
    await roomsRef.child(roomId).set(room);
    
    return { success: true };
  }
);
