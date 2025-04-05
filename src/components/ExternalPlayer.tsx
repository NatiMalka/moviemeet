import React, { useState, useEffect, useRef } from 'react';
import { 
  prepareUrlForEmbedding, 
  isAnimeiLTvUrl, 
  optimizeEmbeddedViewing,
  adjustIframeContent
} from '../lib/externalUrlUtils';
import {
  detectAnimeiLTvPlayer,
  autoPlayAnimeiLTvContent,
  optimizeAnimeiLTvViewing,
  extractAnimeiLTvMetadata,
  monitorAnimeiLTvPlayerEvents
} from '../lib/animeilTvUtils';
import '../styles/ExternalPlayer.css';

interface ExternalPlayerProps {
  externalUrl: string;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export function ExternalPlayer({ 
  externalUrl, 
  className = '',
  onPlay,
  onPause,
  onTimeUpdate
}: ExternalPlayerProps) {
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [viewportType, setViewportType] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // When the URL changes, process it for embedding
  useEffect(() => {
    if (!externalUrl) {
      setIsError(true);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setIsError(false);
    setIsOptimized(false);
    
    try {
      // Check if it's an AnimeiL-TV URL
      if (isAnimeiLTvUrl(externalUrl)) {
        // Process the URL for embedding
        const prepared = prepareUrlForEmbedding(externalUrl);
        setEmbedUrl(prepared);
      } else {
        // If not a specific type we handle, use the original URL
        setEmbedUrl(externalUrl);
      }
    } catch (err) {
      console.error('Error preparing URL for embedding:', err);
      setIsError(true);
    }
    
    // We'll set a timeout to hide the loading indicator after a reasonable time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [externalUrl]);

  // Apply optimizations when the iframe loads
  useEffect(() => {
    if (isLoading || isOptimized || !iframeRef.current) return;
    
    // Apply optimizations when the iframe loads
    const handleIframeLoad = () => {
      if (!iframeRef.current) return;
      
      // Wait a moment for the iframe content to stabilize
      setTimeout(async () => {
        if (!iframeRef.current) return;
        
        if (isAnimeiLTvUrl(externalUrl)) {
          // Apply AnimeiLTV specific optimizations
          await optimizeAnimeiLTvViewing(iframeRef.current);
          
          // Set up player monitoring
          const cleanup = await monitorAnimeiLTvPlayerEvents(
            iframeRef.current,
            onPlay,
            onPause,
            onTimeUpdate
          );
          
          // Try to detect and auto-play the video
          const hasPlayer = await detectAnimeiLTvPlayer(iframeRef.current);
          if (hasPlayer) {
            await autoPlayAnimeiLTvContent(iframeRef.current);
          }
          
          // Attempt to extract metadata
          const metadata = await extractAnimeiLTvMetadata(iframeRef.current);
          console.log('Extracted AnimeiLTV metadata:', metadata);
        } else {
          optimizeEmbeddedViewing(iframeRef.current);
        }
        setIsOptimized(true);
      }, 1500);
    };
    
    // Add load event listener
    if (iframeRef.current.contentDocument?.readyState === 'complete') {
      handleIframeLoad();
    } else {
      iframeRef.current.addEventListener('load', handleIframeLoad);
    }
    
    return () => {
      iframeRef.current?.removeEventListener('load', handleIframeLoad);
    };
  }, [isLoading, isOptimized, externalUrl, onPlay, onPause, onTimeUpdate]);

  // Handle fullscreen mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Hide controls briefly when entering fullscreen, then show them again
      if (document.fullscreenElement) {
        setShowControls(false);
        setTimeout(() => setShowControls(true), 2000);
      } else {
        setShowControls(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Apply dark mode or light mode
  useEffect(() => {
    if (!iframeRef.current || !isOptimized) return;
    
    const darkModeStyles = {
      'body': 'background-color: #121212 !important; color: #eee !important;',
      'a': 'color: #4da6ff !important;',
      '.bg-white, [class*="bg-light"], .card, .container, .wrapper': 'background-color: #1e1e1e !important; color: #eee !important;',
      '.text-dark': 'color: #eee !important;',
      '.bg-dark': 'background-color: #000 !important;'
    };
    
    if (isDarkMode) {
      adjustIframeContent(iframeRef.current, darkModeStyles);
    } else {
      // Reset to light mode
      adjustIframeContent(iframeRef.current, {
        'body': 'background-color: #fff !important; color: #000 !important;',
        '.dark-mode, .night-mode': 'display: none !important;'
      });
    }
  }, [isDarkMode, isOptimized]);
  
  // Handle direct viewing in a new tab
  const handleOpenInNewTab = () => {
    window.open(externalUrl, '_blank');
  };
  
  // Function to reload the iframe
  const reloadIframe = () => {
    if (iframeRef.current) {
      setIsOptimized(false);
      iframeRef.current.src = embedUrl;
      setIsLoading(true);
    }
  };

  // Function to toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  // Function to adjust zoom level
  const adjustZoom = (increment: number) => {
    setZoomLevel(prevZoom => {
      const newZoom = prevZoom + increment;
      return Math.max(0.5, Math.min(2, newZoom)); // Limit zoom between 0.5x and 2x
    });
  };

  // Toggle viewport type (desktop, mobile, tablet)
  const toggleViewportType = () => {
    const types: Array<'desktop' | 'mobile' | 'tablet'> = ['desktop', 'mobile', 'tablet'];
    const currentIndex = types.indexOf(viewportType);
    const nextIndex = (currentIndex + 1) % types.length;
    setViewportType(types[nextIndex]);
    
    // Apply viewport-specific optimizations
    if (!iframeRef.current) return;
    
    switch(types[nextIndex]) {
      case 'mobile':
        adjustIframeContent(iframeRef.current, {
          'meta[name="viewport"]': 'content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" !important',
          'body': 'width: 480px !important; margin: 0 auto !important;'
        });
        break;
      case 'tablet':
        adjustIframeContent(iframeRef.current, {
          'meta[name="viewport"]': 'content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" !important',
          'body': 'width: 768px !important; margin: 0 auto !important;'
        });
        break;
      case 'desktop':
        adjustIframeContent(iframeRef.current, {
          'meta[name="viewport"]': 'content="width=device-width, initial-scale=1.0" !important',
          'body': 'width: 100% !important; margin: 0 !important;'
        });
        break;
    }
  };
  
  // Error display when URL is missing or invalid
  if (!externalUrl || isError) {
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
          <h3 className="text-lg font-medium mb-1">Invalid External URL</h3>
          <p className="text-gray-400 max-w-md">
            {!externalUrl 
              ? "No external URL was provided for the video." 
              : "The provided URL could not be embedded or is invalid."}
          </p>
        </div>
      </div>
    );
  }

  // Loading indicator
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg p-8 ${className}`}>
        <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef} 
      className={`external-player embedded-website relative w-full ${className} ${isFullscreen ? 'fullscreen-mode' : ''}`}
      data-site={isAnimeiLTvUrl(externalUrl) ? 'animeil-tv' : undefined}
    >
      {/* Main iframe for embedding external content */}
      <div className="iframe-container relative w-full h-full">
        <iframe 
          ref={iframeRef}
          src={embedUrl}
          className={`w-full h-full border-0 rounded-lg ${isDarkMode ? 'dark-mode-iframe' : ''} ${isOptimized ? 'optimized-embed' : ''}`}
          style={{ 
            transform: `scale(${zoomLevel})`, 
            transformOrigin: 'top left',
            height: `${100 / zoomLevel}%`, // Adjust height based on zoom
            width: `${100 / zoomLevel}%` // Adjust width based on zoom
          }}
          allowFullScreen
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          referrerPolicy="no-referrer"
          title="External Video Player"
          onError={() => setIsError(true)}
          onLoad={() => setIsLoading(false)}
        />
      </div>
      
      {/* Control panel */}
      {showControls && (
        <div className="controls-wrapper absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex justify-between items-center">
            {/* Left controls */}
            <div className="flex gap-2 items-center">
              <button 
                onClick={handleOpenInNewTab}
                className="bg-black/80 p-2 rounded-lg text-blue-400 hover:text-blue-300 text-sm flex items-center"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 mr-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                  />
                </svg>
                Open in new tab
              </button>
            </div>
            
            {/* Right controls - iframe control tools */}
            <div className="flex gap-2 items-center">
              <button
                onClick={reloadIframe}
                className="bg-black/80 p-2 rounded-lg text-gray-300 hover:text-white text-sm"
                title="Reload"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              <button
                onClick={toggleViewportType}
                className="bg-black/80 p-2 rounded-lg text-gray-300 hover:text-white text-sm"
                title={`Switch to ${viewportType === 'desktop' ? 'mobile' : viewportType === 'mobile' ? 'tablet' : 'desktop'} view`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {viewportType === 'desktop' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  ) : viewportType === 'mobile' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  )}
                </svg>
              </button>
              
              <div className="flex items-center bg-black/80 rounded-lg overflow-hidden">
                <button
                  onClick={() => adjustZoom(-0.1)}
                  className="p-2 text-gray-300 hover:text-white text-sm"
                  title="Zoom out"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                
                <span className="text-gray-300 text-xs px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                
                <button
                  onClick={() => adjustZoom(0.1)}
                  className="p-2 text-gray-300 hover:text-white text-sm"
                  title="Zoom in"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              
              <button
                onClick={() => setZoomLevel(1)}
                className="bg-black/80 p-2 rounded-lg text-gray-300 hover:text-white text-sm"
                title="Reset zoom"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="bg-black/80 p-2 rounded-lg text-gray-300 hover:text-white text-sm"
                title={isDarkMode ? "Light mode" : "Dark mode"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d={isDarkMode 
                      ? "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
                      : "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"} 
                  />
                </svg>
              </button>
              
              <button
                onClick={toggleFullscreen}
                className="bg-black/80 p-2 rounded-lg text-gray-300 hover:text-white text-sm"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                    isFullscreen 
                      ? "M9 9H4v5m0-5l6 6m5-11h5v5m-5-5l-6 6" 
                      : "M15 3h6v6m-6-6L9 9M9 21H3v-6m6 6l6-6M21 9v6h-6m6-6l-6 6"
                  } />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Show/hide controls button - only visible when controls are hidden */}
      {!showControls && (
        <button 
          onClick={() => setShowControls(true)}
          className="absolute bottom-4 right-4 bg-black/50 rounded-full p-2 text-white hover:bg-black/80 transition-opacity opacity-50 hover:opacity-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
} 