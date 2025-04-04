import React, { useState } from 'react';
import { validateArchiveId, extractArchiveIdFromUrl } from '../lib/archiveProxy';

interface ArchiveUploaderProps {
  onSuccess: (archiveId: string) => void;
  onError: (error: string) => void;
}

export function ArchiveUploader({ onSuccess, onError }: ArchiveUploaderProps) {
  const [archiveId, setArchiveId] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    
    try {
      const trimmedInput = archiveId.trim();
      
      // Extract identifier from URL if user enters full URL
      let finalId = trimmedInput;
      if (trimmedInput.includes('archive.org')) {
        const extractedId = extractArchiveIdFromUrl(trimmedInput);
        if (extractedId) {
          finalId = extractedId;
        } else {
          onError('Could not extract a valid Archive.org ID from the URL');
          setIsValidating(false);
          return;
        }
      }
      
      // Validate the ID format
      if (validateArchiveId(finalId)) {
        onSuccess(finalId);
        setArchiveId(''); // Reset input
      } else {
        onError('Archive.org identifier contains invalid characters. Use only letters, numbers, dots, underscores, and hyphens.');
      }
    } catch (error) {
      onError(`Error processing Archive.org identifier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="archive-uploader mb-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div>
          <label htmlFor="archiveId" className="block text-sm font-medium mb-1">
            Archive.org Identifier or URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="archiveId"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="e.g., bl5ck-cl0v3r-tv-dub-seasons-2"
              value={archiveId}
              onChange={(e) => setArchiveId(e.target.value)}
              disabled={isValidating}
            />
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isValidating || !archiveId.trim()}
            >
              {isValidating ? 'Validating...' : 'Add'}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Enter an Archive.org item identifier or the full URL to the item.
          <br />
          Example: <code>bl5ck-cl0v3r-tv-dub-seasons-2</code> or <code>https://archive.org/details/bl5ck-cl0v3r-tv-dub-seasons-2</code>
        </p>
      </form>
    </div>
  );
} 