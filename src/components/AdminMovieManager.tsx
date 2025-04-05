import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ArchiveUploader } from './ArchiveUploader';
import { getArchiveThumbnailUrl } from '../lib/archiveProxy';

interface MovieFormData {
  title: string;
  description: string;
  thumbnail: string;
  archiveId: string;
  genre: string;
  year: number;
  duration: string;
  externalUrl?: string;
}

interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  archiveId: string;
  genre: string;
  year: number;
  duration: string;
  externalUrl?: string;
  addedOn: any;
}

export function AdminMovieManager() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showThumbnailPreview, setShowThumbnailPreview] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState<MovieFormData>({
    title: '',
    description: '',
    thumbnail: '',
    archiveId: '',
    genre: '',
    year: new Date().getFullYear(),
    duration: '',
    externalUrl: ''
  });

  // Fetch existing movies
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
    } catch (err) {
      console.error('Error fetching movies:', err);
      setError('Failed to load movies');
    } finally {
      setLoading(false);
    }
  };

  // Load movies on mount
  useEffect(() => {
    if (authenticated) {
      fetchMovies();
    }
  }, [authenticated]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) || new Date().getFullYear() : value
    }));
  };

  // Handle Archive.org ID submission
  const handleArchiveIdSubmit = (archiveId: string) => {
    setFormData(prev => ({
      ...prev,
      archiveId
    }));
    setSuccess('Archive.org ID added successfully!');
    setShowThumbnailPreview(true);
  };

  // Add new movie
  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset status messages
    setError(null);
    setSuccess(null);
    
    // Validate form
    if (!formData.title || !formData.archiveId) {
      setError('Title and Archive.org ID are required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Add to Firebase
      await addDoc(collection(db, 'movies'), {
        ...formData,
        addedOn: serverTimestamp()
      });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        thumbnail: '',
        archiveId: '',
        genre: '',
        year: new Date().getFullYear(),
        duration: '',
        externalUrl: ''
      });
      
      setSuccess('Movie added successfully!');
      fetchMovies(); // Refresh the list
    } catch (err) {
      console.error('Error adding movie:', err);
      setError('Failed to add movie');
    } finally {
      setLoading(false);
    }
  };

  // Delete movie
  const handleDeleteMovie = async (id: string) => {
    if (!confirm('Are you sure you want to delete this movie?')) {
      return;
    }
    
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'movies', id));
      setSuccess('Movie deleted successfully');
      fetchMovies(); // Refresh the list
    } catch (err) {
      console.error('Error deleting movie:', err);
      setError('Failed to delete movie');
    } finally {
      setLoading(false);
    }
  };

  // Handle authentication
  const handleAuthentication = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate a brief delay for authentication
    setTimeout(() => {
      if (password === 'admin123') {
        setAuthenticated(true);
        setError(null);
      } else {
        setError('Invalid password');
      }
      setLoading(false);
    }, 500);
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // If not authenticated, show login form
  if (!authenticated) {
    return (
      <div className="admin-login p-4 max-w-md mx-auto mt-20">
        <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg mb-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleAuthentication} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter admin password"
                  required
                />
                <button 
                  type="button" 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-400 hover:text-white"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Hint: admin123</p>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-200"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-movie-manager p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Movie Library Manager</h1>
        <button
          onClick={() => setAuthenticated(false)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
        >
          Logout
        </button>
      </div>
      
      {/* Status messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg mb-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/20 border border-green-500 p-4 rounded-lg mb-4">
          <p className="text-green-400">{success}</p>
        </div>
      )}
      
      {/* Add movie form */}
      <div className="bg-gray-900 p-4 rounded-lg mb-8">
        <h2 className="text-xl font-medium mb-4">Add New Movie</h2>
        
        {/* Archive.org Uploader */}
        <div className="mb-6">
          <ArchiveUploader 
            onSuccess={handleArchiveIdSubmit} 
            onError={(errorMsg) => setError(errorMsg)} 
          />
        </div>
        
        {/* Thumbnail Preview */}
        {showThumbnailPreview && formData.archiveId && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Archive.org Thumbnail Preview</label>
            <div className="relative w-full h-40 bg-gray-200 rounded overflow-hidden">
              <img 
                src={getArchiveThumbnailUrl(formData.archiveId)}
                alt="Archive.org thumbnail preview"
                className="w-full h-full object-cover"
                onError={() => {
                  // If the image fails to load, show a fallback
                  setError("Couldn't load thumbnail, but ID may still be valid");
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This is the thumbnail that will be shown for the movie. 
              If it doesn't appear, Archive.org may not have generated a thumbnail yet.
            </p>
          </div>
        )}
        
        <form onSubmit={handleAddMovie} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title*</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Archive.org ID*</label>
              <input
                type="text"
                name="archiveId"
                value={formData.archiveId}
                onChange={handleInputChange}
                placeholder="e.g., example_video_2023"
                className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter an Archive.org item identifier or the full URL to the item.
                <br />
                Example: <code>bl5ck-cl0v3r-tv-dub-seasons-2</code> or <code>https://archive.org/details/bl5ck-cl0v3r-tv-dub-seasons-2</code>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Thumbnail URL</label>
              <input
                type="text"
                name="thumbnail"
                value={formData.thumbnail}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use Archive.org thumbnail
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Genre</label>
              <select
                name="genre"
                value={formData.genre}
                onChange={handleInputChange}
                className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Genre --</option>
                <option value="Action">Action</option>
                <option value="Comedy">Comedy</option>
                <option value="Drama">Drama</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Horror">Horror</option>
                <option value="Documentary">Documentary</option>
                <option value="Animation">Animation</option>
                <option value="Thriller">Thriller</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Duration</label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                placeholder="e.g., 1h 35m"
                className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* External URL (AnimeiL-TV) */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                External URL (AnimeiL-TV)
              </label>
              <input
                type="text"
                name="externalUrl"
                value={formData.externalUrl || ''}
                onChange={handleInputChange}
                className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter URL from AnimeiL-TV"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. Enter a URL from AnimeiL-TV to embed external content.
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
          
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition duration-200"
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Movie'}
          </button>
        </form>
      </div>
      
      {/* Movie list */}
      <div className="bg-gray-900 p-4 rounded-lg">
        <h2 className="text-xl font-medium mb-4">Manage Movies</h2>
        
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {movies.map(movie => (
              <div key={movie.id} className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="relative aspect-video">
                  <img
                    src={movie.thumbnail || getArchiveThumbnailUrl(movie.archiveId)}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-medium truncate">{movie.title}</h3>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-400">ID: {movie.archiveId}</span>
                    <button
                      onClick={() => handleDeleteMovie(movie.id)}
                      className="text-red-500 hover:text-red-400 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No movies found. Add some movies to get started.
          </div>
        )}
      </div>
    </div>
  );
} 