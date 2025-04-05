/**
 * This module provides functions to handle and validate external URLs
 * such as those from AnimeiL-TV.
 */

/**
 * Validates if a URL is from AnimeiL-TV by checking the domain
 * 
 * @param url The URL to validate
 * @returns True if it's an AnimeiL-TV URL, false otherwise
 */
export function isAnimeiLTvUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'www.animeil-tv.com' || 
           parsedUrl.hostname === 'animeil-tv.com';
  } catch (error) {
    return false;
  }
}

/**
 * Prepares a URL for embedding if necessary
 * Some sites might need URL modifications to be embedded
 * 
 * @param url The original URL
 * @returns The URL ready for embedding
 */
export function prepareUrlForEmbedding(url: string): string {
  if (!url) return '';
  
  try {
    // Parse the URL to handle it properly
    const parsedUrl = new URL(url);
    
    // Example: For AnimeiL-TV, we might need to append parameters
    // or modify the URL in some way for proper embedding
    if (isAnimeiLTvUrl(url)) {
      // Based on the network analysis, we need to use the embed URL format
      if (!url.includes('/embed/') && url.includes('/watch/')) {
        // Convert /watch/ URLs to /embed/ format
        return url.replace('/watch/', '/embed/');
      }
      
      // Make sure embed parameter is present
      if (!parsedUrl.searchParams.has('embed')) {
        parsedUrl.searchParams.append('embed', 'true');
      }
      
      return parsedUrl.toString();
    }
    
    // Add more site-specific logic here as needed
    
    // If no special handling is needed, return the original URL
    return url;
  } catch (error) {
    console.error('Error preparing URL for embedding:', error);
    return url; // Return the original URL if there's an error
  }
}

/**
 * Extracts video ID or other identifier from an external URL
 * Useful if we need to generate special embedding code
 * 
 * @param url The external URL
 * @returns The extracted ID or null if not applicable
 */
export function extractVideoIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    // Logic for AnimeiL-TV
    if (isAnimeiLTvUrl(url)) {
      // Example pattern: Extract video ID from paths like /watch/123456
      const watchMatches = url.match(/\/watch\/([^\/\?#]+)/);
      if (watchMatches && watchMatches[1]) {
        return watchMatches[1];
      }
      
      // Also try to match /embed/ paths
      const embedMatches = url.match(/\/embed\/([^\/\?#]+)/);
      if (embedMatches && embedMatches[1]) {
        return embedMatches[1];
      }
    }
    
    // Add more site-specific extraction logic as needed
    
    return null;
  } catch (error) {
    console.error('Error extracting video ID:', error);
    return null;
  }
}

/**
 * Gets a thumbnail image URL for an external video
 * 
 * @param url The video URL
 * @returns A URL to use as thumbnail, or null if not available
 */
export function getExternalThumbnailUrl(url: string): string | null {
  if (!url) return null;
  
  // For AnimeiL-TV, you might need to implement a server-side approach
  // to get thumbnails, as direct access might be restricted
  
  return null; // Placeholder for future implementation
}

/**
 * Creates a custom user agent string for embedding
 * Some sites check user agent to determine if a request is from a mobile device
 * or specific browser, which can affect how content is displayed
 * 
 * @param type The type of user agent to use ('desktop', 'mobile', 'tablet')
 * @returns A user agent string
 */
export function getCustomUserAgent(type: 'desktop' | 'mobile' | 'tablet' = 'desktop'): string {
  switch (type) {
    case 'mobile':
      return 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1';
    case 'tablet':
      return 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1';
    case 'desktop':
    default:
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }
}

/**
 * Helper function to send commands to an iframe
 * This can be used to control the embedded content, like clicking elements
 * 
 * @param iframe The iframe element
 * @param script The script to execute in the iframe
 * @returns A promise that resolves when the command completes or fails
 */
export function sendCommandToIframe(iframe: HTMLIFrameElement, script: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!iframe || !iframe.contentWindow) {
      reject(new Error('Invalid iframe element'));
      return;
    }
    
    try {
      // Create a message channel to communicate with the iframe
      const channel = new MessageChannel();
      
      // Set up the listener for the response
      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };
      
      // Post the message to the iframe
      iframe.contentWindow.postMessage({
        type: 'execute-script',
        script
      }, '*', [channel.port2]);
      
      // Set a timeout in case the iframe doesn't respond
      setTimeout(() => {
        reject(new Error('Command timed out'));
      }, 5000);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Helper function to adjust iframe content display
 * This can be used to modify the styling of the embedded content
 * 
 * @param iframe The iframe element
 * @param adjustments CSS adjustments to apply
 */
export function adjustIframeContent(iframe: HTMLIFrameElement, adjustments: { [key: string]: string }): void {
  if (!iframe || !iframe.contentWindow) return;
  
  try {
    // Convert the adjustments object to a CSS string
    const cssAdjustments = Object.entries(adjustments)
      .map(([selector, css]) => `${selector} { ${css} }`)
      .join('\n');
    
    // Inject the CSS into the iframe
    const script = `
      (function() {
        const style = document.createElement('style');
        style.textContent = ${JSON.stringify(cssAdjustments)};
        document.head.appendChild(style);
        return true;
      })();
    `;
    
    // Send the command to the iframe
    sendCommandToIframe(iframe, script).catch(error => {
      console.error('Error adjusting iframe content:', error);
    });
  } catch (error) {
    console.error('Error creating adjustment script:', error);
  }
}

/**
 * Helper function to optimize embedded website viewing
 * Applies common optimizations for embedded websites
 * 
 * @param iframe The iframe element 
 * @param site Optional site-specific optimizations ('animeil-tv' or other known sites)
 */
export function optimizeEmbeddedViewing(iframe: HTMLIFrameElement, site?: string): void {
  if (!iframe) return;

  // Basic optimization for all sites
  try {
    // Common adjustments for all sites
    const commonAdjustments = {
      // Fix body
      'body': 'margin: 0 !important; width: 100% !important; height: 100% !important; overflow-x: hidden !important;',
      // Hide elements commonly causing issues in embeds
      '.cookie-banner, .cookie-consent, .cookie-notice, .cookie-alert, #cookie-notice': 'display: none !important;',
      '.ad, .ads, .advertisement, [class*="ad-"], [id*="ad-"], [class*="banner"], [id*="banner"]': 'display: none !important;',
      '.popup, .popover, .modal, .overlay, .notification:not(.video-notification)': 'display: none !important;',
      // Enhance readability
      '.container, .wrapper, .content': 'width: 100% !important; max-width: 100% !important; padding: 0 !important;',
    };

    // Apply common adjustments first
    adjustIframeContent(iframe, commonAdjustments);

    // Apply site-specific optimizations
    if (site) {
      switch (site.toLowerCase()) {
        case 'animeil-tv':
          // AnimeiL-TV specific CSS is handled in the animeilTvUtils.ts
          break;

        case 'vidsrc':
          adjustIframeContent(iframe, {
            '.plyr, .plyr__video-wrapper': 'height: 100% !important; max-height: 100vh !important;',
            'video': 'height: 100% !important; width: 100% !important;',
            '.sidebar, .header, .footer, .comments': 'display: none !important;',
          });
          break;

        case 'gomovies':
          adjustIframeContent(iframe, {
            '.video-content, .player-container': 'width: 100% !important; height: 100% !important;',
            '.header, .site-header, .navbar, .menu, .footer, .site-footer': 'display: none !important;',
          });
          break;

        case 'dramacool':
          adjustIframeContent(iframe, {
            '.video-content, .player-container': 'width: 100% !important; height: 100% !important;',
            '.header, .site-header, .navbar, .menu, .footer, .site-footer': 'display: none !important;',
          });
          break;

        default:
          // Apply general optimizations for video sites
          adjustIframeContent(iframe, {
            // Make video players larger
            'video, .video-player, .player, [class*="player"], [id*="player"]': 
              'width: 100% !important; height: 100% !important; max-height: 100vh !important;',
            // Hide navigation elements
            'nav, .nav, .navbar, .navigation, .menu, .header:not(.video-header), .footer:not(.player-footer)': 
              'display: none !important;',
          });
          break;
      }
    }

    // Enable smooth scrolling
    const smoothScrollScript = `
      document.documentElement.style.scrollBehavior = 'smooth';
    `;
    
    // Execute the script
    sendCommandToIframe(iframe, smoothScrollScript).catch(err => {
      console.error('Error applying smooth scroll:', err);
    });

  } catch (error) {
    console.error('Error optimizing embedded viewing:', error);
  }
} 