import React, { useState, useEffect } from 'react';
import { CLOUDINARY_CLOUD_NAME, isCloudinaryId } from '../lib/cloudinary';

interface MegaPlayerProps {
  megaLink: string;
  cloudinaryId?: string;
  className?: string;
}

export function MegaPlayer({ megaLink, cloudinaryId, className = '' }: MegaPlayerProps) {
  const [parsedLink, setParsedLink] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useCloudinary, setUseCloudinary] = useState(false);

  useEffect(() => {
    // First check if we have a cloudinaryId to use
    if (cloudinaryId && cloudinaryId.trim() !== '') {
      setUseCloudinary(true);
      setLoading(false);
      setIsError(false);
      return;
    }
    
    // Check if the megaLink might be a Cloudinary ID
    if (megaLink && isCloudinaryId(megaLink)) {
      setUseCloudinary(true);
      setLoading(false);
      setIsError(false);
      return;
    }
    
    // Otherwise, try to parse the Mega.nz link
    if (!megaLink || megaLink.trim() === '') {
      setIsError(true);
      setLoading(false);
      return;
    }

    try {
      // Parse Mega.nz link to create embed URL
      const parseMegaLink = (link: string) => {
        // For format: https://mega.nz/file/ABCDEFGH#ijklmnopqrstuvwxyz
        if (link.includes('/file/')) {
          const fileId = link.split('/file/')[1].split('#')[0];
          const key = link.split('#')[1];
          
          if (fileId && key) {
            return { fileId, key };
          }
        }
        
        // For older format: https://mega.nz/#!ABCDEFGH!ijklmnopqrstuvwxyz
        if (link.includes('/#!')) {
          const fileId = link.split('/#!')[1].split('!')[0];
          const key = link.split('!')[1];
          
          if (fileId && key) {
            return { fileId, key };
          }
        }
        
        // Try alternative format with video parameter
        if (link.includes('mega.nz/file/')) {
          try {
            const url = new URL(link);
            const pathParts = url.pathname.split('/');
            if (pathParts.length > 2) {
              const fileId = pathParts[2];
              const key = url.hash.substring(1); // Remove the # character
              
              if (fileId && key) {
                return { fileId, key };
              }
            }
          } catch (e) {
            console.error("Error parsing URL:", e);
          }
        }
        
        return null;
      };

      const linkInfo = parseMegaLink(megaLink);
      
      if (linkInfo) {
        // Try with specific streaming parameter (this is experimental)
        const embedUrl = `https://mega.nz/embed/${linkInfo.fileId}#${linkInfo.key}`;
        setParsedLink(embedUrl);
        setIsError(false);
      } else {
        setIsError(true);
        console.error('Invalid Mega.nz link format:', megaLink);
      }
    } catch (err) {
      console.error('Error parsing Mega link:', err);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [megaLink, cloudinaryId]);

  // Function to handle direct play for Mega links
  const handleDirectPlay = () => {
    window.open(megaLink, '_blank');
  };

  // Handle iframe load error
  const handleIframeError = () => {
    console.log("Iframe failed to load properly - Mega may be blocking embedded playback");
    setIframeError(true);
  };

  if (isError) {
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
          <h3 className="text-lg font-medium mb-1">Invalid Video Source</h3>
          <p className="text-gray-400 max-w-md">
            The video source provided is not valid or could not be parsed.
            Please check the link and try again.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg p-8 ${className}`}>
        <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  // Use Cloudinary player if we have a Cloudinary ID
  if (useCloudinary) {
    const videoId = cloudinaryId || megaLink || ''; // Use megaLink as fallback if it's a Cloudinary ID
    
    if (!videoId || videoId.trim() === '') {
      return (
        <div className={`flex items-center justify-center bg-gray-900 rounded-lg p-8 ${className}`}>
          <div className="text-center">
            <h3 className="text-lg font-medium mb-1">Missing Video ID</h3>
            <p className="text-gray-400">No valid Cloudinary ID was provided.</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className={`cloudinary-player w-full ${className}`}>
        <video
          className="w-full h-full rounded-lg"
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
        >
          {/* Provide multiple sources for better browser compatibility */}
          <source 
            src={`https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/q_auto,f_mp4/${videoId}`} 
            type="video/mp4"
          />
          <source 
            src={`https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/q_auto,f_webm/${videoId}`} 
            type="video/webm"
          />
          
          <p className="text-center p-4 bg-gray-900 text-white">
            Your browser doesn't support HTML5 video playback.
            <a 
              href={`https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${videoId}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline ml-1"
            >
              Download the video instead.
            </a>
          </p>
        </video>
      </div>
    );
  }

  // Fall back to Mega.nz player with iframe, or show backup play button if iframe fails
  if (iframeError || !parsedLink) {
    return (
      <div className={`mega-player relative w-full bg-black ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
          
          <div className="relative z-10 max-w-md mx-auto text-center">
            <button 
              onClick={handleDirectPlay}
              className="p-6 mb-4 rounded-full bg-blue-600 hover:bg-blue-700 transition-all transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" 
                  clipRule="evenodd" 
                />
              </svg>
            </button>
            
            <p className="text-white font-medium mb-1">Embedded playback blocked</p>
            <p className="text-sm text-gray-300 mb-4">
              Mega.nz restricts embedded playback. Click to open in a new tab.
            </p>
            
            <div className="text-xs text-gray-400 border-t border-gray-700 pt-4 mt-4">
              <p className="mb-2">For direct embedding, we recommend Cloudinary:</p>
              <p className="text-gray-300">
                For better playback, ask the admin to upload this video to Cloudinary.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mega-player w-full ${className}`}>
      <iframe 
        src={parsedLink}
        className="w-full h-full border-0 rounded-lg"
        allowFullScreen
        allow="autoplay; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        referrerPolicy="no-referrer"
        title="Mega Video Player"
        onError={handleIframeError}
      />
    </div>
  );
} 