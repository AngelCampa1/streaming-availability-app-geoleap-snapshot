// Watchlist Page - Main Entry Point
// BUG FIX: Added authentication check and proper error handling

'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WatchlistDashboard } from '@/components/watchlist/WatchlistDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
    },
  },
});

function WatchlistContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // BUG FIX: Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/watchlist');
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // BUG FIX: Show auth required message while redirecting
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center max-w-md mx-auto p-6">
          <Lock className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to access your watchlist and manage your favorite movies and TV shows.
          </p>
          <button
            onClick={() => router.push('/auth/login?redirect=/watchlist')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout maxWidth="full" showBreadcrumbs={false}>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <WatchlistDashboard />
      </div>
    </AppLayout>
  );
}

export default function WatchlistPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <WatchlistContent />
    </QueryClientProvider>
  );
}
