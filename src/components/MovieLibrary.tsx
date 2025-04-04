import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArchivePlayer } from './ArchivePlayer';

interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  archiveId?: string;
  megaLink?: string;
  cloudinaryId?: string;
  genre: string;
  year: number;
  duration: string;
  addedOn: any;
}

interface MovieLibraryProps {
  roomId?: string;
  onSelectMovie?: (movie: Movie) => void;
}

export function MovieLibrary({ roomId, onSelectMovie }: MovieLibraryProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  
  // Load movies from Firestore
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const moviesCollection = collection(db, 'movies');
        const q = query(moviesCollection, orderBy('addedOn', 'desc'));
        const snapshot = await getDocs(q);
        
        const movieList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Movie[];
        
        setMovies(movieList);
        setError(null);
      } catch (err) {
        console.error('Error fetching movies:', err);
        setError('Failed to load movies');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovies();
  }, []);
  
  // Handle movie selection
  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    
    // If a room is active and onSelectMovie callback is provided
    if (roomId && onSelectMovie) {
      onSelectMovie(movie);
    }
  };
  
  // Filter movies by search term and selected genre
  const filteredMovies = movies.filter(movie => {
    const matchesSearch = searchTerm === '' || 
      movie.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      movie.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesGenre = selectedGenre === '' || movie.genre === selectedGenre;
    
    return matchesSearch && matchesGenre;
  });
  
  // Extract all unique genres
  const genres = Array.from(new Set(movies.map(movie => movie.genre))).filter(Boolean);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500 p-6 rounded-lg text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
        <p className="text-white">{error}</p>
      </div>
    );
  }
  
  if (movies.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg flex items-center justify-center p-12">
        <div className="text-center max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
          <h2 className="text-xl font-medium mb-2">No Movies Available</h2>
          <p className="text-gray-400">
            There are no movies in the library yet. Please check back later or contact the administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="movie-library">
      {/* Selected movie player (if a movie is selected) */}
      {selectedMovie && (
        <div className="mb-8">
          <div className="rounded-lg overflow-hidden bg-gray-900">
            <ArchivePlayer 
              archiveId={selectedMovie.archiveId || ''} 
              className="aspect-video w-full" 
            />
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">{selectedMovie.title}</h1>
                <div className="flex items-center text-sm text-gray-400 mt-1">
                  {selectedMovie.year && <span className="mr-3">{selectedMovie.year}</span>}
                  {selectedMovie.genre && <span className="mr-3">{selectedMovie.genre}</span>}
                  {selectedMovie.duration && <span>{selectedMovie.duration}</span>}
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedMovie(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {selectedMovie.description && (
              <p className="text-gray-300 mt-2">{selectedMovie.description}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Search and filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-grow">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search movies..."
              className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div>
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Genres</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Movie grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredMovies.map((movie) => (
          <div 
            key={movie.id} 
            className="group cursor-pointer bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
            onClick={() => handleSelectMovie(movie)}
          >
            <div className="relative">
              <div className="aspect-video bg-gray-800 overflow-hidden">
                {movie.thumbnail ? (
                  <img 
                    src={movie.thumbnail} 
                    alt={movie.title} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  // If no thumbnail, use Archive.org's thumbnail by constructing a URL
                  <img
                    src={`https://archive.org/services/img/${movie.archiveId}`}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => {
                      // If Archive.org thumbnail fails, show a fallback icon
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = '';
                      target.style.display = 'none';
                      const nextElement = target.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'flex';
                      }
                    }}
                  />
                )}
                <div className="hidden items-center justify-center h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="bg-blue-600 hover:bg-blue-700 transition-colors text-white p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-3">
              <h3 className="font-medium truncate" title={movie.title}>{movie.title}</h3>
              {(movie.year || movie.genre) && (
                <div className="flex text-xs text-gray-400 mt-1">
                  {movie.year && <span className="mr-2">{movie.year}</span>}
                  {movie.genre && <span>{movie.genre}</span>}
                </div>
              )}
              {/* Archive.org badge */}
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  <svg 
                    className="h-3 w-3 mr-1" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93s3.06-7.44 7-7.93v15.86zm2-15.86c1.03.13 2 .45 2.87.93H13v-.93zm0 2.93h2.87C16.06 7.93 17 9.24 17 10.66c0 1.38-.97 2.67-2.13 3.67H13v-8.33zm0 10.33v.93c-.98-.13-1.91-.45-2.73-.93H13zm0-2H9.13c-1.16-1-2.13-2.29-2.13-3.67 0-1.41.94-2.72 2.13-3.67H13v7.34z" />
                  </svg>
                  Archive.org
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 