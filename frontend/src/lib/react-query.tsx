'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface ReactQueryProviderProps {
  children: ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time - how long data is considered fresh
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Cache time - how long data stays in cache when unused
            gcTime: 10 * 60 * 1000, // 10 minutes (reduced from infinite)
            // Retry failed requests up to 3 times
            retry: 3,
            // Retry delay with exponential backoff
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Don't refetch on window focus in most cases
            refetchOnWindowFocus: false,
            // Don't refetch on mount if data is fresh
            refetchOnMount: true,
            // Refetch on reconnect
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry mutations once
            retry: 1,
          },
        },
        // Limit cache size to prevent unbounded growth
        queryCache: undefined, // Use default cache with automatic garbage collection
        mutationCache: undefined,
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
