import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const channel = searchParams.get('channel') || 'all';
    const _metric = searchParams.get('metric') || 'retention';

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const weeks = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));

    const channels = ['organic', 'paid', 'social', 'email', 'referral'];
    const filteredChannels = channel === 'all' ? channels : [channel];

    // Generate mock cohort data
    interface CohortMetric {
      cohortDate: string;
      cohortSize: number;
      channel: string;
      retentionRates: number[];
      revenue: number[];
      avgLifetimeValue: number;
      churnRate: number;
    }

    interface RetentionMatrixCohort {
      cohortDate: string;
      channel: string;
      retentionRates: number[];
      cohortSize: number;
    }

    const cohorts: CohortMetric[] = [];
    const retentionMatrix = {
      periods: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
      cohorts: [] as RetentionMatrixCohort[],
    };

    for (let week = 0; week < weeks; week++) {
      for (const ch of filteredChannels) {
        const cohortDate = new Date(start);
        cohortDate.setDate(cohortDate.getDate() + week * 7);

        const cohortSize = Math.floor(Math.random() * 500) + 100;
        const baseRetention = Math.random() * 30 + 60; // 60-90% initial

        // Generate retention rates with natural decay
        const retentionRates = Array.from({ length: 30 }, (_, day) => {
          const decayFactor = Math.exp(-day * 0.05); // Natural decay
          const noise = (Math.random() - 0.5) * 10; // ±5% noise
          return Math.max(0, Math.min(100, baseRetention * decayFactor + noise));
        });

        // Generate revenue data
        const revenue = Array.from({ length: 30 }, (_, day) => {
          const baseRevenue = cohortSize * 25; // $25 per user initially
          return baseRevenue * (retentionRates[day] / 100) * (1 + day * 0.02); // Increasing value over time
        });

        const cohortMetric = {
          cohortDate: cohortDate.toISOString().split('T')[0],
          cohortSize,
          channel: ch,
          retentionRates,
          revenue,
          avgLifetimeValue: revenue.reduce((sum, r) => sum + r, 0) / cohortSize,
          churnRate: 100 - retentionRates[29], // Final retention rate
        };

        cohorts.push(cohortMetric);

        retentionMatrix.cohorts.push({
          cohortDate: cohortMetric.cohortDate,
          channel: ch,
          retentionRates,
          cohortSize,
        });
      }
    }

    // Calculate summary metrics
    const totalCohorts = cohorts.length;
    const avgRetentionDay1 = cohorts.reduce((sum, c) => sum + c.retentionRates[0], 0) / totalCohorts;
    const avgRetentionDay7 = cohorts.reduce((sum, c) => sum + c.retentionRates[6], 0) / totalCohorts;
    const avgRetentionDay30 = cohorts.reduce((sum, c) => sum + c.retentionRates[29], 0) / totalCohorts;
    const avgLifetimeValue = cohorts.reduce((sum, c) => sum + c.avgLifetimeValue, 0) / totalCohorts;

    // Find best and worst performing channels
    const channelPerformance = filteredChannels.map(ch => {
      const channelCohorts = cohorts.filter(c => c.channel === ch);
      const avgRetention = channelCohorts.reduce((sum, c) => sum + c.retentionRates[29], 0) / channelCohorts.length;
      return { channel: ch, avgRetention };
    });

    const bestPerformingChannel = channelPerformance.reduce((best, current) =>
      current.avgRetention > best.avgRetention ? current : best
    ).channel;

    const worstPerformingChannel = channelPerformance.reduce((worst, current) =>
      current.avgRetention < worst.avgRetention ? current : worst
    ).channel;

    // Channel breakdown
    const channelBreakdown = channelPerformance.map(ch => {
      const channelCohorts = cohorts.filter(c => c.channel === ch.channel);
      const totalUsers = channelCohorts.reduce((sum, c) => sum + c.cohortSize, 0);
      const avgLifetimeValue = channelCohorts.reduce((sum, c) => sum + c.avgLifetimeValue, 0) / channelCohorts.length;

      return {
        channel: ch.channel,
        totalUsers,
        avgRetention: ch.avgRetention,
        avgLifetimeValue,
        trend: Math.random() > 0.3 ? 'up' : Math.random() > 0.5 ? 'stable' : 'down',
      };
    });

    const mockData = {
      cohorts,
      summary: {
        totalCohorts,
        avgRetentionDay1,
        avgRetentionDay7,
        avgRetentionDay30,
        avgLifetimeValue,
        bestPerformingChannel,
        worstPerformingChannel,
      },
      retentionMatrix,
      channelBreakdown,
    };

    return NextResponse.json(mockData);
  } catch (_error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
