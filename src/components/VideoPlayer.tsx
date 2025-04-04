import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSocket } from '../lib/socketContext';

interface VideoPlayerProps {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export function VideoPlayer({ src, onTimeUpdate, onPlay, onPause }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const { socket, sendVideoState, roomId } = useSocket();
  const [isSeeking, setIsSeeking] = useState(false);
  const [isExternalUpdate, setIsExternalUpdate] = useState(false);
  
  // Listen for video state updates from the server
  useEffect(() => {
    if (!socket) return;
    
    const handleVideoStateUpdate = ({ currentTime, isPlaying, username }: { 
      currentTime: number, 
      isPlaying: boolean,
      username: string 
    }) => {
      console.log(`Video state update from ${username}: ${isPlaying ? 'playing' : 'paused'} at ${currentTime.toFixed(2)}`);
      
      if (!videoRef.current) return;
      
      // Mark this as an external update to prevent sending it back
      setIsExternalUpdate(true);
      
      // Update the video time if it's out of sync by more than 1 second
      const timeDiff = Math.abs(videoRef.current.currentTime - currentTime);
      if (timeDiff > 1) {
        videoRef.current.currentTime = currentTime;
      }
      
      // Update play state
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(e => console.error('Error playing video:', e));
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      
      setIsPlaying(isPlaying);
    };
    
    socket.on('video_state_update', handleVideoStateUpdate);
    
    // Also listen for initial room state when joining
    socket.on('room_users', ({ videoState }: { videoState: { currentTime: number; isPlaying: boolean } }) => {
      if (videoState && videoRef.current) {
        videoRef.current.currentTime = videoState.currentTime;
        setIsPlaying(videoState.isPlaying);
        
        if (videoState.isPlaying) {
          videoRef.current.play().catch(e => console.error('Error playing video:', e));
        }
      }
    });
    
    return () => {
      socket.off('video_state_update');
      socket.off('room_users');
    };
  }, [socket]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        onPause?.();
      } else {
        videoRef.current.play().catch(e => console.error('Error playing video:', e));
        onPlay?.();
      }
      
      setIsPlaying(!isPlaying);
      
      // Send update to server if in a room and not reacting to an external update
      if (roomId && !isExternalUpdate) {
        sendVideoState({
          currentTime: videoRef.current.currentTime,
          isPlaying: !isPlaying
        });
      }
      
      // Reset the external update flag
      setIsExternalUpdate(false);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
      onTimeUpdate?.(videoRef.current.currentTime);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clickedValue = (x / rect.width) * videoRef.current.duration;
      videoRef.current.currentTime = clickedValue;
      
      // Send update to server if in a room
      if (roomId) {
        sendVideoState({
          currentTime: clickedValue,
          isPlaying
        });
      }
    }
  };
  
  const handleSeekStart = () => {
    setIsSeeking(true);
  };
  
  const handleSeekEnd = () => {
    if (isSeeking && videoRef.current && roomId) {
      sendVideoState({
        currentTime: videoRef.current.currentTime,
        isPlaying
      });
    }
    setIsSeeking(false);
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="relative group w-full aspect-video bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => {
          if (!isExternalUpdate) {
            setIsPlaying(true);
            if (roomId && videoRef.current) {
              sendVideoState({
                currentTime: videoRef.current.currentTime,
                isPlaying: true
              });
            }
          }
          setIsExternalUpdate(false);
        }}
        onPause={() => {
          if (!isExternalUpdate) {
            setIsPlaying(false);
            if (roomId && videoRef.current && !isSeeking) {
              sendVideoState({
                currentTime: videoRef.current.currentTime,
                isPlaying: false
              });
            }
          }
          setIsExternalUpdate(false);
        }}
        onSeeking={handleSeekStart}
        onSeeked={handleSeekEnd}
      />
      
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div 
          className="w-full h-1 bg-gray-600 rounded-full mb-4 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-red-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className={cn(
                "p-2 rounded-full hover:bg-white/20 transition",
                "text-white"
              )}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <button
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-white/20 transition text-white"
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-white/20 transition text-white"
          >
            <Maximize2 size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}