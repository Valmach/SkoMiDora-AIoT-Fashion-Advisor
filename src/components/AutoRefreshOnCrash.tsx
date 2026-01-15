'use client';

import { useEffect } from 'react';

export default function AutoRefreshOnCrash() {
  useEffect(() => {
    // Defines the error handler
    const handleError = (event: ErrorEvent) => {
      // Detects "Loading chunk" or "ChunkLoadError" specifically
      const isChunkError = event.message && (
        event.message.includes('Loading chunk') || 
        event.message.includes('ChunkLoadError') ||
        event.message.includes('minified react error')
      );

      if (isChunkError) {
        console.warn('⚠️ Version mismatch detected. Auto-repairing...');
        // Forces a hard reload from the server to get fresh files
        window.location.reload();
      }
    };

    // Activates the listener
    window.addEventListener('error', handleError);
    
    // Clean up on unmount
    return () => window.removeEventListener('error', handleError);
  }, []);

  return null; // This component is invisible
}