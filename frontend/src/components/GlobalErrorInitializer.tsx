'use client';

import { useEffect } from 'react';
import { globalErrorHandler } from '@/lib/global-error-handler';

export function GlobalErrorInitializer() {
  useEffect(() => {
    // Initialize the global error handler
    globalErrorHandler.initialize();

    // Set up custom event listeners for error notifications
    const handleCriticalError = (event: CustomEvent) => {
      const { message, context } = event.detail;
      console.warn('Critical error notification:', message, context);

      // You could show a toast notification here
      // For now, we'll just log it
    };

    const handleApiError = (event: CustomEvent) => {
      const { message, isRetryable, supportContact, correlationId } = event.detail;
      console.warn('API error notification:', {
        message,
        isRetryable,
        supportContact,
        correlationId,
      });

      // You could show a toast notification here
      // For now, we'll just log it
    };

    // Listen for custom error events
    window.addEventListener('critical-error', handleCriticalError as EventListener);
    window.addEventListener('api-error', handleApiError as EventListener);

    // Cleanup function
    return () => {
      window.removeEventListener('critical-error', handleCriticalError as EventListener);
      window.removeEventListener('api-error', handleApiError as EventListener);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
