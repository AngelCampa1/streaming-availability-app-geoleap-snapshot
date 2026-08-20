import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    // In a real application, this would fetch from your analytics database
    // For now, we'll return mock data that matches the expected interface
    const mockData = {
      totalEvents: Math.floor(Math.random() * 100000) + 50000,
      uniqueUsers: Math.floor(Math.random() * 25000) + 10000,
      conversionRate: Math.random() * 8 + 2, // 2-10%
      revenue: Math.floor(Math.random() * 500000) + 100000,
      avgSessionDuration: Math.floor(Math.random() * 300) + 120, // 2-7 minutes
      retentionRate: Math.random() * 30 + 60, // 60-90%
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(mockData);
  } catch (_error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
