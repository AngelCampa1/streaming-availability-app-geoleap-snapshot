'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { PlayIcon, PauseIcon, TrashIcon, ActivityIcon } from 'lucide-react';

interface RealTimeEventsFeedProps {
  className?: string;
}

interface RealtimeEvent {
  id: string;
  eventName: string;
  category: string;
  userId?: string;
  sessionId: string;
  clientTimestamp: string;
  serverTimestamp: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
  utmSource?: string;
  utmMedium?: string;
  country?: string;
  deviceType?: string;
  eventValue?: number;
  currency?: string;
}

interface EventStats {
  eventsPerMinute: number;
  totalEventsToday: number;
  uniqueUsersToday: number;
  topEventTypes: Array<{ name: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
}

// Pure functions moved outside component for performance (no recreations on re-render)
const getEventIcon = (category: string): string => {
  switch (category) {
    case 'navigation':
      return '🔗';
    case 'interaction':
      return '👆';
    case 'conversion':
      return '💰';
    case 'error':
      return '❌';
    case 'custom':
      return '⚡';
    default:
      return '📊';
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatEventProperties = (properties: Record<string, any>): string => {
  const filtered = Object.entries(properties)
    .filter(([_key, value]) => value != null && value !== '')
    .slice(0, 3); // Show only first 3 properties

  return filtered.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
};

const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString();
};

// Memoized Event Card component - prevents re-rendering all events on each new event
// Uses custom comparison to check event.id only (index changes don't matter)
const EventCard = memo<{ event: RealtimeEvent }>(
  ({ event }) => (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
      {/* Event Icon & Category */}
      <div className="flex-shrink-0 text-lg">{getEventIcon(event.category)}</div>

      {/* Event Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{event.eventName}</span>
          <Badge variant="outline" className="text-xs">
            {event.category}
          </Badge>
          {event.eventValue && (
            <Badge variant="secondary" className="text-xs">
              ${event.eventValue} {event.currency || 'USD'}
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            {event.userId ? `User: ${event.userId.slice(-8)}` : 'Anonymous'} • Session:{' '}
            {event.sessionId.slice(-8)}
            {event.country && ` • ${event.country}`}
            {event.deviceType && ` • ${event.deviceType}`}
          </div>

          {event.utmSource && (
            <div>
              Source: {event.utmSource}
              {event.utmMedium && ` / ${event.utmMedium}`}
            </div>
          )}

          {Object.keys(event.properties).length > 0 && (
            <div className="truncate">{formatEventProperties(event.properties)}</div>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex-shrink-0 text-xs text-muted-foreground">{formatTimestamp(event.clientTimestamp)}</div>
    </div>
  ),
  (prevProps, nextProps) => prevProps.event.id === nextProps.event.id
);

EventCard.displayName = 'EventCard';

// Memoized Event Type List component
const EventTypeList = memo<{ stats: EventStats }>(({ stats }) => (
  <div className="space-y-3">
    {stats.topEventTypes.slice(0, 5).map((eventType, index) => {
      const percentage = stats.totalEventsToday > 0 ? (eventType.count / stats.totalEventsToday) * 100 : 0;

      return (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{eventType.name}</span>
            <Badge variant="outline" className="text-xs">
              {eventType.count.toLocaleString()}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
        </div>
      );
    })}
  </div>
));

EventTypeList.displayName = 'EventTypeList';

// Memoized Country List component
const CountryList = memo<{ stats: EventStats }>(({ stats }) => (
  <div className="space-y-3">
    {stats.topCountries.slice(0, 5).map((country, index) => {
      const total = stats.topCountries.reduce((sum, c) => sum + c.count, 0);
      const percentage = total > 0 ? (country.count / total) * 100 : 0;

      return (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{country.country || 'Unknown'}</span>
            <Badge variant="outline" className="text-xs">
              {country.count.toLocaleString()}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
        </div>
      );
    })}
  </div>
));

CountryList.displayName = 'CountryList';

/**
 * Real-time Growth Events Feed with live statistics
 */
export function RealTimeEventsFeed({ className }: RealTimeEventsFeedProps) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [maxEvents, setMaxEvents] = useState(100);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to avoid stale closures in WebSocket callbacks
  const isPausedRef = useRef(isPaused);
  const filterRef = useRef(filter);
  const maxEventsRef = useRef(maxEvents);

  // Keep refs in sync with state
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    maxEventsRef.current = maxEvents;
  }, [maxEvents]);

  const connectWebSocket = useCallback((): void => {
    try {
      // Clear any existing reconnect timeout before creating new connection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // In a real implementation, this would connect to your WebSocket endpoint
      const ws = new WebSocket(`wss://${window.location.host}/api/growth-analytics/realtime`);

      ws.onopen = () => {
        setIsConnected(true);
        // Connection established - no logging needed in production
      };

      ws.onmessage = event => {
        // Use ref to get latest paused state (avoid stale closure)
        if (isPausedRef.current) return;

        try {
          const data = JSON.parse(event.data);

          if (data.type === 'event') {
            // Apply filter using ref for latest value
            if (filterRef.current !== 'all' && data.event.category !== filterRef.current) {
              return;
            }
            setEvents(prev => {
              const newEvents = [data.event, ...prev];
              // Use ref for latest maxEvents value
              return newEvents.slice(0, maxEventsRef.current);
            });
          } else if (data.type === 'stats') {
            setStats(data.stats);
          }
        } catch (err) {
          // Silent fail - WebSocket parsing errors are not critical
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to parse WebSocket message:', err);
          }
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // WebSocket disconnected, will attempt reconnection

        // Attempt to reconnect after 5 seconds with proper cleanup
        reconnectTimeoutRef.current = setTimeout(() => {
          // Use ref to get latest paused state (avoid stale closure)
          if (!isPausedRef.current) {
            connectWebSocket();
          }
        }, 5000);
      };

      ws.onerror = _error => {
        // WebSocket error - connection will be retried automatically
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (err) {
      // Failed to establish WebSocket connection - will retry
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to connect WebSocket:', err);
      }
      setIsConnected(false);
    }
  // Empty dependency array - we use refs for all dynamic values to avoid
  // recreating the WebSocket connection when state changes
  }, []);

  useEffect(() => {
    connectWebSocket();
    loadInitialStats();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [events, autoScroll]);

  const loadInitialStats = async (): Promise<void> => {
    try {
      const response = await fetch('/api/growth-analytics/realtime/stats');
      if (response.ok) {
        const initialStats = await response.json();
        setStats(initialStats);
      }
    } catch (err) {
      console.error('Failed to load initial stats:', err);
    }
  };

  // Memoized handler functions to prevent unnecessary re-renders
  const togglePause = useCallback((): void => {
    setIsPaused(prev => !prev);

    if (isPaused && !isConnected) {
      connectWebSocket();
    }
  }, [isPaused, isConnected, connectWebSocket]);

  const clearEvents = useCallback((): void => {
    setEvents([]);
  }, []);

  return (
    <div className={`space-y-6 ${className}`} data-testid="realtime-events-feed">
      {/* Real-time Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ActivityIcon className="h-4 w-4" />
              Events/Minute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.eventsPerMinute || 0}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}></div>
              <span className="text-xs text-muted-foreground">{isConnected ? 'Live' : 'Disconnected'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Events Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEventsToday?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Total tracked events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueUsersToday?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Active users today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Event</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.topEventTypes?.[0]?.name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">{stats?.topEventTypes?.[0]?.count || 0} occurrences</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Events Feed</CardTitle>
          <CardDescription>Live stream of growth analytics events as they happen</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant={isPaused ? 'default' : 'outline'} size="sm" onClick={togglePause}>
                {isPaused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>

              <Button variant="outline" size="sm" onClick={clearEvents}>
                <TrashIcon className="h-4 w-4" />
                Clear
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Auto-scroll:</label>
              <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Filter:</label>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="all">All Events</option>
                <option value="navigation">Navigation</option>
                <option value="interaction">Interaction</option>
                <option value="conversion">Conversion</option>
                <option value="error">Error</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm">Max Events:</label>
              <select
                value={maxEvents}
                onChange={e => setMaxEvents(Number(e.target.value))}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Live Events
            <Badge variant="secondary">{events.length} events</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-96" ref={scrollAreaRef}>
            <div className="p-4 space-y-2">
              {events.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {isPaused ? 'Feed paused - click Resume to continue' : 'Waiting for events...'}
                </div>
              ) : (
                events.map(event => <EventCard key={event.id} event={event} />)
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Event Type Distribution */}
      {stats?.topEventTypes && stats.topEventTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Event Types Today</CardTitle>
            <CardDescription>Most frequently tracked events</CardDescription>
          </CardHeader>
          <CardContent>
            <EventTypeList stats={stats} />
          </CardContent>
        </Card>
      )}

      {/* Geographic Distribution */}
      {stats?.topCountries && stats.topCountries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Countries Today</CardTitle>
            <CardDescription>Geographic distribution of events</CardDescription>
          </CardHeader>
          <CardContent>
            <CountryList stats={stats} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
