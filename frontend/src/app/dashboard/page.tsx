'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  History,
  Bookmark,
  TrendingUp,
  Star,
  Globe,
  Play,
  Settings,
  Crown,
  Activity,
  Filter,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import AppLayout from '@/components/layout/AppLayout';

interface DashboardStats {
  totalSearches: number;
  savedContent: number;
  watchlistItems: number;
  subscriptionStatus: 'free' | 'premium' | 'expired';
  daysUntilExpiration?: number;
  favoriteGenres: string[];
  topStreamingServices: { name: string; count: number }[];
}

interface RecentSearch {
  id: string;
  query: string;
  results: number;
  timestamp: string;
  countries: string[];
}

interface SavedContent {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'documentary';
  year?: number;
  poster?: string;
  savedAt: string;
  availableIn: number;
}

interface TrendingContent {
  id: string;
  title: string;
  type: 'movie' | 'tv';
  popularity: number;
  availableCountries: number;
  poster?: string;
}

interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [savedContent, setSavedContent] = useState<SavedContent[]>([]);
  const [trendingContent, setTrendingContent] = useState<TrendingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    const abortController = new AbortController();

    try {
      setLoading(true);
      // Auth is already verified by the useEffect before this function is called
      // No need to check localStorage - auth context handles authentication via cookies

      // Load dashboard stats - auth handled via cookies automatically
      const statsResponse = await fetch('/api/dashboard/stats', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        logger.warn('Failed to load dashboard stats', { status: statsResponse.status });
      }

      // Load recent searches
      const searchesResponse = await fetch('/api/dashboard/recent-searches?limit=5', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
      });

      if (searchesResponse.ok) {
        const searchesData = await searchesResponse.json();
        setRecentSearches(searchesData);
      } else {
        logger.warn('Failed to load recent searches', { status: searchesResponse.status });
      }

      // Load saved content
      const savedResponse = await fetch('/api/dashboard/saved-content?limit=6', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
      });

      if (savedResponse.ok) {
        const savedData = await savedResponse.json();
        setSavedContent(savedData);
      } else {
        logger.warn('Failed to load saved content', { status: savedResponse.status });
      }

      // Load trending content
      const trendingResponse = await fetch('/api/dashboard/trending?limit=6', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
      });

      if (trendingResponse.ok) {
        const trendingData = await trendingResponse.json();
        setTrendingContent(trendingData);
      } else {
        logger.warn('Failed to load trending content', { status: trendingResponse.status });
      }

      logger.info('Dashboard data loaded successfully');
    } catch (err) {
      // Don't set error if request was aborted (component unmounted)
      if (err instanceof Error && err.name === 'AbortError') {
        logger.info('Dashboard data loading cancelled');
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(errorMessage);
      logger.error('Dashboard loading failed', { error: errorMessage });
    } finally {
      setLoading(false);
    }

    // Return cleanup function
    return () => abortController.abort();
  }, []);

  useEffect(() => {
    // Wait for auth check to complete before making auth decisions
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/auth/login?returnUrl=/dashboard');
      return;
    }

    const cleanup = loadDashboardData();

    // Cleanup function to abort requests on unmount
    return () => {
      if (cleanup && typeof cleanup.then === 'function') {
        cleanup.then(cleanupFn => cleanupFn?.());
      }
    };
  }, [authLoading, isAuthenticated, router, loadDashboardData]);

  const quickActions: QuickAction[] = [
    {
      id: 'search',
      label: 'Global Search',
      href: '/search',
      icon: Search,
      description: 'Search across all countries and services',
      badge: 'Popular',
    },
    {
      id: 'advanced-search',
      label: 'Advanced Filters',
      href: '/search?mode=advanced',
      icon: Filter,
      description: 'Use advanced filters for precise results',
    },
    {
      id: 'history',
      label: 'Search History',
      href: '/dashboard/history',
      icon: History,
      description: 'View and manage your search history',
    },
    {
      id: 'watchlist',
      label: 'My Watchlist',
      href: '/dashboard/watchlist',
      icon: Bookmark,
      description: 'Manage your saved content',
    },
    {
      id: 'trending',
      label: 'Trending Now',
      href: '/dashboard/trending',
      icon: TrendingUp,
      description: "Discover what's popular globally",
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      description: 'Manage your account and preferences',
    },
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.firstName || 'User'}!</h1>
            <p className="text-muted-foreground mt-1">
              Here&apos;s what&apos;s happening with your global streaming discovery
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild className="min-h-[44px]">
              <Link href="/search">
                <Search className="h-5 w-5 mr-2" />
                Start Search
              </Link>
            </Button>
          </div>
        </div>

        {/* Subscription Status Alert */}
        {stats?.subscriptionStatus === 'free' && (
          <Alert>
            <Crown className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                You&apos;re on the free plan. Upgrade to premium for unlimited searches and advanced features.
              </span>
              <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                <Link href="/pricing">Upgrade Now</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {stats?.subscriptionStatus === 'expired' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Your premium subscription has expired. Renew to continue accessing premium features.</span>
              <Button asChild size="sm" className="min-h-[44px]">
                <Link href="/pricing">Renew Now</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {stats?.subscriptionStatus === 'premium' && stats.daysUntilExpiration && stats.daysUntilExpiration <= 7 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Your premium subscription expires in {stats.daysUntilExpiration} days.</span>
              <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                <Link href="/dashboard/subscriptions">Manage Subscription</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Searches</p>
                  <p className="text-3xl font-bold text-primary">{stats?.totalSearches || 0}</p>
                </div>
                <Search className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saved Content</p>
                  <p className="text-3xl font-bold text-primary">{stats?.savedContent || 0}</p>
                </div>
                <Bookmark className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Watchlist Items</p>
                  <p className="text-3xl font-bold text-primary">{stats?.watchlistItems || 0}</p>
                </div>
                <Play className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={stats?.subscriptionStatus === 'premium' ? 'default' : 'secondary'}>
                      {stats?.subscriptionStatus === 'premium' ? 'Premium' : 'Free'}
                    </Badge>
                    {stats?.subscriptionStatus === 'premium' && <Crown className="h-4 w-4 text-primary" />}
                  </div>
                </div>
                <Users className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Jump to the features you use most</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.id}
                    href={action.href}
                    className="flex items-center gap-3 p-4 min-h-[44px] rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{action.label}</span>
                        {action.badge && (
                          <Badge variant="outline" className="text-xs">
                            {action.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Searches */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Searches
                </CardTitle>
                <CardDescription>Your latest search activity</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                <Link href="/dashboard/history">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentSearches.length > 0 ? (
                <div className="space-y-3">
                  {recentSearches.map(search => (
                    <div key={search.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium">{search.query}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {search.results} results
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {search.countries?.length || 0} countries
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {new Date(search.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent searches</p>
                  <Button asChild className="mt-4 min-h-[44px]">
                    <Link href="/search">Start Your First Search</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Favorite Genres & Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Your Preferences
              </CardTitle>
              <CardDescription>Based on your search history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stats?.favoriteGenres && stats.favoriteGenres.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Favorite Genres</h4>
                  <div className="flex flex-wrap gap-2">
                    {stats.favoriteGenres.slice(0, 5).map((genre, index) => (
                      <Badge key={index} variant="secondary">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {stats?.topStreamingServices && stats.topStreamingServices.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Top Streaming Services</h4>
                  <div className="space-y-2">
                    {stats.topStreamingServices.slice(0, 3).map((service, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{service.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {service.count} searches
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!stats?.favoriteGenres?.length && !stats?.topStreamingServices?.length && (
                <div className="text-center py-4">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Start searching to see your preferences</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Saved Content & Trending */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Saved Content */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bookmark className="h-5 w-5" />
                  Your Watchlist
                </CardTitle>
                <CardDescription>Content you&apos;ve saved for later</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                <Link href="/dashboard/watchlist">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {savedContent.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {savedContent.slice(0, 4).map(item => (
                    <div key={item.id} className="space-y-2">
                      <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                        {item.poster ? (
                          <Image
                            src={item.poster}
                            alt={`${item.title} poster`}
                            fill
                            className="object-cover rounded-lg"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <Play className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                          {item.year && (
                            <Badge variant="outline" className="text-xs">
                              {item.year}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bookmark className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No saved content yet</p>
                  <Button asChild variant="outline" className="mt-4 min-h-[44px]">
                    <Link href="/search">Discover Content</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trending Content */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trending Globally
                </CardTitle>
                <CardDescription>Popular content worldwide</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                <Link href="/dashboard/trending">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {trendingContent.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {trendingContent.slice(0, 4).map(item => (
                    <div key={item.id} className="space-y-2">
                      <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                        {item.poster ? (
                          <Image
                            src={item.poster}
                            alt={`${item.title} poster`}
                            fill
                            className="object-cover rounded-lg"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <TrendingUp className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            {item.availableCountries}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading trending content...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Helpful Tips */}
        <Card className="bg-info/10 border-info/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-info/20">
                <CheckCircle className="h-5 w-5 text-info" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-info mb-2">Pro Tips for Better Searching</h3>
                <ul className="space-y-1 text-sm text-info/90">
                  <li>• Use specific titles and actors for more accurate results</li>
                  <li>• Save content to your watchlist to track availability changes</li>
                  <li>• Check trending content to discover new shows and movies</li>
                  <li>• Use advanced filters to narrow down by genre, year, and rating</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
