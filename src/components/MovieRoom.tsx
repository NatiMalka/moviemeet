import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { VideoChat } from './VideoChat';
import { MovieLibrary } from './MovieLibrary';
import { MegaPlayer } from './MegaPlayer';
import { Chat } from './Chat';
import { ArchivePlayer } from './ArchivePlayer';

interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  megaLink?: string;
  archiveId?: string;
  cloudinaryId?: string;
  genre: string;
  year: number;
  duration: string;
  addedOn: any;
}

interface RoomData {
  id: string;
  name: string;
  currentMovie?: string;
  playbackPosition?: number;
  isPlaying?: boolean;
  participants: string[];
  createdAt: any;
  lastUpdated: any;
}

interface MovieRoomProps {
  roomId: string;
  userId: string;
  username: string;
}

export function MovieRoom({ roomId, userId, username }: MovieRoomProps) {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('movie');

  // Join room on component mount
  useEffect(() => {
    const joinRoom = async () => {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const roomDoc = await getDoc(roomRef);

        if (!roomDoc.exists()) {
          // Create the room if it doesn't exist
          await setDoc(roomRef, {
            name: `Movie Room ${roomId}`,
            participants: [userId],
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
        } else {
          // Update participants list
          const roomData = roomDoc.data() as Omit<RoomData, 'id'>;
          if (!roomData.participants.includes(userId)) {
            await updateDoc(roomRef, {
              participants: [...roomData.participants, userId],
              lastUpdated: serverTimestamp()
            });
          }
        }

        // Subscribe to room updates
        const unsubscribe = onSnapshot(roomRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as Omit<RoomData, 'id'>;
            setRoom({
              id: snapshot.id,
              ...data
            });

            // If room has a current movie, fetch its details
            if (data.currentMovie) {
              fetchMovie(data.currentMovie);
            }
          } else {
            setError('Room not found');
          }
          setLoading(false);
        });

        return () => {
          unsubscribe();
          // Leave the room when component unmounts
          leaveRoom();
        };
      } catch (err) {
        console.error('Error joining room:', err);
        setError('Failed to join room');
        setLoading(false);
      }
    };

    joinRoom();
  }, [roomId, userId]);

  // Fetch movie details
  const fetchMovie = async (movieId: string) => {
    try {
      const movieDoc = await getDoc(doc(db, 'movies', movieId));
      if (movieDoc.exists()) {
        const movieData = movieDoc.data() as Omit<Movie, 'id'>;
        setCurrentMovie({
          id: movieDoc.id,
          ...movieData,
          // Ensure we have at least one of these video source fields
          megaLink: movieData.megaLink || '',
          archiveId: movieData.archiveId || '',
          cloudinaryId: movieData.cloudinaryId || '',
        });
      } else {
        console.error('Movie not found');
      }
    } catch (err) {
      console.error('Error fetching movie:', err);
    }
  };

  // Leave room when component unmounts
  const leaveRoom = async () => {
    if (!roomId || !userId || !room) return;
    
    try {
      // Remove user from participants list
      const roomRef = doc(db, 'rooms', roomId);
      const updatedParticipants = room.participants.filter(id => id !== userId);
      
      if (updatedParticipants.length === 0) {
        // Delete the room if empty
        // This is optional - you might want to keep rooms
      } else {
        await updateDoc(roomRef, {
          participants: updatedParticipants,
          lastUpdated: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  };

  // Handle movie selection
  const handleSelectMovie = async (movie: Movie) => {
    if (!roomId) return;
    
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        currentMovie: movie.id,
        playbackPosition: 0,
        isPlaying: false,
        lastUpdated: serverTimestamp()
      });
      
      // Close the browser after selecting
      setShowBrowser(false);
    } catch (err) {
      console.error('Error updating room movie:', err);
    }
  };

  // Toggle play/pause
  const togglePlayback = async () => {
    if (!roomId || !room) return;
    
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        isPlaying: !(room.isPlaying || false),
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.error('Error toggling playback:', err);
    }
  };

  // Add chat message
  const handleSendMessage = (text: string) => {
    const newMessage = {
      id: Date.now().toString(),
      text,
      sender: username,
      userId,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Here you could also sync the message to Firestore if needed
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-500/20 border border-red-500 p-6 rounded-lg text-center max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-white mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="movie-room h-screen flex flex-col bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">{room?.name || `Room: ${roomId}`}</h1>
          <p className="text-sm text-gray-400">
            {room?.participants?.length || 0} {room?.participants?.length === 1 ? 'person' : 'people'} watching
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setShowBrowser(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg flex items-center text-sm sm:text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Select Movie
          </button>
        </div>
      </header>
      
      {/* Mobile Tab Navigation */}
      <div className="md:hidden bg-gray-900 border-b border-gray-800 p-2 flex justify-between">
        <button 
          onClick={() => setActiveTab('movie')}
          className={`flex-1 py-2 px-3 rounded-lg text-center text-sm font-medium ${activeTab === 'movie' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
        >
          Movie
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 px-3 rounded-lg text-center text-sm font-medium mx-2 ${activeTab === 'chat' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
        >
          Chat
        </button>
        <button 
          onClick={() => setActiveTab('video')}
          className={`flex-1 py-2 px-3 rounded-lg text-center text-sm font-medium ${activeTab === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
        >
          Video
        </button>
      </div>
      
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Movie and Chat Column - Hidden on mobile if not active */}
        <div className={`lg:col-span-2 flex flex-col h-[calc(100vh-9rem)] md:h-[calc(100vh-9rem)] overflow-hidden ${!['movie', 'chat'].includes(activeTab) && 'hidden md:flex'}`}>
          {/* Movie section - shown on mobile only when activeTab is 'movie' */}
          {(activeTab === 'movie' || window.innerWidth >= 768) && (
            <>
              {currentMovie ? (
                <div className="flex-grow flex flex-col min-h-0">
                  <div className="bg-gray-900 rounded-lg overflow-hidden mb-4 flex-grow flex flex-col">
                    <div className="aspect-video w-full">
                      {currentMovie.archiveId ? (
                        // Use ArchivePlayer for Archive.org videos
                        <ArchivePlayer 
                          archiveId={currentMovie.archiveId} 
                          className="w-full h-full" 
                        />
                      ) : (
                        // Use MegaPlayer for Mega.nz or Cloudinary videos
                        <MegaPlayer 
                          megaLink={currentMovie.megaLink || ''}
                          cloudinaryId={currentMovie.cloudinaryId} 
                          className="w-full h-full" 
                        />
                      )}
                    </div>
                    
                    <div className="p-4 border-t border-gray-800">
                      <div className="flex flex-wrap justify-between items-start mb-4">
                        <div className="mr-4 mb-2">
                          <h2 className="text-xl font-bold">{currentMovie.title}</h2>
                          <div className="flex flex-wrap items-center text-sm text-gray-400 mt-1">
                            {currentMovie.year && <span className="mr-3">{currentMovie.year}</span>}
                            {currentMovie.genre && <span className="mr-3">{currentMovie.genre}</span>}
                            {currentMovie.duration && <span>{currentMovie.duration}</span>}
                          </div>
                        </div>
                        
                        <button 
                          onClick={togglePlayback}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full"
                        >
                          {room?.isPlaying ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>
                      
                      {currentMovie.description && (
                        <p className="text-gray-300 max-h-24 overflow-y-auto">{currentMovie.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg flex items-center justify-center p-6 md:p-8 h-64">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-xl font-medium mb-2">No Movie Selected</h3>
                    <p className="text-gray-400 mb-4">
                      Select a movie to start watching together
                    </p>
                    <button 
                      onClick={() => setShowBrowser(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      Browse Movies
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Chat section - shown on mobile only when activeTab is 'chat' */}
          {(activeTab === 'chat' || window.innerWidth >= 768) && (
            <div className={`bg-gray-900 rounded-lg overflow-hidden ${activeTab === 'chat' ? 'h-[calc(100vh-12rem)]' : 'mt-4 h-60'} flex flex-col`}>
              <div className="border-b border-gray-800 px-4 py-3">
                <h2 className="font-medium">Chat</h2>
              </div>
              <div className="flex-grow overflow-hidden">
                <Chat messages={messages} onSendMessage={handleSendMessage} />
              </div>
            </div>
          )}
        </div>
        
        {/* Video Chat Column - Hidden on mobile if not active */}
        <div className={`bg-gray-900 rounded-lg overflow-hidden h-[calc(100vh-9rem)] md:h-[calc(100vh-9rem)] ${activeTab !== 'video' && 'hidden md:block'}`}>
          <div className="border-b border-gray-800 px-4 py-3">
            <h2 className="font-medium">Video Chat</h2>
          </div>
          <div className="h-[calc(100%-3rem)] overflow-y-auto">
            <VideoChat 
              movieTitle={currentMovie?.title}
            />
          </div>
        </div>
      </div>
      
      {/* Movie browser overlay */}
      {showBrowser && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-auto p-4">
          <div className="max-w-6xl mx-auto bg-gray-900 rounded-lg shadow-xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">Select a Movie</h2>
              <button 
                onClick={() => setShowBrowser(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <MovieLibrary
                roomId={roomId}
                onSelectMovie={handleSelectMovie}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 