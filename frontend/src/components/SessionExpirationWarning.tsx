'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export function SessionExpirationWarning() {
  const { sessionExpiring, extendSession, logout } = useAuth();
  const [countdown, setCountdown] = useState(120); // 2 minutes

  useEffect(() => {
    if (sessionExpiring) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            logout(); // Auto-logout when countdown reaches 0
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCountdown(120); // Reset countdown
    }
  }, [sessionExpiring, logout]);

  if (!sessionExpiring) {
    return null;
  }

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-warning text-warning-foreground p-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="font-medium">
            Your session will expire in {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={extendSession}
            className="bg-background text-foreground px-4 py-2 rounded-full font-medium hover:bg-muted transition-colors"
          >
            Extend Session
          </button>
          <button
            onClick={logout}
            className="text-warning-foreground border border-current px-4 py-2 rounded-full font-medium hover:bg-background hover:text-foreground transition-colors"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}
