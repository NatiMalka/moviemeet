import { sendCommandToIframe } from './externalUrlUtils';

/**
 * AnimeiLTV specific utilities for integration with MovieMeet
 */

/**
 * Detects if a video player is available within the AnimeiLTV iframe
 * @param iframe The iframe element containing AnimeiLTV content
 * @returns Promise that resolves to true if a video player is found
 */
export const detectAnimeiLTvPlayer = async (iframe: HTMLIFrameElement): Promise<boolean> => {
  if (!iframe) return false;
  
  const detectScript = `
    (function() {
      const videoElements = document.querySelectorAll('video');
      const iframeVideos = document.querySelectorAll('iframe');
      const playerElements = document.querySelectorAll('.video-player, .jwplayer, .plyr, .vjs-tech');
      
      return {
        hasVideo: videoElements.length > 0,
        hasPlayerElement: playerElements.length > 0,
        hasIframeVideos: iframeVideos.length > 0,
        totalPotentialPlayers: videoElements.length + playerElements.length + iframeVideos.length
      };
    })();
  `;
  
  try {
    const result = await sendCommandToIframe(iframe, detectScript);
    return result.hasVideo || result.hasPlayerElement || result.hasIframeVideos;
  } catch (err) {
    console.error('Error detecting AnimeiLTV player:', err);
    return false;
  }
};

/**
 * Attempt to auto-play content within AnimeiLTV iframe
 * @param iframe The iframe element containing AnimeiLTV content
 */
export const autoPlayAnimeiLTvContent = async (iframe: HTMLIFrameElement): Promise<boolean> => {
  if (!iframe) return false;
  
  const autoPlayScript = `
    (function() {
      // Try to find all possible play buttons
      const playButtons = [
        ...document.querySelectorAll('.play-button, .play-icon, button[title*="Play"], [aria-label*="Play"]'),
        ...document.querySelectorAll('button:has(svg[name*="play"]), button:has(i[class*="play"])')
      ];
      
      // Try to find video elements to play directly
      const videoElements = document.querySelectorAll('video');
      
      let played = false;
      
      // Try clicking play buttons
      if (playButtons.length > 0) {
        playButtons.forEach(button => {
          try {
            button.click();
            played = true;
          } catch (e) {
            // Ignore failures on individual buttons
          }
        });
      }
      
      // Try playing video elements directly
      if (videoElements.length > 0 && !played) {
        videoElements.forEach(video => {
          try {
            video.play();
            played = true;
          } catch (e) {
            // Ignore failures on individual videos
          }
        });
      }
      
      return played;
    })();
  `;
  
  try {
    return await sendCommandToIframe(iframe, autoPlayScript);
  } catch (err) {
    console.error('Error auto-playing AnimeiLTV content:', err);
    return false;
  }
};

/**
 * Optimize the AnimeiLTV viewing experience
 * @param iframe The iframe element containing AnimeiLTV content
 */
export const optimizeAnimeiLTvViewing = async (iframe: HTMLIFrameElement): Promise<void> => {
  if (!iframe) return;
  
  const optimizeScript = `
    (function() {
      // Remove unwanted elements
      const elementsToRemove = [
        '.ads', '.ad-container', '#ads', '[class*="banner"]',
        '.popup', '.overlay:not(.video-overlay)', '.cookie-notice',
        'header:not(.video-header)', '.sidebar:not(.video-sidebar)',
        '.newsletter', '.subscription-popup',
        '.social-share:not(.video-social)', '.footer:not(.video-footer)'
      ];
      
      elementsToRemove.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            el.style.display = 'none';
          });
        } catch (e) {
          // Ignore individual selector failures
        }
      });
      
      // Maximize video player size if found
      const videoContainers = [
        '.video-container', '.player-container', '.plyr', 
        '.jwplayer', '.video-wrapper', '.embed-responsive',
        'video'
      ];
      
      let playerFound = false;
      
      videoContainers.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.maxWidth = '100vw';
            el.style.maxHeight = '100vh';
            el.style.position = 'relative';
            el.style.zIndex = '999';
            playerFound = true;
          });
        } catch (e) {
          // Ignore individual selector failures
        }
      });
      
      // Make sure the body allows proper sizing
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      
      // Return success status
      return { 
        optimized: true,
        playerFound
      };
    })();
  `;
  
  try {
    await sendCommandToIframe(iframe, optimizeScript);
  } catch (err) {
    console.error('Error optimizing AnimeiLTV viewing:', err);
  }
};

/**
 * Extract metadata from AnimeiLTV page
 * @param iframe The iframe element containing AnimeiLTV content
 * @returns Promise with extracted metadata
 */
export const extractAnimeiLTvMetadata = async (iframe: HTMLIFrameElement): Promise<{
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: number;
  episodes?: number;
}> => {
  if (!iframe) return {};
  
  const extractScript = `
    (function() {
      // Try to find title
      const title = document.querySelector('h1, .title, .video-title, meta[property="og:title"]')?.textContent || 
                   document.title.split('|')[0].trim();
      
      // Try to find description
      const description = document.querySelector('.description, meta[property="og:description"]')?.textContent || 
                         document.querySelector('p.summary, .synopsis, .plot')?.textContent;
      
      // Try to find thumbnail
      const thumbnailUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                          document.querySelector('.poster img, .thumbnail img')?.getAttribute('src');
      
      // Try to find duration
      let duration;
      const durationElem = document.querySelector('.duration, .length, [data-duration], .time');
      if (durationElem) {
        const durationText = durationElem.textContent;
        // Parse something like "1h 30m" or "90 min" to minutes
        if (durationText.includes('h')) {
          const hours = parseInt(durationText.split('h')[0].trim()) || 0;
          const minMatch = durationText.split('h')[1].match(/\\d+/);
          const minutes = minMatch ? parseInt(minMatch[0]) : 0;
          duration = hours * 60 + minutes;
        } else if (durationText.includes('min')) {
          const minMatch = durationText.match(/\\d+/);
          duration = minMatch ? parseInt(minMatch[0]) : null;
        }
      }
      
      // Try to find episode count
      let episodes;
      const episodeElem = document.querySelector('.episodes, .episode-count, [data-episodes]');
      if (episodeElem) {
        const episodeMatch = episodeElem.textContent.match(/\\d+/);
        episodes = episodeMatch ? parseInt(episodeMatch[0]) : null;
      }
      
      return { title, description, thumbnailUrl, duration, episodes };
    })();
  `;
  
  try {
    return await sendCommandToIframe(iframe, extractScript);
  } catch (err) {
    console.error('Error extracting AnimeiLTV metadata:', err);
    return {};
  }
};

/**
 * Monitor AnimeiLTV player events
 * @param iframe The iframe element containing AnimeiLTV content
 * @param onPlay Callback for play events
 * @param onPause Callback for pause events
 * @param onTimeUpdate Callback for time update events
 */
export const monitorAnimeiLTvPlayerEvents = async (
  iframe: HTMLIFrameElement,
  onPlay?: () => void,
  onPause?: () => void,
  onTimeUpdate?: (currentTime: number) => void
): Promise<() => void> => {
  if (!iframe) return () => {};
  
  const setupMonitoringScript = `
    (function() {
      // Already setup monitoring
      if (window.__animeilTvMonitoring) return true;
      
      // Find video player
      const videoElements = document.querySelectorAll('video');
      if (videoElements.length === 0) return false;
      
      // Setup event listeners
      videoElements.forEach(video => {
        video.addEventListener('play', function() {
          window.parent.postMessage({type: 'animeil-play'}, '*');
        });
        
        video.addEventListener('pause', function() {
          window.parent.postMessage({type: 'animeil-pause'}, '*');
        });
        
        video.addEventListener('timeupdate', function() {
          window.parent.postMessage({
            type: 'animeil-timeupdate',
            currentTime: video.currentTime,
            duration: video.duration
          }, '*');
        });
      });
      
      window.__animeilTvMonitoring = true;
      return true;
    })();
  `;
  
  try {
    const result = await sendCommandToIframe(iframe, setupMonitoringScript);
    
    if (!result) return () => {};
    
    // Set up message event listener
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      
      switch (event.data.type) {
        case 'animeil-play':
          onPlay?.();
          break;
        case 'animeil-pause':
          onPause?.();
          break;
        case 'animeil-timeupdate':
          if (typeof event.data.currentTime === 'number') {
            onTimeUpdate?.(event.data.currentTime);
          }
          break;
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  } catch (err) {
    console.error('Error setting up AnimeiLTV player monitoring:', err);
    return () => {};
  }
}; 