'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export function FreePlanCTA() {
  const { isAuthenticated } = useAuth();
  return (
    <Link
      href={isAuthenticated ? '/search' : '/auth/register'}
      className="mt-8 block w-full rounded-full px-3 py-3 text-center text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      Start Free Searches
    </Link>
  );
}

export function PremiumPlanCTA({ variant }: { variant?: 'banner' }) {
  const { isAuthenticated } = useAuth();
  const href = isAuthenticated ? '/upgrade-annual=true' : '/auth/register-plan=annual';

  if (variant === 'banner') {
    return (
      <Link
        href={href}
        className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-primary bg-primary-foreground hover:bg-primary-foreground/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-foreground"
      >
        Try Premium Free
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="mt-8 block w-full rounded-full px-3 py-3 text-center text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      Try Premium Free for 30 Days
    </Link>
  );
}
