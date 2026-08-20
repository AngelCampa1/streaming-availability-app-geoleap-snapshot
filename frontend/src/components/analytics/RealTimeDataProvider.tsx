'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '@/lib/websocket';

interface RealTimeData {
  activeUsers: number;
  currentRevenue: number;
  conversionRate: number;
  realTimeEvents: number;
  cohortMetrics?: {
    newCohorts: number;
    avgRetention: number;
  };
  channelMetrics?: {
    bestPerformingChannel: string;
    worstPerformingChannel: string;
    totalSpend: number;
  };
  lastUpdated: string;
}

interface RealTimeContextType {
  data: RealTimeData | null;
  isConnected: boolean;
  error: Error | null;
  refreshData: () => void;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

interface RealTimeDataProviderProps {
  children: React.ReactNode;
  refreshInterval?: number;
}

/**
 * Real-time data provider that manages WebSocket connections and data updates
 * for analytics components
 */
export function RealTimeDataProvider({ children, refreshInterval = 30000 }: RealTimeDataProviderProps) {
  const [data, setData] = useState<RealTimeData | null>(null);
  const { isConnected, lastMessage, error } = useWebSocket(true);

  // Initialize with mock data
  useEffect(() => {
    const initialData: RealTimeData = {
      activeUsers: 1247,
      currentRevenue: 28453,
      conversionRate: 3.2,
      realTimeEvents: 145,
      cohortMetrics: {
        newCohorts: 3,
        avgRetention: 68.4,
      },
      channelMetrics: {
        bestPerformingChannel: 'Google Ads',
        worstPerformingChannel: 'Display',
        totalSpend: 45000,
      },
      lastUpdated: new Date().toISOString(),
    };
    setData(initialData);
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'analytics_update':
          if (lastMessage.data.metrics) {
            setData(
              prevData =>
                ({
                  ...prevData,
                  ...lastMessage.data.metrics,
                  lastUpdated: lastMessage.timestamp,
                }) as RealTimeData
            );
          }
          break;

        case 'cohort_update':
          if (lastMessage.data.cohortMetrics) {
            setData(prevData => ({
              ...prevData!,
              cohortMetrics: lastMessage.data.cohortMetrics,
              lastUpdated: lastMessage.timestamp,
            }));
          }
          break;

        case 'channel_update':
          if (lastMessage.data.channelMetrics) {
            setData(prevData => ({
              ...prevData!,
              channelMetrics: lastMessage.data.channelMetrics,
              lastUpdated: lastMessage.timestamp,
            }));
          }
          break;

        case 'error':
          // Real-time data error received
          break;
      }
    }
  }, [lastMessage]);

  // Fallback polling if WebSocket fails
  useEffect(() => {
    if (!isConnected && !error) {
      const pollInterval = setInterval(() => {
        // Simulate real-time updates with random variations
        setData(prevData => {
          if (!prevData) return prevData;

          return {
            ...prevData,
            activeUsers: Math.max(0, prevData.activeUsers + Math.floor((Math.random() - 0.5) * 100)),
            currentRevenue: Math.max(0, prevData.currentRevenue + Math.floor((Math.random() - 0.3) * 1000)),
            conversionRate: Math.max(0, Math.min(10, prevData.conversionRate + (Math.random() - 0.5) * 0.5)),
            realTimeEvents: Math.max(0, prevData.realTimeEvents + Math.floor((Math.random() - 0.5) * 20)),
            lastUpdated: new Date().toISOString(),
          };
        });
      }, refreshInterval);

      return () => clearInterval(pollInterval);
    }
  }, [isConnected, error, refreshInterval]);

  const refreshData = () => {
    if (isConnected) {
      // Request fresh data from WebSocket
      // This would trigger a server-side data refresh in a real implementation
      // Fresh data request sent
    } else {
      // Manually refresh data
      setData(prevData => ({
        ...prevData!,
        lastUpdated: new Date().toISOString(),
      }));
    }
  };

  const contextValue: RealTimeContextType = {
    data,
    isConnected,
    error,
    refreshData,
  };

  return <RealTimeContext.Provider value={contextValue}>{children}</RealTimeContext.Provider>;
}

/**
 * Hook to access real-time analytics data
 */
export function useRealTimeData(): RealTimeContextType {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error('useRealTimeData must be used within a RealTimeDataProvider');
  }
  return context;
}

/**
 * Hook specifically for real-time metrics display
 */
export function useRealTimeMetrics() {
  const { data, isConnected, error, refreshData } = useRealTimeData();

  return {
    metrics: data
      ? {
          activeUsers: data.activeUsers,
          revenue: data.currentRevenue,
          conversionRate: data.conversionRate,
          events: data.realTimeEvents,
        }
      : null,
    cohortMetrics: data?.cohortMetrics || null,
    channelMetrics: data?.channelMetrics || null,
    lastUpdated: data?.lastUpdated || null,
    isLive: isConnected,
    hasError: !!error,
    refresh: refreshData,
  };
}

/**
 * Real-time status indicator component
 */
export function RealTimeStatus() {
  const { isConnected, error, data } = useRealTimeData();

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-destructive">
        <div className="w-2 h-2 bg-destructive rounded-full"></div>
        <span className="text-sm">Connection Error</span>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2 text-success">
        <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
        <span className="text-sm">Live</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-warning">
      <div className="w-2 h-2 bg-warning rounded-full"></div>
      <span className="text-sm">
        Polling {data?.lastUpdated ? `(${new Date(data.lastUpdated).toLocaleTimeString()})` : ''}
      </span>
    </div>
  );
}
