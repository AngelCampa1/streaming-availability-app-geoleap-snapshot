'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function HomeSearchInput() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const popularSearches = ['Breaking Bad', 'The Office', 'Squid Game', 'Friends'];

  return (
    <div className="mt-8 sm:mt-10 max-w-2xl mx-auto px-4 sm:px-0">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a movie or TV show..."
              className="w-full h-12 sm:h-14 pl-12 pr-4 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base sm:text-lg shadow-sm"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl text-base font-semibold"
          >
            Search
          </Button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-foreground-muted">Try:</span>
        {popularSearches.map((search) => (
          <button
            key={search}
            onClick={() => router.push(`/search?q=${encodeURIComponent(search)}`)}
            className="px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}
