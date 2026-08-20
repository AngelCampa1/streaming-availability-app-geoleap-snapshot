'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bookmark,
  Search,
  Play,
  Globe,
  Calendar,
  Star,
  Trash2,
  AlertCircle,
  Filter,
  Grid,
  List,
  RefreshCw,
  Heart,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface WatchlistItem {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'documentary';
  year?: number;
  genres: string[];
  rating?: number;
  poster?: string;
  description?: string;
  savedAt: string;
  availabilityData: {
    totalCountries: number;
    freeCountries: number;
    subscriptionCountries: number;
    topServices: { name: string; countries: number }[];
  };
  lastChecked?: string;
  isAvailabilityStale?: boolean;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'recently_added' | 'title' | 'year' | 'rating' | 'availability';

export default function WatchlistPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv' | 'documentary'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recently_added');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const loadWatchlist = useCallback(async () => {
    try {
      setLoading(true);
      // Auth is verified by useEffect before this function is called

      const response = await fetch('/api/watchlist', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load watchlist');
      }

      const data = await response.json();
      setWatchlist(data.items || []);
      logger.info('Watchlist loaded successfully', { count: data.items?.length || 0 });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load watchlist';
      setError(errorMessage);
      logger.error('Watchlist loading failed', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wait for auth check to complete before making auth decisions
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    loadWatchlist();
  }, [authLoading, isAuthenticated, router, loadWatchlist]);

  const handleRemoveFromWatchlist = async (itemId: string) => {
    try {
      const response = await fetch(`/api/watchlist/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setWatchlist(prev => prev.filter(item => item.id !== itemId));
        logger.info('Item removed from watchlist', { itemId });
      }
    } catch (err) {
      logger.error('Failed to remove item from watchlist', { error: err, itemId });
    }
  };

  const handleRefreshAvailability = async (itemId: string) => {
    try {
      const response = await fetch(`/api/watchlist/${itemId}/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setWatchlist(prev => prev.map(item => (item.id === itemId ? updatedItem : item)));
        logger.info('Availability refreshed', { itemId });
      }
    } catch (err) {
      logger.error('Failed to refresh availability', { error: err, itemId });
    }
  };

  const filteredAndSortedWatchlist = watchlist
    .filter(item => {
      const matchesSearch =
        searchFilter === '' ||
        item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.genres.some(genre => genre.toLowerCase().includes(searchFilter.toLowerCase()));

      const matchesType = typeFilter === 'all' || item.type === typeFilter;

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'year':
          return (b.year || 0) - (a.year || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'availability':
          return b.availabilityData.totalCountries - a.availabilityData.totalCountries;
        case 'recently_added':
        default:
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
      }
    });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bookmark className="h-8 w-8 text-primary" />
              My Watchlist
            </h1>
            <p className="text-muted-foreground mt-1">
              {watchlist.length} saved {watchlist.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={loadWatchlist} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-full"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-full"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters and Sort */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search your watchlist..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
                  className="px-3 py-2 border border-input rounded-md text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="movie">Movies</option>
                  <option value="tv">TV Shows</option>
                  <option value="documentary">Documentaries</option>
                </select>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortBy)}
                  className="px-3 py-2 border border-input rounded-md text-sm"
                >
                  <option value="recently_added">Recently Added</option>
                  <option value="title">Title</option>
                  <option value="year">Year</option>
                  <option value="rating">Rating</option>
                  <option value="availability">Availability</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Watchlist Items */}
        {filteredAndSortedWatchlist.length > 0 ? (
          <div
            className={
              viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'
            }
          >
            {filteredAndSortedWatchlist.map(item => (
              <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                {viewMode === 'grid' ? (
                  <CardContent className="p-0">
                    <div className="aspect-[2/3] relative overflow-hidden rounded-t-lg">
                      {item.poster ? (
                        <Image
                          src={item.poster}
                          alt={`${item.title} poster`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Play className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}

                      {item.isAvailabilityStale && (
                        <div className="absolute top-2 right-2">
                          <Button
                            size="sm"
                            onClick={() => handleRefreshAvailability(item.id)}
                            className="bg-warning hover:bg-warning/90 text-white"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                          {item.year && (
                            <Badge variant="outline" className="text-xs">
                              {item.year}
                            </Badge>
                          )}
                          {item.rating && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {item.rating.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Available in {item.availabilityData.totalCountries} countries</span>
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {item.availabilityData.freeCountries} free
                          </span>
                        </div>

                        {item.availabilityData.topServices.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.availabilityData.topServices.slice(0, 2).map((service, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {service.name}
                              </Badge>
                            ))}
                            {item.availabilityData.topServices.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{item.availabilityData.topServices.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" asChild>
                          <Link href={`/search?q=${encodeURIComponent(item.title)}`}>
                            <Search className="h-3 w-3 mr-1" />
                            Find
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveFromWatchlist(item.id)}
                          className="text-error hover:text-error/90"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-28 flex-shrink-0 relative">
                        {item.poster ? (
                          <Image
                            src={item.poster}
                            alt={`${item.title} poster`}
                            fill
                            className="object-cover rounded"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                            <Play className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg">{item.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{item.type}</Badge>
                            {item.year && <Badge variant="outline">{item.year}</Badge>}
                            {item.rating && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {item.rating.toFixed(1)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {item.genres.slice(0, 3).map(genre => (
                            <Badge key={genre} variant="secondary" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Globe className="h-4 w-4" />
                              {item.availabilityData.totalCountries} countries
                            </span>
                            <span>{item.availabilityData.freeCountries} free</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Added {new Date(item.savedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button size="sm" asChild>
                          <Link href={`/search?q=${encodeURIComponent(item.title)}`}>
                            <Search className="h-4 w-4 mr-2" />
                            Find
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveFromWatchlist(item.id)}
                          className="text-error hover:text-error/90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              {searchFilter || typeFilter !== 'all' ? (
                <>
                  <Filter className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No matching items found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your filters or search term</p>
                  <Button
                    onClick={() => {
                      setSearchFilter('');
                      setTypeFilter('all');
                    }}
                    variant="outline"
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <Bookmark className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Your watchlist is empty</h3>
                  <p className="text-muted-foreground mb-4">
                    Start searching for movies and TV shows to add them to your watchlist
                  </p>
                  <Button asChild>
                    <Link href="/search">
                      <Search className="h-4 w-4 mr-2" />
                      Discover Content
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        {watchlist.length > 0 && (
          <Card className="bg-success/10 border-success/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/20">
                  <Heart className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-success mb-2">Watchlist Tips</h3>
                  <ul className="space-y-1 text-sm text-success/90">
                    <li>• Get notified when your saved content becomes available on new services</li>
                    <li>• Use different view modes to browse your collection</li>
                    <li>• Sort by availability to find content you can watch right now</li>
                    <li>• Refresh availability data if it seems outdated</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
