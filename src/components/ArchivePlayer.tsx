import React from 'react';
import { getArchiveEmbedUrl } from '../lib/archiveProxy';

interface ArchivePlayerProps {
  archiveId: string;
  className?: string;
}

export function ArchivePlayer({ archiveId, className = '' }: ArchivePlayerProps) {
  if (!archiveId) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg p-8 ${className}`}>
        <div className="text-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-12 w-12 mx-auto text-red-500 mb-3" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <h3 className="text-lg font-medium mb-1">Missing Archive ID</h3>
          <p className="text-gray-400 max-w-md">
            No Archive.org identifier was provided for the video.
          </p>
        </div>
      </div>
    );
  }

  // Get the embed URL using our utility function
  const embedUrl = getArchiveEmbedUrl(archiveId);
  
  return (
    <div className={`archive-player w-full ${className}`}>
      <iframe 
        src={embedUrl}
        className="w-full h-full border-0 rounded-lg"
        allowFullScreen
        frameBorder="0"
        scrolling="no"
        title="Archive.org Video Player"
      />
    </div>
  );
} 