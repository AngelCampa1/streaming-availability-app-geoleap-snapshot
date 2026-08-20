'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  Globe,
  Play,
  Bookmark,
  Star,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import AppLayout from '@/components/layout/AppLayout';
import { buildContentPath } from '@/lib/search/content-navigation';

interface TrendingContent {
  id: string;
  title: string;
  type: 'movie' | 'tv';
  year?: number;
  popularity: number;
  rating?: number;
  availableCountries: number;
  availableServices: number;
  poster?: string;
  description?: string;
  genres?: string[];
}

export default function TrendingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [trendingContent, setTrendingContent] = useState<TrendingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'tv'>('all');

  useEffect(() => {
    // Wait for auth check to complete before making auth decisions
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const loadTrendingContent = async () => {
      const abortController = new AbortController();

      try {
        setLoading(true);
        // Auth is verified by useEffect, credentials include cookies

        const response = await fetch('/api/dashboard/trending?limit=20', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortController.signal,
        });

        if (response.ok) {
          const data = await response.json();
          setTrendingContent(data);
        } else {
          setError('Failed to load trending content');
        }

        logger.info('Trending content loaded successfully');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          logger.info('Trending content loading cancelled');
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to load trending content';
        setError(errorMessage);
        logger.error('Trending content loading failed', { error: errorMessage });
      } finally {
        setLoading(false);
      }

      return () => abortController.abort();
    };

    loadTrendingContent();
  }, [authLoading, isAuthenticated, router]);

  const filteredContent = trendingContent.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              Trending Now
            </h1>
            <p className="text-muted-foreground mt-1">
              Discover what&apos;s popular across streaming services worldwide
            </p>
          </div>
          <Button asChild className="min-h-[44px]">
            <Link href="/search">
              <Play className="h-5 w-5 mr-2" />
              Search Content
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
                className="min-h-[44px]"
              >
                All Content
              </Button>
              <Button
                variant={filterType === 'movie' ? 'default' : 'outline'}
                onClick={() => setFilterType('movie')}
                className="min-h-[44px]"
              >
                Movies
              </Button>
              <Button
                variant={filterType === 'tv' ? 'default' : 'outline'}
                onClick={() => setFilterType('tv')}
                className="min-h-[44px]"
              >
                TV Shows
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Trending Content Grid */}
        {filteredContent.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContent.map(item => (
              <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="aspect-[2/3] bg-muted relative overflow-hidden">
                  {item.poster ? (
                    <Image
                      src={item.poster}
                      alt={`${item.title} poster`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <TrendingUp className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="bg-primary/90 text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      {item.rating?.toFixed(1) || 'N/A'}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg line-clamp-1">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.type === 'movie' ? 'Movie' : 'TV Show'}
                    </Badge>
                    {item.year && (
                      <Badge variant="outline" className="text-xs">
                        {item.year}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      {item.availableCountries} countries
                    </Badge>
                  </div>
                  {item.genres && item.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.genres.slice(0, 3).map((genre, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button asChild variant="default" size="sm" className="flex-1 min-h-[44px]">
                      <Link href={buildContentPath(item.type === 'tv' ? 'tv-show' : 'movie', item.id, item.title, item.year)}>
                        <Play className="h-4 w-4 mr-1" />
                        View Details
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px]">
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <TrendingUp className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Trending Content</h3>
              <p className="text-muted-foreground mb-4">
                We couldn&apos;t find any trending content matching your filter.
              </p>
              <Button asChild className="min-h-[44px]">
                <Link href="/search">
                  <Play className="h-5 w-5 mr-2" />
                  Browse All Content
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-info/10 border-info/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-info/20">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-info mb-2">About Trending Content</h3>
                <p className="text-sm text-info/90">
                  Trending content is updated regularly based on global popularity, availability across streaming
                  services, and user engagement. Use filters to find movies or TV shows that match your preferences.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
