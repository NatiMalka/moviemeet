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
  addedOn: any;
}

export function AdminMovieManager() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showThumbnailPreview, setShowThumbnailPreview] = useState(false);
  
  const [formData, setFormData] = useState<MovieFormData>({
    title: '',
    description: '',
    thumbnail: '',
    archiveId: '',
    genre: '',
    year: new Date().getFullYear(),
    duration: ''
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
    fetchMovies();
  }, []);

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
        duration: ''
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

  return (
    <div className="admin-movie-manager p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Movie Library Manager</h1>
      
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
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  min="1900"
                  max="2099"
                  className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Duration</label>
                <input
                  type="text"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="1h 30m"
                  className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Genre</label>
              <select
                name="genre"
                value={formData.genre}
                onChange={handleInputChange}
                className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Genre</option>
                <option value="Action">Action</option>
                <option value="Comedy">Comedy</option>
                <option value="Drama">Drama</option>
                <option value="Horror">Horror</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Romance">Romance</option>
                <option value="Thriller">Thriller</option>
                <option value="Documentary">Documentary</option>
                <option value="Animation">Animation</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-gray-800 text-white rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="text-right">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-2 transition"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                  Adding...
                </span>
              ) : (
                'Add Movie'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Movies list */}
      <div>
        <h2 className="text-xl font-medium mb-4">Movie Library</h2>
        
        {loading && movies.length === 0 ? (
          <div className="flex justify-center p-8">
            <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          </div>
        ) : movies.length === 0 ? (
          <div className="bg-gray-800 p-8 rounded-lg text-center">
            <p className="text-gray-400">No movies added yet.</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 text-left">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Archive ID</th>
                    <th className="px-4 py-3">Genre</th>
                    <th className="px-4 py-3">Year</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {movies.map(movie => (
                    <tr key={movie.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          {movie.thumbnail && (
                            <img 
                              src={movie.thumbnail} 
                              alt={movie.title} 
                              className="w-10 h-10 object-cover rounded mr-3"
                            />
                          )}
                          <span>{movie.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="bg-gray-800 px-2 py-1 rounded text-xs">
                          {movie.archiveId}
                        </code>
                      </td>
                      <td className="px-4 py-3">{movie.genre || '-'}</td>
                      <td className="px-4 py-3">{movie.year || '-'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteMovie(movie.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 