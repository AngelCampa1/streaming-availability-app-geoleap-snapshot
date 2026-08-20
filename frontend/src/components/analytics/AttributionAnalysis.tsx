'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { InfoIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

interface AttributionAnalysisProps {
  dateRange?: DateRange;
  className?: string;
}

interface AttributionSummary {
  modelId: string;
  modelName: string;
  totalConversions: number;
  totalAttributedValue: number;
  channels: ChannelAttribution[];
  touchpointPositions: TouchpointPosition[];
  averageTimeToConversion: string;
  averageTouchpoints: number;
}

interface ChannelAttribution {
  channel: string;
  conversions: number;
  attributedValue: number;
  attributedPercentage: number;
  averageAttribution: number;
  firstTouchConversions: number;
  lastTouchConversions: number;
  assistedConversions: number;
}

interface TouchpointPosition {
  position: number;
  positionLabel: string;
  touchpoints: number;
  attributedValue: number;
  averageAttribution: number;
}

interface AttributionModel {
  id: string;
  name: string;
  type: string;
  description: string;
  isDefault: boolean;
}

interface ModelComparison {
  startDate: string;
  endDate: string;
  models: ModelComparisonSummary[];
  channelComparisons: ChannelComparison[];
}

interface ModelComparisonSummary {
  modelId: string;
  modelName: string;
  modelType: string;
  totalConversions: number;
  totalAttributedValue: number;
  topChannelPercentage: number;
  topChannel: string;
}

interface ChannelComparison {
  channel: string;
  modelResults: ChannelModelResult[];
  variancePercentage: number;
  standardDeviation: number;
}

interface ChannelModelResult {
  modelId: string;
  modelName: string;
  attributedValue: number;
  attributedPercentage: number;
  rank: number;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--accent))',
];

/**
 * Helper function to format currency values
 * Exported for testing purposes
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

/**
 * Tooltip formatter for channel attribution bar chart
 * Exported for testing purposes
 */
export const formatChannelTooltip = (value: number, name: string): [string, string] => {
  return [
    name === 'attributedValue' ? formatCurrency(value) : value.toLocaleString(),
    name === 'attributedValue' ? 'Attribution Value' : 'Conversions',
  ];
};

/**
 * Label formatter for touchpoint positions pie chart
 * Exported for testing purposes
 * Accepts full recharts LabelListProps object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const formatPieChartLabel = (props: any): string => {
  const { name = '', value = 0 } = props;
  return `${name}: ${formatCurrency(Number(value) || 0)}`;
};

/**
 * Tooltip formatter for pie charts
 * Exported for testing purposes
 */
export const formatPieTooltip = (value: number): string => {
  return formatCurrency(value);
};

/**
 * Multi-touch Attribution Analysis with model comparison
 * Memoized for performance optimization (UI-039)
 */
export const AttributionAnalysis = React.memo(function AttributionAnalysis({
  dateRange,
  className,
}: AttributionAnalysisProps) {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [models, setModels] = useState<AttributionModel[]>([]);
  const [attribution, setAttribution] = useState<AttributionSummary | null>(null);
  const [comparison, setComparison] = useState<ModelComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');

  const loadAttributionModels = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/growth-analytics/attribution/models');
      if (!response.ok) throw new Error('Failed to load attribution models');

      const modelsData = await response.json();
      setModels(modelsData);

      // Select default model
      const defaultModel = modelsData.find((m: AttributionModel) => m.isDefault);
      if (defaultModel) {
        setSelectedModel(defaultModel.id);
      } else if (modelsData.length > 0) {
        setSelectedModel(modelsData[0].id);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load attribution models:', err);
      }
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false); // FIX BUG-FE-017: Always set loading to false after model load
    }
  }, []);

  const loadAttributionAnalysis = useCallback(async (): Promise<void> => {
    if (!dateRange?.from || !dateRange?.to || !selectedModel) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        modelId: selectedModel,
      });

      const response = await fetch(`/api/growth-analytics/attribution/summary?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const data = await response.json();
      setAttribution(data);
    } catch (err) {
      console.error('Failed to load attribution analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to load attribution data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedModel]);

  useEffect(() => {
    loadAttributionModels();
  }, [loadAttributionModels]);

  useEffect(() => {
    if (selectedModel && dateRange?.from && dateRange?.to) {
      if (viewMode === 'single') {
        loadAttributionAnalysis();
      } else {
        loadModelComparison();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel, dateRange, viewMode, loadAttributionAnalysis]);

  const loadModelComparison = async (): Promise<void> => {
    if (!dateRange?.from || !dateRange?.to || models.length < 2) return;

    try {
      setLoading(true);
      setError(null);

      const modelIds = models.slice(0, 4).map(m => m.id); // Compare up to 4 models

      const response = await fetch('/api/growth-analytics/attribution/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
          modelIds,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const data = await response.json();
      setComparison(data);
    } catch (err) {
      console.error('Failed to load model comparison:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !attribution && !comparison) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid="attribution-analysis">
      {/* Controls */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-xs sm:text-sm md:text-base">
            Attribution Analysis
            <InfoIcon className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Analyze multi-touch attribution and understand the customer journey</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <label className="text-xs sm:text-sm font-medium">View Mode:</label>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant={viewMode === 'single' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('single')}
                  className="flex-1 sm:flex-none min-h-[44px]"
                >
                  Single Model
                </Button>
                <Button
                  variant={viewMode === 'compare' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('compare')}
                  className="flex-1 sm:flex-none min-h-[44px]"
                >
                  Compare Models
                </Button>
              </div>
            </div>

            {viewMode === 'single' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium">Attribution Model:</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-full sm:w-64 min-h-[44px]">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} {model.isDefault && '(Default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-destructive text-center">
              <p className="font-medium">Error loading attribution analysis</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Model View */}
      {viewMode === 'single' && attribution && (
        <>
          {/* Attribution Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Conversions</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{attribution.totalConversions.toLocaleString()}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">Attributed conversions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Value</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{formatCurrency(attribution.totalAttributedValue)}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">Attributed revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Avg. Touchpoints</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{attribution.averageTouchpoints.toFixed(1)}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">Per conversion</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Time to Conversion</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{attribution.averageTimeToConversion}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">Average time</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Channel Attribution */}
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm md:text-base">Channel Attribution</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Revenue attributed to each channel</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={attribution.channels}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={formatChannelTooltip} />
                    <Legend />
                    <Bar dataKey="attributedValue" fill="hsl(var(--chart-5))" />
                    <Bar dataKey="conversions" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Touchpoint Positions */}
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm md:text-base">Touchpoint Positions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Attribution by position in customer journey</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={attribution.touchpointPositions}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={formatPieChartLabel}
                      outerRadius={60}
                      fill="hsl(var(--chart-5))"
                      dataKey="attributedValue"
                    >
                      {attribution.touchpointPositions.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={formatPieTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Channel Performance */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-xs sm:text-sm md:text-base">Detailed Channel Performance</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Attribution breakdown with first-touch, last-touch, and assisted conversions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-2 py-1 sm:px-3 sm:py-2">Channel</th>
                      <th className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden sm:table-cell">Attribution Value</th>
                      <th className="text-right px-2 py-1 sm:px-3 sm:py-2">Attribution %</th>
                      <th className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden md:table-cell">First Touch</th>
                      <th className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden lg:table-cell">Last Touch</th>
                      <th className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden lg:table-cell">Assisted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attribution.channels.map((channel, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-2 py-1 sm:px-3 sm:py-2 font-medium">{channel.channel}</td>
                        <td className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden sm:table-cell">{formatCurrency(channel.attributedValue)}</td>
                        <td className="text-right px-2 py-1 sm:px-3 sm:py-2">{channel.attributedPercentage.toFixed(1)}%</td>
                        <td className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden md:table-cell">{channel.firstTouchConversions}</td>
                        <td className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden lg:table-cell">{channel.lastTouchConversions}</td>
                        <td className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden lg:table-cell">{channel.assistedConversions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Model Comparison View */}
      {viewMode === 'compare' && comparison && (
        <>
          {/* Model Comparison Summary */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-xs sm:text-sm md:text-base">Attribution Model Comparison</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Compare how different attribution models affect channel valuation</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-2 py-1 sm:px-3 sm:py-2">Model</th>
                      <th className="text-center px-2 py-1 sm:px-3 sm:py-2 hidden sm:table-cell">Type</th>
                      <th className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden md:table-cell">Conversions</th>
                      <th className="text-right px-2 py-1 sm:px-3 sm:py-2">Total Value</th>
                      <th className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden lg:table-cell">Top Channel</th>
                      <th className="text-right px-2 py-1 sm:px-3 sm:py-2">Top %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.models.map((model, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-2 py-1 sm:px-3 sm:py-2 font-medium">{model.modelName}</td>
                        <td className="text-center px-2 py-1 sm:px-3 sm:py-2 hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs">{model.modelType}</Badge>
                        </td>
                        <td className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden md:table-cell">{model.totalConversions.toLocaleString()}</td>
                        <td className="text-right px-2 py-1 sm:px-3 sm:py-2">{formatCurrency(model.totalAttributedValue)}</td>
                        <td className="text-right px-2 py-1 sm:px-3 sm:py-2 hidden lg:table-cell">{model.topChannel}</td>
                        <td className="text-right px-2 py-1 sm:px-3 sm:py-2">{model.topChannelPercentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Channel Variance Analysis */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-xs sm:text-sm md:text-base">Channel Attribution Variance</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Shows how much channel attribution varies across different models</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="space-y-3 sm:space-y-4">
                {comparison.channelComparisons.map((channel, channelIndex) => (
                  <div key={channelIndex} className="border rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-3">
                      <h4 className="font-medium text-xs sm:text-sm md:text-base">{channel.channel}</h4>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Variance: {channel.variancePercentage.toFixed(1)}%
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={channel.modelResults}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="modelName" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={formatPieTooltip} />
                        <Bar dataKey="attributedValue" fill={COLORS[channelIndex % COLORS.length]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!attribution && !comparison && !loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Select a date range and attribution model to view analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
