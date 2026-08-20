'use client';

import { useSkipLinks } from '@/hooks/useKeyboardNavigation';

export default function SkipLinks() {
  const { skipToMain, skipToNavigation } = useSkipLinks();

  return (
    <div className="fixed top-0 left-0 z-[100] p-2 space-x-2">
      <button
        onClick={skipToMain}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 px-4 py-2 bg-primary text-primary-foreground rounded-full font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </button>
      <button
        onClick={skipToNavigation}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-48 px-4 py-2 bg-primary text-primary-foreground rounded-full font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to navigation
      </button>
    </div>
  );
}
