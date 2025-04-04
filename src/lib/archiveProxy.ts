/**
 * This module provides functions to interact with Archive.org content
 * while avoiding CORS issues.
 */

// In a real production app, this would be replaced with a server-side proxy
// that makes the actual requests to Archive.org and returns the results to the client

/**
 * Validates an Archive.org ID by checking if it follows the right format
 * and possibly matches known patterns.
 * 
 * In a production environment, this should be replaced with a server-side
 * validation that can directly check with Archive.org APIs.
 */
export const validateArchiveId = (id: string): boolean => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // Basic format validation - allow letters, numbers, and some special characters
  return /^[a-zA-Z0-9._-]+$/.test(id.trim());
};

/**
 * Extracts an Archive.org ID from a URL
 * 
 * @param url The Archive.org URL (details or embed)
 * @returns The extracted ID or null if no ID could be found
 */
export const extractArchiveIdFromUrl = (url: string): string | null => {
  if (!url) return null;
  
  // Extract from details or embed URL
  const matches = url.match(/archive\.org\/(details|embed)\/([^\/\?#]+)/);
  if (matches && matches[2]) {
    return matches[2];
  }
  
  return null;
};

/**
 * Gets the embed URL for an Archive.org item
 * 
 * @param id The Archive.org ID
 * @returns The URL to embed the item
 */
export const getArchiveEmbedUrl = (id: string): string => {
  return `https://archive.org/embed/${id.trim()}`;
};

/**
 * Gets the thumbnail URL for an Archive.org item
 * 
 * @param id The Archive.org ID
 * @returns The URL to the item's thumbnail
 */
export const getArchiveThumbnailUrl = (id: string): string => {
  // In a production app, this would go through your backend proxy
  return `https://archive.org/services/img/${id.trim()}`;
}; 