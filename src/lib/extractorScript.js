/**
 * This script can be used as a Chrome extension content script to extract
 * video URLs from AnimeiL-TV. It works by intercepting network requests
 * and identifying video stream URLs.
 */

// Store extracted video URLs here
const extractedUrls = new Set();

// Function to send extracted URL to our application
function sendExtractedUrl(url) {
  // Send message to our application
  window.postMessage(
    {
      type: 'video-url',
      url: url,
      source: 'animeil-tv-extractor'
    },
    '*'
  );
  
  console.log('[AnimeiL-TV Extractor] Found video URL:', url);
}

// Create a wrapper for XMLHttpRequest to intercept network requests
function setupXhrInterceptor() {
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;
  
  // Override the open method to log URLs
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._requestUrl = url;
    
    // Look for video content in the URL
    if (typeof url === 'string') {
      // Check for common video stream patterns
      if (url.includes('videoplayback?expire=') || 
          url.includes('m=vwb/') ||
          url.includes('vid/') ||
          (url.includes('.mp4') && !url.includes('.css'))) {
        // This looks like a video URL
        if (!extractedUrls.has(url)) {
          extractedUrls.add(url);
          sendExtractedUrl(url);
        }
      }
    }
    
    return originalXhrOpen.call(this, method, url, ...rest);
  };
  
  // Override the send method to check response types
  XMLHttpRequest.prototype.send = function(...args) {
    // Add a load event listener to check the response
    this.addEventListener('load', function() {
      const contentType = this.getResponseHeader('Content-Type');
      
      // If this is video content and we haven't already captured the URL
      if (contentType && 
          (contentType.includes('video/') || 
           contentType.includes('application/octet-stream')) &&
          this._requestUrl &&
          !extractedUrls.has(this._requestUrl)) {
        extractedUrls.add(this._requestUrl);
        sendExtractedUrl(this._requestUrl);
      }
    });
    
    return originalXhrSend.apply(this, args);
  };
}

// Also intercept fetch requests
function setupFetchInterceptor() {
  const originalFetch = window.fetch;
  
  window.fetch = function(resource, init) {
    // Check if the resource is a string URL
    if (typeof resource === 'string') {
      // Look for video content in the URL
      if (resource.includes('videoplayback?expire=') || 
          resource.includes('m=vwb/') ||
          resource.includes('vid/') ||
          (resource.includes('.mp4') && !resource.includes('.css'))) {
        // This looks like a video URL
        if (!extractedUrls.has(resource)) {
          extractedUrls.add(resource);
          sendExtractedUrl(resource);
        }
      }
    }
    
    return originalFetch.apply(this, arguments);
  };
}

// Function to extract embedded video sources from the page content
function extractVideoSourcesFromDom() {
  // Find video elements
  const videoElements = document.querySelectorAll('video');
  videoElements.forEach(video => {
    if (video.src && !extractedUrls.has(video.src)) {
      extractedUrls.add(video.src);
      sendExtractedUrl(video.src);
    }
    
    // Check for source elements inside video
    const sources = video.querySelectorAll('source');
    sources.forEach(source => {
      if (source.src && !extractedUrls.has(source.src)) {
        extractedUrls.add(source.src);
        sendExtractedUrl(source.src);
      }
    });
  });
  
  // Find iframes that might contain videos
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    // Try to access iframe content if same-origin
    try {
      if (iframe.contentDocument) {
        const iframeVideos = iframe.contentDocument.querySelectorAll('video');
        iframeVideos.forEach(video => {
          if (video.src && !extractedUrls.has(video.src)) {
            extractedUrls.add(video.src);
            sendExtractedUrl(video.src);
          }
        });
      }
    } catch (e) {
      // Cross-origin iframe, can't access content
    }
  });
  
  // Look for embed tags
  const embeds = document.querySelectorAll('embed');
  embeds.forEach(embed => {
    if (embed.src && !extractedUrls.has(embed.src)) {
      extractedUrls.add(embed.src);
      sendExtractedUrl(embed.src);
    }
  });
}

// Function to extract URLs from video player script variables
function extractFromPlayerScripts() {
  // Look for specific script patterns used by many video players
  const scripts = document.querySelectorAll('script');
  scripts.forEach(script => {
    const content = script.textContent || '';
    
    // Look for URL patterns in script content
    const urlMatches = content.match(/(https?:\/\/[^"']+\.(mp4|webm|m3u8)[^"']*)/g);
    if (urlMatches) {
      urlMatches.forEach(url => {
        if (!extractedUrls.has(url)) {
          extractedUrls.add(url);
          sendExtractedUrl(url);
        }
      });
    }
    
    // Look for player configuration objects that might contain URLs
    if (content.includes('player') && 
        (content.includes('source') || content.includes('src') || content.includes('url'))) {
      // This might contain player configuration
      console.log('[AnimeiL-TV Extractor] Potential player script found, check console for details');
    }
  });
}

// Initialize the interceptors
function initExtractor() {
  console.log('[AnimeiL-TV Extractor] Initializing video URL extractor');
  
  // Set up network request interceptors
  setupXhrInterceptor();
  setupFetchInterceptor();
  
  // Perform initial DOM scan
  setTimeout(() => {
    extractVideoSourcesFromDom();
    extractFromPlayerScripts();
  }, 2000);
  
  // Periodically check for new video elements
  setInterval(() => {
    extractVideoSourcesFromDom();
  }, 5000);
  
  // Listen for page changes
  const observer = new MutationObserver(() => {
    extractVideoSourcesFromDom();
  });
  
  // Start observing the document body for DOM changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Listen for messages from our application
  window.addEventListener('message', (event) => {
    // Make sure the message is from our application
    if (event.data && event.data.type === 'extract-video-url') {
      // Extract and send all URLs found so far
      extractedUrls.forEach(url => {
        sendExtractedUrl(url);
      });
      
      // Force a new search
      extractVideoSourcesFromDom();
      extractFromPlayerScripts();
    }
  });
}

// Auto-initialize when the script loads
initExtractor(); 