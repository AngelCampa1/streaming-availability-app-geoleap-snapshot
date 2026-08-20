'use client';

import { PreferencesDashboard } from '@/components/preferences';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useState } from 'react';

// Create a query client for this page
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
      },
    },
  });

export default function PreferencesPage() {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div className="container mx-auto py-6 px-4">
          <PreferencesDashboard />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
