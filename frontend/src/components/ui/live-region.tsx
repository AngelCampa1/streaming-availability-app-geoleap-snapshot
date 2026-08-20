import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface LiveRegionProps {
  /**
   * The message to announce to screen readers
   */
  message: string;

  /**
   * The politeness setting for the live region
   * - 'polite': Waits for a pause in speech (default, recommended for most cases)
   * - 'assertive': Interrupts current speech (use sparingly, for urgent messages)
   * - 'off': No announcement
   */
  politeness?: 'polite' | 'assertive' | 'off';

  /**
   * Whether the message is atomic (announced as a whole)
   * Default: true
   */
  atomic?: boolean;

  /**
   * Whether to show the message visually (for debugging)
   * Default: false (screen reader only)
   */
  visible?: boolean;

  /**
   * Clear the message after a delay (in milliseconds)
   * Useful for temporary notifications
   */
  clearAfter?: number;

  className?: string;
}

/**
 * ARIA Live Region component for announcing dynamic content changes to screen readers
 * UI-055: ARIA live regions for dynamic updates
 *
 * Use cases:
 * - Form validation errors
 * - Loading states
 * - Success/error notifications
 * - Real-time updates
 * - Dynamic content changes
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  atomic = true,
  visible = false,
  clearAfter,
  className,
}: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clearAfter && message) {
      const timer = setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = '';
        }
      }, clearAfter);

      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  if (!message) return null;

  return (
    <div
      ref={regionRef}
      role={politeness === 'off' ? undefined : 'status'}
      aria-live={politeness}
      aria-atomic={atomic}
      className={cn(visible ? 'block' : 'sr-only', className)}
    >
      {message}
    </div>
  );
}

/**
 * Hook to manage live region announcements
 */
export function useLiveRegion() {
  const [message, setMessage] = React.useState('');
  const [politeness, setPoliteness] = React.useState<'polite' | 'assertive' | 'off'>('polite');

  const announce = React.useCallback((text: string, level: 'polite' | 'assertive' | 'off' = 'polite') => {
    setPoliteness(level);
    setMessage(text);
  }, []);

  const clear = React.useCallback(() => {
    setMessage('');
  }, []);

  return {
    message,
    politeness,
    announce,
    clear,
    LiveRegionComponent: () => <LiveRegion message={message} politeness={politeness} />,
  };
}

/**
 * Specialized live region for loading states
 */
export function LoadingLiveRegion({
  isLoading,
  loadingMessage = 'Loading...',
  successMessage,
  errorMessage,
}: {
  isLoading: boolean;
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
}) {
  const [message, setMessage] = React.useState('');
  const prevLoadingRef = useRef(isLoading);

  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isLoading;

    if (isLoading && !wasLoading) {
      setMessage(loadingMessage);
    } else if (!isLoading && wasLoading) {
      if (errorMessage) {
        setMessage(errorMessage);
      } else if (successMessage) {
        setMessage(successMessage);
      } else {
        setMessage('Content loaded');
      }
    }
  }, [isLoading, loadingMessage, successMessage, errorMessage]);

  return <LiveRegion message={message} politeness={errorMessage ? 'assertive' : 'polite'} clearAfter={3000} />;
}

/**
 * Specialized live region for form validation
 */
export function FormLiveRegion({ errors, successMessage }: { errors?: string[]; successMessage?: string }) {
  const errorMessage =
    errors && errors.length > 0
      ? `${errors.length} error${errors.length > 1 ? 's' : ''} found: ${errors.join(', ')}`
      : '';

  const message = errorMessage || successMessage || '';

  return <LiveRegion message={message} politeness={errorMessage ? 'assertive' : 'polite'} clearAfter={5000} />;
}

/**
 * Specialized live region for real-time updates
 */
export function RealTimeUpdateLiveRegion({ count, itemType = 'item' }: { count: number; itemType?: string }) {
  const prevCountRef = useRef(count);
  const [message, setMessage] = React.useState('');

  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = count;

    if (count > prevCount) {
      const diff = count - prevCount;
      setMessage(`${diff} new ${itemType}${diff > 1 ? 's' : ''}`);
    }
  }, [count, itemType]);

  return <LiveRegion message={message} politeness="polite" clearAfter={3000} />;
}
