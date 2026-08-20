'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseExitIntentOptions {
  threshold?: number; // pixels from top to trigger (default: 0)
  delay?: number; // ms delay before hook activates (default: 5000)
  cookieKey?: string; // sessionStorage key to prevent re-showing
}

export function useExitIntent(options: UseExitIntentOptions = {}) {
  const { threshold = 0, delay = 5000, cookieKey = 'exit-intent-shown' } = options;
  const [showExitIntent, setShowExitIntent] = useState(false);
  const rafId = useRef(0);
  const triggered = useRef(false);

  const dismiss = useCallback(() => {
    setShowExitIntent(false);
    try {
      sessionStorage.setItem(cookieKey, 'true');
    } catch {
      // sessionStorage may not be available
    }
  }, [cookieKey]);

  useEffect(() => {
    // Don't show if already shown this session
    try {
      if (sessionStorage.getItem(cookieKey)) return;
    } catch {
      // sessionStorage may not be available
    }

    let active = false;
    const timer = setTimeout(() => {
      active = true;
    }, delay);

    const trigger = () => {
      if (!active || triggered.current) return;
      triggered.current = true;
      setShowExitIntent(true);
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (!active) return;
      if (e.clientY <= threshold) {
        trigger();
      }
    };

    // Mobile: trigger on visibility change (tab/app switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trigger();
      }
    };

    // Mobile: rapid scroll-up detection
    let lastScrollY = 0;
    let lastScrollTime = 0;

    const handleScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const now = Date.now();
        const currentY = window.scrollY;
        const timeDelta = now - lastScrollTime;
        const scrollDelta = lastScrollY - currentY; // positive = scrolling up

        if (
          timeDelta < 300 &&
          scrollDelta > 300 &&
          currentY > 600
        ) {
          trigger();
        }

        lastScrollY = currentY;
        lastScrollTime = now;
      });
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId.current);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold, delay, cookieKey]);

  return { showExitIntent, dismiss };
}
