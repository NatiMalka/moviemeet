import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link as RouterLink, useNavigate } from 'react-router-dom';
import { VideoPlayer } from './components/VideoPlayer';
import { Chat } from './components/Chat';
import { VideoChat } from './components/VideoChat';
import { MovieRoom } from './components/MovieRoom';
import { AdminMovieManager } from './components/AdminMovieManager';
import { HomePage } from './components/HomePage';
import { Users, MessageSquare, Video, Link, Maximize2, Minimize2, X, Film, Settings } from 'lucide-react';
import { cn } from './lib/utils';
import { SocketProvider, useSocket } from './lib/socketContext';
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingAnimation } from './components/LoadingAnimation';

// Temporary sample video URL
const SAMPLE_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

// Room joining dialog component
function RoomJoinDialog({ onJoin }: { onJoin: (roomId: string, username: string) => void }) {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim() && username.trim()) {
      onJoin(roomId, username);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Join Movie Room</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Your Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Room ID</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID or create new"
              className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}

// Floating Chat Window Component
interface FloatingChatWindowProps {
  messages: Array<{
    id: string;
    user: string;
    text: string;
    timestamp: Date;
  }>;
  onSendMessage: (text: string) => void;
  onClose: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function FloatingChatWindow({ 
  messages, 
  onSendMessage, 
  onClose, 
  isExpanded, 
  onToggleExpand 
}: FloatingChatWindowProps) {
  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 bg-gray-900 rounded-lg overflow-hidden flex flex-col shadow-2xl border border-gray-800 transition-all duration-300 z-40",
        isExpanded ? "w-96 h-[520px]" : "w-80 h-[420px]"
      )}
    >
      <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <MessageSquare size={18} className="text-blue-400 mr-2" />
          <span className="font-medium">Chat</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onToggleExpand}
            className="p-1 hover:bg-gray-700 rounded-full"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Chat messages={messages} onSendMessage={onSendMessage} />
      </div>
    </div>
  );
}

// Main app content
function AppContent() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      user: 'System',
      text: 'Welcome to MovieMeet! Join a room to watch together.',
      timestamp: new Date(),
    },
  ]);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [videoChatExpanded, setVideoChatExpanded] = useState(false);
  const [chatWindowMode, setChatWindowMode] = useState<'integrated' | 'floating'>('integrated');
  const [isFloatingChatExpanded, setIsFloatingChatExpanded] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const { joinRoom, roomId, username, leaveRoom } = useSocket();
  const navigate = useNavigate();

  // Listen for custom event to open join dialog
  useEffect(() => {
    const handleOpenJoinDialog = () => {
      setShowJoinDialog(true);
    };
    
    document.addEventListener('openJoinRoomDialog', handleOpenJoinDialog);
    
    return () => {
      document.removeEventListener('openJoinRoomDialog', handleOpenJoinDialog);
    };
  }, []);

  const handleSendMessage = (text: string) => {
    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        user: username || 'You',
        text,
        timestamp: new Date(),
      },
    ]);
  };

  const handleJoinRoom = (newRoomId: string, newUsername: string) => {
    joinRoom(newRoomId, newUsername);
    setShowJoinDialog(false);
    navigate(`/room/${newRoomId}`);
  };

  const toggleVideoChatSize = () => {
    setVideoChatExpanded(!videoChatExpanded);
  };

  const toggleChatWindowMode = () => {
    setChatWindowMode(chatWindowMode === 'integrated' ? 'floating' : 'integrated');
  };

  return (
    <>
      {showLoading && <LoadingAnimation onAnimationComplete={() => setShowLoading(false)} />}
      
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto p-4">
          <header className="mb-6 flex justify-between items-center">
            <RouterLink to="/" className="text-3xl font-bold flex items-center">
              <Film className="mr-2 text-blue-500" />
              MovieMeet
            </RouterLink>
            
            <div className="flex items-center gap-4">
              {roomId ? (
                <>
                  <div className="bg-gray-800 px-3 py-1 rounded-full flex items-center text-sm">
                    <span className="text-gray-400 mr-2">Room:</span>
                    <span className="font-medium">{roomId}</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      leaveRoom();
                      navigate('/');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full text-sm transition"
                  >
                    Leave Room
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowJoinDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 transition"
                  >
                    <Link size={16} />
                    <span>Join Room</span>
                  </button>
                  <RouterLink
                    to="/admin"
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2 transition"
                  >
                    <Settings size={16} />
                    <span>Admin</span>
                  </RouterLink>
                </>
              )}
            </div>
          </header>

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/room/:roomId" element={
              <ErrorBoundary fallback={
                <div className="text-center py-8">
                  <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Room</h2>
                  <p className="text-gray-300 mb-4">There was a problem loading the movie room.</p>
                  <button 
                    onClick={() => navigate('/')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Back to Home
                  </button>
                </div>
              }>
                {username ? (
                  <MovieRoom 
                    roomId={roomId || ''} 
                    userId={username} 
                    username={username} 
                  />
                ) : (
                  <div className="text-center py-8">
                    <h2 className="text-xl font-bold mb-2">Join Room to Continue</h2>
                    <p className="text-gray-300 mb-4">Please join the room to access this page.</p>
                    <button 
                      onClick={() => setShowJoinDialog(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                      Join Room
                    </button>
                  </div>
                )}
              </ErrorBoundary>
            } />
            <Route path="/admin" element={
              <AdminMovieManager />
            } />
          </Routes>
        </div>
        
        {showJoinDialog && <RoomJoinDialog onJoin={handleJoinRoom} />}
        
        {/* Floating chat window when in floating mode */}
        {chatWindowMode === 'floating' && (
          <FloatingChatWindow 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            onClose={toggleChatWindowMode}
            isExpanded={isFloatingChatExpanded}
            onToggleExpand={() => setIsFloatingChatExpanded(!isFloatingChatExpanded)}
          />
        )}
      </div>
    </>
  );
}

// Root App component with SocketProvider and Router
function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;