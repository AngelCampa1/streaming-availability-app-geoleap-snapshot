'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function BottomCTAButtons() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="mt-6 sm:mt-8 h-12 w-48 mx-auto rounded-xl animate-pulse bg-primary/10" />;
  }

  if (isAuthenticated) {
    return (
      <div className="mt-6 sm:mt-8">
        <Button asChild size="lg" className="touch-target min-h-12 text-base">
          <Link href="/search" className="flex items-center justify-center">
            Continue to Search
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 sm:mt-8 flex flex-col items-center gap-3 sm:gap-4 sm:flex-row sm:justify-center">
      <Button asChild size="lg" className="w-full sm:w-auto touch-target min-h-12 text-base">
        <Link href="/auth/register" className="flex items-center justify-center">
          Start Free Today
          <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="w-full sm:w-auto touch-target min-h-12 text-base">
        <Link href="/pricing" className="flex items-center justify-center">
          View Pricing
        </Link>
      </Button>
    </div>
  );
}
