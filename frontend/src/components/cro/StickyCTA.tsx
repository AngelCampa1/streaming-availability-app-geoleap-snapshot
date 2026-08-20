'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/auth';
import { formatPremiumMonthlyEquivalent } from '@/lib/pricing';

interface StickyCTAProps {
  /** Text shown on the CTA button */
  ctaText?: string;
  /** Link target for the CTA */
  ctaHref?: string;
  /** Supporting text next to the CTA */
  message?: string;
  /** Scroll threshold in pixels before showing the bar */
  scrollThreshold?: number;
}

export function StickyCTA({
  ctaText,
  ctaHref,
  message = 'Find where to stream any show across 57 countries',
  scrollThreshold = 600,
}: StickyCTAProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const rafId = useRef(0);
  const { isAuthenticated, user } = useAuth();

  const isPremium = user?.roles?.includes(ROLES.PREMIUM) ?? false;

  const resolvedCtaText = ctaText ?? (isAuthenticated ? `Go Premium for about ${formatPremiumMonthlyEquivalent()}` : 'Sign Up Free');
  const resolvedCtaHref = ctaHref ?? (isAuthenticated ? '/upgrade' : '/auth/register');

  useEffect(() => {
    const handleScroll = () => {
      if (dismissed) return;
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setVisible(window.scrollY > scrollThreshold);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, [scrollThreshold, dismissed]);

  if (isPremium || dismissed || !visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm shadow-lg safe-area-bottom"
      role="complementary"
      aria-label="Call to action"
    >
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <p className="hidden text-sm text-foreground-muted sm:block">{message}</p>
        <div className="flex flex-1 items-center justify-end gap-3">
          <Button asChild size="sm" className="whitespace-nowrap">
            <Link href={resolvedCtaHref}>{resolvedCtaText}</Link>
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-full p-1 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default StickyCTA;
