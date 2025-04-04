import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import app from './firebase';
import { io, Socket } from 'socket.io-client';

// Video state interface
export interface VideoState {
  currentTime: number;
  isPlaying: boolean;
  roomId: string;
}

// Chat message interface
export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

// User presence interface
export interface UserPresence {
  id: string;
  username: string;
  isOnline: boolean;
}

// Initialize Firebase database
const database = getDatabase(app);

// Server URL from environment variables
const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface SocketContextType {
  isConnected: boolean;
  roomId: string | null;
  joinRoom: (roomId: string, username: string) => void;
  leaveRoom: () => void;
  sendVideoState: (videoState: Omit<VideoState, 'roomId'>) => void;
  sendChatMessage: (message: string) => void;
  username: string;
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    // Create socket connection
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      // Fallback to HTTP when socket fails
    });

    setSocket(newSocket);

    return () => {
      // Make sure to leave any rooms and clean up before disconnecting
      if (roomId) {
        newSocket.emit('leave_room', { roomId });
      }
      newSocket.disconnect();
    };
  }, []);

  // Subscribe to room changes when roomId changes
  useEffect(() => {
    if (!roomId) {
      setIsConnected(false);
      return;
    }

    setIsConnected(true);
    
    // Set up listener for room changes in Firebase Realtime Database
    const roomRef = ref(database, `rooms/${roomId}`);
    onValue(roomRef, (snapshot) => {
      const roomData = snapshot.val();
      if (!roomData) {
        // Room might have been deleted
        setIsConnected(false);
        setRoomId(null);
        return;
      }
      
      // Room exists, we're connected
      setIsConnected(true);
    });

    // Join room via socket if available
    if (socket && socket.connected) {
      socket.emit('join_room', { roomId, username });
    }

    // Clean up listener
    return () => {
      off(roomRef);
      // Leave room via socket if available
      if (socket && socket.connected && roomId) {
        socket.emit('leave_room', { roomId });
      }
    };
  }, [roomId, username, socket]);

  const joinRoom = async (newRoomId: string, newUsername: string) => {
    try {
      setRoomId(newRoomId);
      setUsername(newUsername);
      
      // Try REST API first
      const endpoint = `${serverUrl}/api/room/join`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          roomId: newRoomId,
          username: newUsername
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to join room');
      }
      
      const result = await response.json();
      
      // Store the userId from the server
      if (result.userId) {
        setUserId(result.userId);
      }
      
      // Also try to join via socket if available
      if (socket && socket.connected) {
        socket.emit('join_room', { roomId: newRoomId, username: newUsername });
      }
      
      setIsConnected(true);
      console.log('Joined room:', result);
    } catch (error) {
      console.error('Error joining room:', error);
      // Try socket-only approach as fallback
      if (socket && socket.connected) {
        socket.emit('join_room', { roomId: newRoomId, username: newUsername });
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    }
  };

  const leaveRoom = async () => {
    if (roomId) {
      try {
        // Call local server to leave room with correct endpoint
        const endpoint = `${serverUrl}/api/room/leave`;
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            roomId,
            userId: userId || undefined,
            username: username  // Always include the username for better identification
          })
        });
        
        // Also try to leave via socket if available
        if (socket && socket.connected) {
          socket.emit('leave_room', { roomId, username });
        }
        
        setRoomId(null);
        setUserId(null);
        setIsConnected(false);
      } catch (error) {
        console.error('Error leaving room:', error);
        // Try socket-only approach as fallback
        if (socket && socket.connected) {
          socket.emit('leave_room', { roomId, username });
          setRoomId(null);
          setUserId(null);
          setIsConnected(false);
        }
      }
    }
  };

  const sendVideoState = async (videoState: Omit<VideoState, 'roomId'>) => {
    if (roomId) {
      try {
        // Call local server to update video state with correct endpoint
        const endpoint = `${serverUrl}/api/room/video-state`;
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            roomId,
            ...videoState
          })
        });
        
        // Also try to update via socket if available
        if (socket && socket.connected) {
          socket.emit('video_state_update', {
            roomId,
            ...videoState
          });
        }
      } catch (error) {
        console.error('Error updating video state:', error);
        // Try socket-only approach as fallback
        if (socket && socket.connected) {
          socket.emit('video_state_update', {
            roomId,
            ...videoState
          });
        }
      }
    }
  };

  const sendChatMessage = async (message: string) => {
    if (roomId && username) {
      try {
        // If socket is connected, prefer it over HTTP
        if (socket && socket.connected) {
          socket.emit('chat_message', {
            roomId,
            text: message,
            user: username,
            timestamp: new Date()
          });
        } else {
          // Fallback to HTTP API only if socket not available
          const endpoint = `${serverUrl}/api/room/chat`;
          await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              roomId,
              text: message,
              user: username
            })
          });
        }
      } catch (error) {
        console.error('Error sending chat message:', error);
        // Try socket as fallback if HTTP failed
        if (socket && socket.connected) {
          socket.emit('chat_message', {
            roomId,
            text: message,
            user: username,
            timestamp: new Date()
          });
        }
      }
    }
  };

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        roomId,
        joinRoom,
        leaveRoom,
        sendVideoState,
        sendChatMessage,
        username,
        socket,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}; 