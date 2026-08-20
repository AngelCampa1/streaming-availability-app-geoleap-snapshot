'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, MousePointer, DollarSign, Percent } from 'lucide-react';

interface AffiliateDashboard {
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommission: number;
  conversionRate: number;
  topPartners: Array<{
    id: string;
    name: string;
    totalClicks: number;
    totalRevenue: number;
  }>;
  from: string;
  to: string;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) => (
  <div className="rounded-lg border border-border bg-card p-5">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

export default function AffiliateDashboardPage() {
  const [data, setData] = useState<AffiliateDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8020';

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${apiBase}/api/admin/affiliates/dashboard`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch dashboard');
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Affiliate Dashboard</h1>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              icon={MousePointer}
              label="Total Clicks"
              value={data.totalClicks.toLocaleString()}
            />
            <StatCard
              icon={TrendingUp}
              label="Conversions"
              value={data.totalConversions.toLocaleString()}
            />
            <StatCard
              icon={DollarSign}
              label="Revenue"
              value={`$${data.totalRevenue.toFixed(2)}`}
            />
            <StatCard
              icon={Percent}
              label="Conv. Rate"
              value={`${data.conversionRate.toFixed(1)}%`}
            />
          </div>

          {data.topPartners.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold text-foreground mb-4">Top Partners</h2>
              <div className="space-y-3">
                {data.topPartners.map(partner => (
                  <div key={partner.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{partner.name}</span>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{(partner.totalClicks ?? 0).toLocaleString()} clicks</span>
                      <span>${(partner.totalRevenue ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
