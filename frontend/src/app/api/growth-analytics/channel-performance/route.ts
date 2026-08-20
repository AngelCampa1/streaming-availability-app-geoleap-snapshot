import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const _attributionModel = searchParams.get('attributionModel') || 'linear';
    const _sortBy = searchParams.get('sortBy') || 'roi';

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const channelNames = [
      'Google Ads',
      'Facebook Ads',
      'Instagram',
      'Email Marketing',
      'Organic Search',
      'Referral',
      'Direct',
      'YouTube Ads',
    ];

    // Generate mock channel performance data
    const channels = channelNames.map(channel => {
      const spend = Math.floor(Math.random() * 50000) + 10000;
      const conversions = Math.floor(Math.random() * 500) + 50;
      const revenue = conversions * (Math.random() * 200 + 100); // $100-300 per conversion
      const roi = ((revenue - spend) / spend) * 100;
      const impressions = Math.floor(Math.random() * 500000) + 100000;
      const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01)); // 1-6% CTR
      const ctr = (clicks / impressions) * 100;
      const conversionRate = (conversions / clicks) * 100;
      const cpa = spend / conversions;
      const ltv = (revenue / conversions) * (Math.random() * 2 + 1.5); // 1.5-3.5x revenue as LTV

      return {
        channel,
        spend,
        revenue,
        roi,
        conversions,
        impressions,
        clicks,
        ctr,
        conversionRate,
        cpa,
        ltv,
        attribution: {
          firstTouch: revenue * (Math.random() * 0.4 + 0.1), // 10-50%
          lastTouch: revenue * (Math.random() * 0.4 + 0.1),
          linear: revenue * (Math.random() * 0.3 + 0.15), // 15-45%
          timeDecay: revenue * (Math.random() * 0.3 + 0.15),
        },
      };
    });

    // Generate attribution model data
    const models = {
      firstTouch: channels.map(ch => ({
        channel: ch.channel,
        attribution: ch.attribution.firstTouch,
        revenue: ch.attribution.firstTouch,
        percentage: (ch.attribution.firstTouch / channels.reduce((sum, c) => sum + c.attribution.firstTouch, 0)) * 100,
      })),
      lastTouch: channels.map(ch => ({
        channel: ch.channel,
        attribution: ch.attribution.lastTouch,
        revenue: ch.attribution.lastTouch,
        percentage: (ch.attribution.lastTouch / channels.reduce((sum, c) => sum + c.attribution.lastTouch, 0)) * 100,
      })),
      linear: channels.map(ch => ({
        channel: ch.channel,
        attribution: ch.attribution.linear,
        revenue: ch.attribution.linear,
        percentage: (ch.attribution.linear / channels.reduce((sum, c) => sum + c.attribution.linear, 0)) * 100,
      })),
      timeDecay: channels.map(ch => ({
        channel: ch.channel,
        attribution: ch.attribution.timeDecay,
        revenue: ch.attribution.timeDecay,
        percentage: (ch.attribution.timeDecay / channels.reduce((sum, c) => sum + c.attribution.timeDecay, 0)) * 100,
      })),
      dataDrivern: channels.map(ch => ({
        channel: ch.channel,
        attribution: ch.revenue * (Math.random() * 0.3 + 0.15),
        revenue: ch.revenue * (Math.random() * 0.3 + 0.15),
        percentage:
          ((ch.revenue * (Math.random() * 0.3 + 0.15)) /
            channels.reduce((sum, c) => sum + c.revenue * (Math.random() * 0.3 + 0.15), 0)) *
          100,
      })),
    };

    // Attribution comparison
    const comparison = channels.map(ch => ({
      channel: ch.channel,
      firstTouch: ch.attribution.firstTouch,
      lastTouch: ch.attribution.lastTouch,
      linear: ch.attribution.linear,
      timeDecay: ch.attribution.timeDecay,
      difference: Math.max(...Object.values(ch.attribution)) - Math.min(...Object.values(ch.attribution)),
    }));

    // Channel efficiency data
    const efficiency = channels.map(ch => ({
      channel: ch.channel,
      efficiency: Math.random() * 4 + 6, // 6-10 efficiency score
      saturationPoint: ch.spend * (Math.random() * 2 + 1.5), // 1.5-3.5x current spend
      incrementalROI: ch.roi * (Math.random() * 0.5 + 0.7), // 70-120% of current ROI
      scalability: Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low',
      recommendation: `Based on current performance, ${Math.random() > 0.5 ? 'increase' : 'optimize'} budget allocation for better ROI.`,
    }));

    // Generate trend data
    const trends = Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);

      interface ChannelDataEntry {
        spend: number;
        revenue: number;
        conversions: number;
        roi: number;
      }

      const channelData: Record<string, ChannelDataEntry> = {};
      channels.forEach(ch => {
        const dailyVariation = 0.8 + Math.random() * 0.4; // ±20% daily variation
        channelData[ch.channel] = {
          spend: (ch.spend / days) * dailyVariation,
          revenue: (ch.revenue / days) * dailyVariation,
          conversions: Math.floor((ch.conversions / days) * dailyVariation),
          roi: ch.roi * dailyVariation,
        };
      });

      return {
        date: date.toISOString().split('T')[0],
        channels: channelData,
      };
    });

    // Customer journey data
    const customerJourney = Array.from({ length: 8 }, (_, touchpoint) => {
      const journeyData: Record<string, number> = {};
      channels.forEach(ch => {
        // Simulate touchpoint influence - early touchpoints favor awareness channels, later favor conversion channels
        const influence =
          touchpoint < 3
            ? ch.channel.includes('Organic') || ch.channel.includes('Social')
              ? Math.random() * 100 + 50
              : Math.random() * 50
            : ch.channel.includes('Ads') || ch.channel.includes('Email')
              ? Math.random() * 100 + 50
              : Math.random() * 50;
        journeyData[ch.channel] = influence;
      });

      return {
        touchpoint: touchpoint + 1,
        channels: journeyData,
        conversionRate: Math.max(0, 15 - touchpoint * 2), // Decreasing conversion rate by touchpoint
      };
    });

    // Summary calculations
    const totalSpend = channels.reduce((sum, ch) => sum + ch.spend, 0);
    const totalRevenue = channels.reduce((sum, ch) => sum + ch.revenue, 0);
    const overallROI = ((totalRevenue - totalSpend) / totalSpend) * 100;
    const bestChannel = channels.reduce((best, current) => (current.roi > best.roi ? current : best)).channel;
    const worstChannel = channels.reduce((worst, current) => (current.roi < worst.roi ? current : worst)).channel;

    // Budget recommendations
    const budgetRecommendations = channels.map(ch => {
      const currentBudget = ch.spend;
      const performance = ch.roi / 100; // Convert percentage to multiplier
      const scalabilityFactor =
        efficiency.find(e => e.channel === ch.channel)?.scalability === 'high'
          ? 1.5
          : efficiency.find(e => e.channel === ch.channel)?.scalability === 'medium'
            ? 1.2
            : 1.0;

      const recommendedBudget = currentBudget * scalabilityFactor;
      const expectedIncrease =
        ((recommendedBudget * performance - currentBudget * performance) / (currentBudget * performance)) * 100;

      return {
        channel: ch.channel,
        currentBudget,
        recommendedBudget,
        expectedIncrease,
        confidence: Math.floor(Math.random() * 30) + 70, // 70-100% confidence
      };
    });

    const mockData = {
      channels,
      attribution: {
        models,
        comparison,
      },
      efficiency,
      trends,
      customerJourney,
      summary: {
        totalSpend,
        totalRevenue,
        overallROI,
        bestChannel,
        worstChannel,
        budgetRecommendations,
      },
    };

    return NextResponse.json(mockData);
  } catch (_error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
