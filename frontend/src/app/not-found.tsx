import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';
import { NotFoundGoBack } from './NotFoundGoBack';

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: false },
};

/**
 * Custom 404 Not Found Page
 * This is a standalone component to ensure it renders correctly in Next.js standalone builds
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-6">
            <Link href="/" className="inline-block">
              <Image
                src="/logo-transparent.png"
                alt="GeoLeap Logo"
                width={80}
                height={80}
                className="mx-auto"
                priority
              />
            </Link>
          </div>

          {/* 404 Visual */}
          <div className="mb-8">
            <div className="text-9xl font-bold text-muted-foreground/40 mb-4">404</div>
            <svg
              className="w-24 h-24 mx-auto text-muted-foreground/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-4">Page Not Found</h1>

          <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or deleted.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/">
                <Home className="w-5 h-5 mr-2" />
                Go to Homepage
              </Link>
            </Button>

            <NotFoundGoBack />
          </div>

          <div className="mt-12 text-sm text-muted-foreground">
            <p>Looking for something specific?</p>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <Link href="/search" className="hover:text-primary transition-colors inline-flex items-center gap-1">
                <Search className="w-4 h-4" />
                Search
              </Link>
              <Link href="/platforms" className="hover:text-primary transition-colors">
                Platforms
              </Link>
              <Link href="/countries" className="hover:text-primary transition-colors">
                Countries
              </Link>
              <Link href="/compare" className="hover:text-primary transition-colors">
                Compare
              </Link>
              <Link href="/blog" className="hover:text-primary transition-colors">
                Blog
              </Link>
            </div>
          </div>

          {/* Branding footer */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground">
              GeoLeap - Find where to stream your favorite content
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
