import React from 'react';
import { CLOUDINARY_CLOUD_NAME } from '../lib/cloudinary';

interface CloudinaryPlayerProps {
  publicId: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
}

export function CloudinaryPlayer({ 
  publicId, 
  className = '', 
  autoPlay = false, 
  controls = true, 
  muted = false,
  loop = false 
}: CloudinaryPlayerProps) {
  // Cloud name should come from environment variables or Cloudinary lib
  const cloudName = CLOUDINARY_CLOUD_NAME;

  if (!publicId) {
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
          <h3 className="text-lg font-medium mb-1">Missing Video ID</h3>
          <p className="text-gray-400 max-w-md">
            No Cloudinary public ID was provided for the video.
          </p>
        </div>
      </div>
    );
  }

  // Create the Cloudinary video URL with transformations for optimal streaming
  // This uses the Cloudinary Video Player which automatically handles adaptive streaming
  const videoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/q_auto,f_auto/${publicId}`;
  
  return (
    <div className={`cloudinary-player w-full ${className}`}>
      <video 
        src={videoUrl}
        className="w-full h-full rounded-lg"
        autoPlay={autoPlay}
        controls={controls}
        muted={muted}
        loop={loop}
        playsInline
        controlsList="nodownload"
        preload="metadata"
      />
    </div>
  );
} 