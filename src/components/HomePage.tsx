import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Users, Play, Calendar, Star, Info } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSocket } from '../lib/socketContext';
import { MovieLibrary } from './MovieLibrary';

interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  archiveId?: string;
  megaLink?: string;
  cloudinaryId?: string;
  externalUrl?: string;
  genre: string;
  year: number;
  duration: string;
  addedOn: any;
}

export function HomePage() {
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { joinRoom } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeaturedMovies = async () => {
      try {
        setIsLoading(true);
        const moviesCollection = collection(db, 'movies');
        const q = query(moviesCollection, orderBy('addedOn', 'desc'), limit(4));
        const snapshot = await getDocs(q);
        
        const movieList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Movie[];
        
        setFeaturedMovies(movieList);
      } catch (err) {
        console.error('Error fetching featured movies:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFeaturedMovies();
  }, []);

  const handleJoinRoomClick = () => {
    // Simply dispatch a custom event that App.tsx can listen for
    const event = new CustomEvent('openJoinRoomDialog');
    document.dispatchEvent(event);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-gray-900 to-gray-950 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/homepage.jpg')] bg-cover opacity-10"></div>
        
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center bg-blue-600/20 rounded-full px-4 py-2 mb-6">
              <span className="text-blue-400 text-sm font-medium">Watch movies with friends</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your Personal <span className="text-blue-500">Movie Night</span>, Together
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 md:mb-10">
              Stream synchronized movies, chat in real-time, and enjoy virtual movie nights with friends anywhere.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleJoinRoomClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <Play size={20} />
                Start Watching
              </button>
              
              <button
                onClick={() => {
                  const librarySection = document.getElementById('movie-library');
                  if (librarySection) {
                    librarySection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                Browse Movies
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-950">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-5">
                <Users size={24} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Watch Together</h3>
              <p className="text-gray-400">
                Synchronized playback keeps everyone on the same frame, no matter where they are.
              </p>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-5">
                <Film size={24} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Video Chat</h3>
              <p className="text-gray-400">
                See and hear your friends' reactions in real-time with integrated video chat.
              </p>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-5">
                <Calendar size={24} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Movie Library</h3>
              <p className="text-gray-400">
                Access a growing collection of movies to watch with your friends anytime.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="bg-gray-900/50 p-6 rounded-lg">
              <Film className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Watch Together</h3>
              <p className="text-gray-300">
                Enjoy synchronized video playback with friends in private rooms.
              </p>
            </div>
            
            <div className="bg-gray-900/50 p-6 rounded-lg">
              <Users className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Live Chat</h3>
              <p className="text-gray-300">
                Chat in real-time while watching your favorite content together.
              </p>
            </div>
            
            <div className="bg-gray-900/50 p-6 rounded-lg">
              <Calendar className="h-8 w-8 text-blue-500 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Schedule Showings</h3>
              <p className="text-gray-300">
                Plan movie nights with an easy-to-use scheduling system.
              </p>
            </div>

            {/* New Feature Highlight */}
            <div className="bg-blue-900/30 border border-blue-700/50 p-6 rounded-lg col-span-1 md:col-span-3 mt-2">
              <div className="flex items-start">
                <div className="bg-blue-600 rounded-full p-2 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1 text-blue-300">NEW: External Content Integration</h3>
                  <p className="text-gray-300">
                    You can now watch content from external sites like AnimeiL-TV directly in MovieMeet! 
                    Simply add an external URL when creating a movie room.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Movies Section */}
      {featuredMovies.length > 0 && (
        <div className="py-16 bg-gradient-to-b from-gray-950 to-gray-900">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Featured Movies</h2>
              <button
                onClick={() => {
                  const librarySection = document.getElementById('movie-library');
                  if (librarySection) {
                    librarySection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                View All
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredMovies.map((movie) => (
                <div 
                  key={movie.id}
                  className="group bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-blue-500 transition-all"
                >
                  <div className="aspect-video relative overflow-hidden">
                    {movie.thumbnail ? (
                      <img 
                        src={movie.thumbnail} 
                        alt={movie.title}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <Film className="text-gray-600" size={40} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <button 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transform translate-y-4 group-hover:translate-y-0 transition"
                        onClick={handleJoinRoomClick}
                      >
                        <Play size={20} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1 line-clamp-1">{movie.title}</h3>
                    <div className="flex items-center text-sm text-gray-400 mb-2">
                      {movie.year && <span className="mr-3">{movie.year}</span>}
                      {movie.genre && <span className="mr-3">{movie.genre}</span>}
                      {movie.duration && <span>{movie.duration}</span>}
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{movie.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How It Works Section */}
      <div className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-6">1</div>
              <h3 className="text-xl font-semibold mb-3">Create or Join a Room</h3>
              <p className="text-gray-400">
                Start a new room or join an existing one with a simple room code.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-6">2</div>
              <h3 className="text-xl font-semibold mb-3">Invite Your Friends</h3>
              <p className="text-gray-400">
                Share your room code with friends so they can join your movie session.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-6">3</div>
              <h3 className="text-xl font-semibold mb-3">Watch & Chat Together</h3>
              <p className="text-gray-400">
                Enjoy synchronized playback with video chat and text messaging.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Movie Library Section */}
      <div id="movie-library" className="py-16 bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12">Movie Library</h2>
          <MovieLibrary />
        </div>
      </div>
    </div>
  );
} 