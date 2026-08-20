/**
 * Search Page Loading Skeleton (BUG-003 fix)
 *
 * This Server Component renders immediately, dramatically improving TTFB.
 * Next.js automatically streams this loading state while the client component loads.
 */

export default function SearchPageLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="bg-surface shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 sm:py-6">
            {/* Title Row */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
              <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
            </div>

            {/* Search Input Skeleton */}
            <div className="mb-3 sm:mb-4">
              <div className="w-full h-12 bg-muted animate-pulse rounded-lg" />
            </div>

            {/* Filter Controls Skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                <div className="h-8 w-24 bg-muted animate-pulse rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:block h-10 w-32 bg-muted animate-pulse rounded" />
                <div className="lg:hidden h-10 w-10 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Desktop Filter Sidebar Skeleton */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="w-full h-96 bg-muted animate-pulse rounded-lg" />
          </div>

          {/* Results Grid Skeleton */}
          <div className="lg:col-span-3">
            {/* Results Header Skeleton */}
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
              <div className="hidden sm:flex gap-2">
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              </div>
            </div>

            {/* Results Cards Skeleton - 6 cards for initial view */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg overflow-hidden shadow-sm">
                  <div className="aspect-[2/3] bg-muted animate-pulse" />
                  <div className="p-3">
                    <div className="h-4 w-full bg-muted animate-pulse rounded mb-2" />
                    <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
