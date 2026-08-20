'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import MainNavigation from '@/components/navigation/MainNavigation';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import SkipLinks from '@/components/accessibility/SkipLinks';
import { Footer } from '@/components/layout/Footer';
import { usePathname } from 'next/navigation';

const ExitIntentPopup = dynamic(
  () => import('@/components/cro/ExitIntentPopup').then((mod) => ({ default: mod.ExitIntentPopup })),
  { ssr: false }
);

interface AppLayoutProps {
  children: ReactNode;
  showBreadcrumbs?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

// Pages that don't need navigation
const NO_NAV_PAGES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
];

// Pages that don't need breadcrumbs
const NO_BREADCRUMB_PAGES = ['/', '/dashboard', '/search', '/pricing', '/admin', ...NO_NAV_PAGES];

const containerClasses = {
  sm: 'container max-w-3xl mx-auto px-4 sm:px-6 lg:px-8',
  md: 'container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
  lg: 'container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8',
  xl: 'container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  '2xl': 'container mx-auto px-4 sm:px-6 lg:px-8',
  full: 'w-full px-4 sm:px-6 lg:px-8',
};

export default function AppLayout({
  children,
  showBreadcrumbs = true,
  maxWidth = 'xl',
  className = '',
}: AppLayoutProps) {
  const pathname = usePathname();

  const shouldShowNavigation = !NO_NAV_PAGES.includes(pathname);
  const shouldShowBreadcrumbs = showBreadcrumbs && !NO_BREADCRUMB_PAGES.includes(pathname) && shouldShowNavigation;

  return (
    <div className="min-h-screen bg-background">
      <SkipLinks />
      {shouldShowNavigation && <MainNavigation />}

      <main className={className} role="main" tabIndex={-1}>
        {shouldShowBreadcrumbs && (
          <div className={containerClasses[maxWidth]}>
            <div className="py-4">
              <Breadcrumbs />
            </div>
          </div>
        )}

        <div className={containerClasses[maxWidth]}>
          {children}
        </div>
      </main>

      {shouldShowNavigation && <Footer />}
      <ExitIntentPopup />
    </div>
  );
}
