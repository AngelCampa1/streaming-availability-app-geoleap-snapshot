import { NextRequest, NextResponse } from 'next/server';

// Chart color constants using Stream Violet palette
// See docs/UNIFIED_COLOR_SYSTEM.md
const CHART_COLORS = {
  pageView: '#7c3aed',    // Primary Stream Violet 500
  videoPlay: '#10b981',   // Stream Green 500
  search: '#f59e0b',      // Golden Popcorn 500
  signup: '#ef4444',      // Alert Red 500
  purchase: '#06b6d4',    // Electric Cyan 500
} as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Generate mock daily metrics
    const dailyMetrics = Array.from({ length: days }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);

      return {
        date: date.toISOString().split('T')[0],
        events: Math.floor(Math.random() * 5000) + 1000,
        users: Math.floor(Math.random() * 1000) + 200,
        sessions: Math.floor(Math.random() * 2000) + 500,
        revenue: Math.floor(Math.random() * 10000) + 2000,
        conversionRate: Math.random() * 5 + 2,
      };
    });

    // Mock event categories - UNIFIED COLOR SYSTEM
    const eventCategories = [
      { category: 'page_view', count: 25000, percentage: 40, color: CHART_COLORS.pageView },
      { category: 'video_play', count: 15000, percentage: 24, color: CHART_COLORS.videoPlay },
      { category: 'search', count: 12000, percentage: 19, color: CHART_COLORS.search },
      { category: 'signup', count: 6000, percentage: 10, color: CHART_COLORS.signup },
      { category: 'purchase', count: 4500, percentage: 7, color: CHART_COLORS.purchase },
    ];

    // Mock user segments
    const userSegments = [
      {
        segment: 'New Users',
        users: 8500,
        revenue: 45000,
        avgSessionDuration: 180,
        conversionRate: 2.5,
      },
      {
        segment: 'Returning Users',
        users: 12000,
        revenue: 85000,
        avgSessionDuration: 240,
        conversionRate: 4.2,
      },
      {
        segment: 'Premium Users',
        users: 3500,
        revenue: 120000,
        avgSessionDuration: 360,
        conversionRate: 8.5,
      },
    ];

    // Mock performance metrics
    const performanceMetrics = [
      {
        metric: 'Page Load Time',
        current: 2.1,
        previous: 2.3,
        change: -8.7,
        trend: 'up' as const,
      },
      {
        metric: 'Bounce Rate',
        current: 35.2,
        previous: 38.1,
        change: -7.6,
        trend: 'up' as const,
      },
      {
        metric: 'Session Duration',
        current: 245,
        previous: 220,
        change: 11.4,
        trend: 'up' as const,
      },
      {
        metric: 'Conversion Rate',
        current: 4.2,
        previous: 3.8,
        change: 10.5,
        trend: 'up' as const,
      },
    ];

    // Mock trend metrics
    const trends = [
      {
        name: 'Daily Active Users',
        value: 12500,
        change: 8.3,
        trend: 'up' as const,
        description: 'Active users in the last 24 hours',
      },
      {
        name: 'Revenue Growth',
        value: 145000,
        change: 12.7,
        trend: 'up' as const,
        description: 'Total revenue growth this period',
      },
      {
        name: 'Engagement Rate',
        value: 68.5,
        change: -2.1,
        trend: 'down' as const,
        description: 'User engagement with content',
      },
      {
        name: 'Customer Satisfaction',
        value: 4.6,
        change: 3.2,
        trend: 'up' as const,
        description: 'Average customer satisfaction score',
      },
    ];

    const mockData = {
      dailyMetrics,
      eventCategories,
      userSegments,
      performanceMetrics,
      trends,
    };

    return NextResponse.json(mockData);
  } catch (_error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
