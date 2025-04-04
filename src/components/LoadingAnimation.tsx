import React, { useEffect, useState } from 'react';
import '../styles/loadingAnimation.css';

interface LoadingAnimationProps {
  onAnimationComplete?: () => void;
}

export function LoadingAnimation({ onAnimationComplete }: LoadingAnimationProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  
  useEffect(() => {
    // Start fading out after 2 seconds (when the main animation finishes)
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);
    
    // Hide the animation completely after fade-out (500ms after fade starts)
    const hideTimer = setTimeout(() => {
      setVisible(false);
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 2500);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [onAnimationComplete]);
  
  if (!visible) return null;
  
  return (
    <div className={`loading-container ${fadeOut ? 'fade-out' : ''}`}>
      <div className="logo">
        <h1 className="netflix-text">MOVIEMEET</h1>
        <div className="shine-overlay"></div>
      </div>
    </div>
  );
} 