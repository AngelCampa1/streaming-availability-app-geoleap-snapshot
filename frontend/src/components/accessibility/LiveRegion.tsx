'use client';

import { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  priority: 'polite' | 'assertive';
  clearAfterAnnouncement?: boolean;
  clearDelay?: number;
}

export default function LiveRegion({
  message,
  priority = 'polite',
  clearAfterAnnouncement = true,
  clearDelay = 1000,
}: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && regionRef.current) {
      regionRef.current.textContent = message;

      if (clearAfterAnnouncement) {
        const timer = setTimeout(() => {
          if (regionRef.current) {
            regionRef.current.textContent = '';
          }
        }, clearDelay);

        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfterAnnouncement, clearDelay]);

  return <div ref={regionRef} aria-live={priority} aria-atomic="true" className="sr-only" />;
}

// Hook for managing announcements
export function useAnnouncements() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Create a temporary live region for one-off announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.textContent = message;

    document.body.appendChild(liveRegion);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, 1000);
  };

  return { announce };
}
