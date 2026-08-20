'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  History,
  Search,
  Calendar,
  Globe,
  Filter,
  RefreshCw,
  Trash2,
  AlertCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface SearchHistoryItem {
  id: string;
  query: string;
  resultCount: number;
  countries: string[];
  streamingServices: string[];
  timestamp: string;
  executionTimeMs: number;
  filters?: {
    genre?: string[];
    year?: { min?: number; max?: number };
    rating?: { min?: number };
    type?: string[];
  };
}

export default function SearchHistoryPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const loadSearchHistory = useCallback(async () => {
    try {
      setLoading(true);
      // Auth is verified by useEffect before this function is called
      // Credentials include cookies for authentication

      const response = await fetch('/api/search/history', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load search history');
      }

      const data = await response.json();
      setSearchHistory(data.items || []);
      logger.info('Search history loaded successfully', { count: data.items?.length || 0 });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load search history';
      setError(errorMessage);
      logger.error('Search history loading failed', { error: errorMessage });
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
    loadSearchHistory();
  }, [authLoading, isAuthenticated, router, loadSearchHistory]);

  const handleRepeatSearch = (item: SearchHistoryItem) => {
    const params = new URLSearchParams();
    params.set('q', item.query);

    if (item.filters?.genre?.length) {
      params.set('genres', item.filters.genre.join(','));
    }

    if (item.filters?.year?.min) {
      params.set('yearMin', item.filters.year.min.toString());
    }

    if (item.filters?.year?.max) {
      params.set('yearMax', item.filters.year.max.toString());
    }

    if (item.filters?.type?.length) {
      params.set('types', item.filters.type.join(','));
    }

    router.push(`/search?${params.toString()}`);
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/search/history/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSearchHistory(prev => prev.filter(item => item.id !== itemId));
        logger.info('Search history item deleted', { itemId });
      }
    } catch (err) {
      logger.error('Failed to delete search history item', { error: err, itemId });
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all search history? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/search/history', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSearchHistory([]);
        logger.info('Search history cleared');
      }
    } catch (err) {
      logger.error('Failed to clear search history', { error: err });
    }
  };

  const filteredHistory = searchHistory.filter(item => {
    // Filter by search term
    const matchesSearch = searchFilter === '' || item.query.toLowerCase().includes(searchFilter.toLowerCase());

    // Filter by date
    const now = new Date();
    const itemDate = new Date(item.timestamp);
    let matchesDate = true;

    switch (dateFilter) {
      case 'today':
        matchesDate = itemDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = itemDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = itemDate >= monthAgo;
        break;
      default:
        matchesDate = true;
    }

    return matchesSearch && matchesDate;
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
              <History className="h-8 w-8 text-primary" />
              Search History
            </h1>
            <p className="text-muted-foreground mt-1">View and manage your search history</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={loadSearchHistory} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {searchHistory.length > 0 && (
              <Button onClick={handleClearHistory} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Filter searches..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'today', 'week', 'month'] as const).map(filter => (
                  <Button
                    key={filter}
                    variant={dateFilter === filter ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateFilter(filter)}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search History List */}
        {filteredHistory.length > 0 ? (
          <div className="space-y-4">
            {filteredHistory.map(item => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{item.query}</h3>
                        <Badge variant="outline">{item.resultCount} results</Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.executionTimeMs}ms
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {item.countries.length} countries
                        </Badge>

                        {item.streamingServices.length > 0 && (
                          <Badge variant="secondary">{item.streamingServices.length} services</Badge>
                        )}

                        {item.filters?.genre?.length && (
                          <Badge variant="secondary">{item.filters.genre.join(', ')}</Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleRepeatSearch(item)} size="sm" className="flex items-center gap-1">
                        <Search className="h-4 w-4" />
                        Repeat
                      </Button>
                      <Button
                        onClick={() => handleDeleteItem(item.id)}
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              {searchFilter || dateFilter !== 'all' ? (
                <>
                  <Filter className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No matching searches found</h3>
                  <p className="text-muted-foreground mb-4">Try adjusting your filters or search term</p>
                  <Button
                    onClick={() => {
                      setSearchFilter('');
                      setDateFilter('all');
                    }}
                    variant="outline"
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No search history yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start searching to build up your history and quickly repeat popular searches
                  </p>
                  <Button asChild>
                    <Link href="/search">
                      <Search className="h-4 w-4 mr-2" />
                      Start Searching
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Search Tips */}
        {searchHistory.length > 0 && (
          <Card className="bg-info/10 border-info/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-info/20">
                  <TrendingUp className="h-5 w-5 text-info" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-info-foreground mb-2">Make the most of your search history</h3>
                  <ul className="space-y-1 text-sm text-info-foreground/80">
                    <li>• Repeat successful searches with one click</li>
                    <li>• Use filters to find specific searches quickly</li>
                    <li>• Review search performance to optimize your queries</li>
                    <li>• Delete searches you no longer need to keep history organized</li>
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
