'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface RecommendationContextType {
  refreshRecommendations: () => void;
  isLoading: boolean;
  error: string | null;
}

const RecommendationContext = createContext<RecommendationContextType | undefined>(undefined);

export function RecommendationProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRecommendations = useCallback(() => {
    setIsLoading(true);
    setError(null);

    // Simulate async operation
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, []);

  return (
    <RecommendationContext.Provider
      value={{
        refreshRecommendations,
        isLoading,
        error,
      }}
    >
      {children}
    </RecommendationContext.Provider>
  );
}

export function useRecommendation() {
  const context = useContext(RecommendationContext);
  if (context === undefined) {
    throw new Error('useRecommendation must be used within a RecommendationProvider');
  }
  return context;
}
