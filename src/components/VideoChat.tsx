import React, { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  useRoomContext,
  useLocalParticipant,
  ParticipantTile,
  GridLayout,
  PreJoin
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { useSocket } from '../lib/socketContext';

// Custom stylesheet to override LiveKit styles and hide their control bars
const customStyles = `
  /* Hide all built-in control bars */
  .lk-video-conference {
    --lk-control-bar-display: none !important;
  }
  
  /* Hide all buttons on participant tiles */
  .lk-participant-tile .lk-button-group,
  .lk-participant-tile button,
  .lk-participant-media button {
    display: none !important;
  }
  
  /* Hide any native controls */
  .lk-control-bar:not(.custom-control-bar),
  .lk-button-group:not(.custom-control-bar *) {
    display: none !important;
  }
  
  /* Proper spacing for our layout */
  .lk-grid-layout {
    padding-bottom: 60px !important;
  }

  /* Custom styling for PreJoin component */
  .lk-prejoin {
    --lk-prejoin-background: rgba(17, 24, 39, 0.7) !important;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  
  .lk-prejoin-container {
    padding: 0 !important;
  }
  
  .lk-button-primary {
    background-color: #3b82f6 !important;
    transition: background-color 0.2s;
  }
  
  .lk-button-primary:hover {
    background-color: #2563eb !important;
  }

  /* More spacious video grid */
  .lk-participant-tile {
    border-radius: 8px;
    overflow: hidden;
  }
`;

// Custom video conference component without built-in controls
function CustomVideoGrid() {
  // Get video tracks for all participants
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  // Adjust columns based on number of participants
  const participantCount = tracks.length;
  let gridClass = "grid-cols-1"; // Default to 1 column for best size

  // Only use more columns if we have more participants
  if (participantCount > 1) {
    gridClass = "grid-cols-1 md:grid-cols-2"; // Max 2 columns for better size
  }

  return (
    <div className="w-full h-full">
      <div className={`grid ${gridClass} gap-2 sm:gap-3 p-2 sm:p-4 h-full`}>
        {tracks.map((track) => (
          <div key={track.participant.identity + (track.publication?.trackSid || 'placeholder')} 
               className="w-full h-full bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center shadow-lg"
               style={{ minHeight: '120px' }}
          >
            <ParticipantTile 
              participant={track.participant}
              source={track.source}
              publication={track.publication}
              className="w-full h-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Custom controls that use the proper LiveKit hooks
function CustomControls({ onToggleSize, isLarge }: { onToggleSize: () => void, isLarge: boolean }) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  
  const toggleCamera = () => {
    if (localParticipant) {
      const enabled = localParticipant.isCameraEnabled;
      localParticipant.setCameraEnabled(!enabled);
    }
  };
  
  const toggleMicrophone = () => {
    if (localParticipant) {
      const enabled = localParticipant.isMicrophoneEnabled;
      localParticipant.setMicrophoneEnabled(!enabled);
    }
  };
  
  const toggleScreenShare = () => {
    if (localParticipant) {
      const enabled = localParticipant.isScreenShareEnabled;
      localParticipant.setScreenShareEnabled(!enabled);
    }
  };
  
  const isCameraEnabled = localParticipant?.isCameraEnabled || false;
  const isMicEnabled = localParticipant?.isMicrophoneEnabled || false;
  const isScreenShareEnabled = localParticipant?.isScreenShareEnabled || false;
  
  // More compact version of controls for integrated view
  return (
    <div className="flex justify-between items-center w-full px-2">
      <div className="flex items-center gap-1 sm:gap-2">
        <button 
          onClick={toggleCamera}
          className={`p-1.5 sm:p-2 ${isCameraEnabled ? 'bg-gray-800 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'} rounded-full text-white transition-colors`}
          title={isCameraEnabled ? "Turn off camera" : "Turn on camera"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-4 sm:h-4">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </button>
        
        <button 
          onClick={toggleMicrophone}
          className={`p-1.5 sm:p-2 ${isMicEnabled ? 'bg-gray-800 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'} rounded-full text-white transition-colors`}
          title={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-4 sm:h-4">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="bg-gray-800 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full flex items-center text-gray-300 text-xs">
          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          {participants.length}
        </div>
        
        <button 
          onClick={toggleScreenShare}
          className={`p-1.5 sm:p-2 ${isScreenShareEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'} rounded-full text-white transition-colors`}
          title={isScreenShareEnabled ? "Stop screen sharing" : "Share screen"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-4 sm:h-4">
            <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"></path>
            <path d="M8 21h8"></path>
            <path d="M12 17v4"></path>
            <path d="M22 3l-5 5"></path>
            <path d="M17 3h5v5"></path>
          </svg>
        </button>
        
        {/* Resize button */}
        <button 
          onClick={onToggleSize}
          className="p-1.5 sm:p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors"
          title={isLarge ? "Shrink camera window" : "Expand camera window"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-4 sm:h-4">
            {isLarge ? (
              // Minimize icon
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            ) : (
              // Maximize icon
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}

interface VideoChatProps {
  token?: string;
  movieTitle?: string;
}

export function VideoChat({ token: providedToken, movieTitle }: VideoChatProps) {
  const [token, setToken] = useState<string | undefined | null>(providedToken);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [mediaSettings, setMediaSettings] = useState({
    videoEnabled: true,
    audioEnabled: true
  });
  const [step, setStep] = useState<'select' | 'configure' | 'chat'>('select');
  const [isLargeSize, setIsLargeSize] = useState(false);
  const { roomId, username } = useSocket();
  
  // Using LiveKit's demo server for testing
  const serverUrl = import.meta.env.VITE_LIVEKIT_URL || "wss://demo.livekit.cloud";
  
  const generateToken = async (username: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const roomName = roomId || 'movie-meet-test';
      const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
      
      // Fix URL construction - use proper endpoint
      const endpoint = `${serverUrl}/generate-token`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          roomId: roomName,
          username
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Token generation failed: ${data.error || response.statusText}`);
      }
      
      return data.token;
    } catch (e) {
      console.error('Error generating token:', e);
      setError(e instanceof Error ? e.message : 'Failed to connect to video chat');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (formUsername: string) => {
    const newToken = await generateToken(formUsername);
    if (newToken) {
      setToken(newToken);
      setIsConnected(true);
      setIsConfiguring(false);
      setStep('chat');
    }
  };

  // Use the username from socket context if available
  useEffect(() => {
    if (username && roomId && !isConnected && !isLoading && !isConfiguring) {
      handleJoin(username);
    }
  }, [username, roomId, isConnected, isLoading, isConfiguring]);

  const toggleSize = () => {
    setIsLargeSize(!isLargeSize);
  };

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-red-500/20 backdrop-blur-sm border border-red-500 p-6 rounded-xl max-w-md shadow-xl">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/30 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h3 className="text-red-400 text-xl font-medium mb-2">Connection Error</h3>
          <p className="text-gray-300 text-sm mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setStep('select');
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm transition-colors w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          <div className="text-gray-300">Connecting to video chat...</div>
        </div>
      </div>
    );
  }

  // Step 1: Room Selection
  if (step === 'select') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-2">Join Movie Room</h2>
          <p className="text-gray-300 mb-6">
            {movieTitle ? `Get ready to watch "${movieTitle}" together!` : 'Join a room to watch and discuss movies together.'}
          </p>
          
          <div className="bg-gray-800/50 p-4 rounded-lg mb-6 flex items-center">
            <div className="bg-blue-600/20 rounded-full p-3 mr-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-400">Room ID</div>
              <div className="text-white font-medium">{roomId || 'Default Room'}</div>
            </div>
          </div>
          
          <button 
            onClick={() => setStep('configure')} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
          >
            Set Up Video & Audio
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Configuration step
  if (step === 'configure') {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-gray-900/90 backdrop-blur-sm p-3 sm:p-4 border-b border-gray-800 mb-2 sm:mb-4 flex justify-between items-center">
          <div>
            <button 
              onClick={() => setStep('select')}
              className="text-gray-400 hover:text-white transition-colors flex items-center"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Back
            </button>
          </div>
          
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-semibold text-white">Configure Devices</h2>
            <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Set up your camera and microphone</p>
          </div>
          
          <div className="w-12 sm:w-16"></div> {/* Empty div for flex alignment */}
        </div>
        
        <div className="flex-1">
          {/* The PreJoin component from LiveKit handles everything */}
          <PreJoin
            onSubmit={(values) => {
              // Update settings when submitted via LiveKit's Join Room button
              setMediaSettings({
                videoEnabled: values.videoEnabled || false,
                audioEnabled: values.audioEnabled || false
              });
              
              // When the user clicks LiveKit's Join Room button, join the room
              if (username) {
                handleJoin(username);
              }
            }}
            defaults={{
              username: username || '',
              videoEnabled: mediaSettings.videoEnabled,
              audioEnabled: mediaSettings.audioEnabled,
            }}
          />
        </div>
        
        <div className="bg-gray-900/90 backdrop-blur-sm py-2 sm:py-3 px-3 sm:px-4 flex justify-between items-center border-t border-gray-800">
          <div className="text-xs sm:text-sm text-gray-400">
            {movieTitle && (
              <span className="flex items-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path>
                </svg>
                <span className="hidden xs:inline">Watching:</span> <span className="text-white ml-1 truncate max-w-[120px] sm:max-w-none">{movieTitle}</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className={mediaSettings.videoEnabled ? "text-green-400 text-xs sm:text-sm" : "text-red-400 text-xs sm:text-sm"}>
              <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 align-middle" 
                    style={{backgroundColor: mediaSettings.videoEnabled ? 'rgb(74, 222, 128)' : 'rgb(248, 113, 113)'}}></span>
              Camera
            </span>
            <span className={mediaSettings.audioEnabled ? "text-green-400 text-xs sm:text-sm" : "text-red-400 text-xs sm:text-sm"}>
              <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 align-middle"
                    style={{backgroundColor: mediaSettings.audioEnabled ? 'rgb(74, 222, 128)' : 'rgb(248, 113, 113)'}}></span>
              Mic
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Video chat
  return (
    <>
      {/* Add custom styles to override LiveKit's built-in controls */}
      <style>{customStyles}</style>
      
      {/* Fixed position video chat when in large mode */}
      <div className={isLargeSize ? "fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4" : ""}>
        <div className={isLargeSize ? "w-full max-w-5xl h-[85vh] bg-gray-900 rounded-lg overflow-hidden shadow-2xl relative" : "h-full relative"}>
          {isLargeSize && (
            <div className="absolute top-0 right-0 p-1 sm:p-2 z-20">
              <button 
                onClick={toggleSize}
                className="bg-gray-800/80 hover:bg-gray-700 text-white p-1.5 sm:p-2 rounded-full"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          )}
          
          <LiveKitRoom
            token={token || undefined}
            serverUrl={serverUrl}
            connect={true}
            className="h-full relative"
            audio={mediaSettings.audioEnabled}
            video={mediaSettings.videoEnabled}
            data-lk-theme="default"
            onDisconnected={() => {
              setIsConnected(false);
              setStep('select');
            }}
            onError={(error) => {
              console.error("LiveKit connection error:", error);
              setError(`Failed to connect: ${error.message}`);
              setIsConnected(false);
              setStep('select');
            }}
          >
            {/* For compact integrated view, only show minimal UI */}
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <CustomVideoGrid />
              </div>
            </div>
            
            {/* Compact controls at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm py-1 z-20">
              <CustomControls onToggleSize={toggleSize} isLarge={isLargeSize} />
            </div>
            
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      </div>
    </>
  );
}