/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  TrendingDown,
  Download,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';


// Chart data interfaces
interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
  category?: string;
  metadata?: Record<string, any>;
}

interface TimeSeriesDataPoint extends ChartDataPoint {
  date: string;
  value: number;
  previousValue?: number;
}

interface CohortDataPoint {
  cohortMonth: string;
  period: number;
  retentionRate: number;
  userCount: number;
  revenue: number;
}

interface FunnelDataPoint {
  stage: string;
  value: number;
  percentage: number;
  conversionRate?: number;
}


interface RevenueGrowthChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  className?: string;
  showComparison?: boolean;
}

interface CohortHeatmapProps {
  data: CohortDataPoint[];
  title?: string;
  className?: string;
  metric?: 'retentionRate' | 'userCount' | 'revenue';
}

interface SubscriptionFunnelProps {
  data: FunnelDataPoint[];
  title?: string;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}

interface ChurnPredictionChartProps {
  data: Array<{
    date: string;
    predictedChurn: number;
    actualChurn?: number;
    confidence: number;
  }>;
  title?: string;
  className?: string;
}

// Utility functions
const formatCurrency = (value: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
};

const formatPercentage = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};


// Advanced Revenue Growth Chart with trend analysis
export const RevenueGrowthChart: React.FC<RevenueGrowthChartProps> = ({
  data,
  title = 'Revenue Growth Trend',
  className = '',
  showComparison: _showComparison = true,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '3m' | '6m' | '1y'>('all');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');

  const filteredData = useMemo(() => {
    const now = new Date();
    const cutoffDate = {
      all: new Date(0),
      '3m': new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
      '6m': new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
      '1y': new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
    }[selectedPeriod];

    return data.filter(point => new Date(point.date) >= cutoffDate);
  }, [data, selectedPeriod]);

  const maxValue = Math.max(...filteredData.map(d => d.value));
  const minValue = Math.min(...filteredData.map(d => d.value));
  const valueRange = maxValue - minValue;

  return (
    <Card className={`p-6 ${className}`}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">Track revenue performance over time</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Period Selection */}
          <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
            {['all', '3m', '6m', '1y'].map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period as 'all' | '3m' | '6m' | '1y')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedPeriod === period ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {period.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Chart Type Selection */}
          <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
            {[
              { type: 'area', icon: '▲' },
              { type: 'line', icon: '📈' },
              { type: 'bar', icon: '📊' },
            ].map(({ type, icon }) => (
              <button
                key={type}
                onClick={() => setChartType(type as 'line' | 'area' | 'bar')}
                className={`px-2 py-1 rounded-full text-xs transition-all ${
                  chartType === type ? 'bg-card shadow-sm' : 'hover:bg-card/50'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-80 overflow-hidden">
        <svg width="100%" height="100%" viewBox="0 0 800 320" className="w-full h-full">
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          <g className="opacity-20">
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={i}
                x1="60"
                y1={60 + i * 50}
                x2="740"
                y2={60 + i * 50}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            ))}
          </g>

          {/* Chart Area/Line */}
          {chartType === 'area' && (
            <>
              <path
                d={`M 60 ${260 - ((filteredData[0]?.value - minValue) / valueRange) * 200} ${filteredData
                  .map((point, index) => {
                    const x = 60 + index * (680 / (filteredData.length - 1));
                    const y = 260 - ((point.value - minValue) / valueRange) * 200;
                    return `L ${x} ${y}`;
                  })
                  .join(' ')} L ${60 + 680} 260 L 60 260 Z`}
                fill="url(#revenueGradient)"
                className="transition-all duration-500"
              />
              <path
                d={`M 60 ${260 - ((filteredData[0]?.value - minValue) / valueRange) * 200} ${filteredData
                  .map((point, index) => {
                    const x = 60 + index * (680 / (filteredData.length - 1));
                    const y = 260 - ((point.value - minValue) / valueRange) * 200;
                    return `L ${x} ${y}`;
                  })
                  .join(' ')}`}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                className="transition-all duration-500"
              />
            </>
          )}

          {/* Data Points */}
          {filteredData.map((point, index) => {
            const x = 60 + index * (680 / (filteredData.length - 1));
            const y = 260 - ((point.value - minValue) / valueRange) * 200;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="hsl(var(--primary))"
                stroke="hsl(var(--background))"
                strokeWidth="2"
                className="cursor-pointer hover:r-6 transition-all duration-200"
              >
                <title>
                  {new Date(point.date).toLocaleDateString()}: {formatCurrency(point.value)}
                </title>
              </circle>
            );
          })}

          {/* Y-Axis Labels */}
          {[0, 1, 2, 3, 4].map(i => {
            const value = minValue + (valueRange * (4 - i)) / 4;
            return (
              <text key={i} x="50" y={65 + i * 50} textAnchor="end" className="text-xs fill-gray-500">
                {formatCurrency(value)}
              </text>
            );
          })}

          {/* X-Axis Labels */}
          {filteredData
            .filter((_, index) => index % Math.ceil(filteredData.length / 6) === 0)
            .map((point, index) => {
              const originalIndex = filteredData.findIndex(p => p === point);
              const x = 60 + originalIndex * (680 / (filteredData.length - 1));
              return (
                <text key={index} x={x} y="285" textAnchor="middle" className="text-xs fill-gray-500">
                  {new Date(point.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </text>
              );
            })}
        </svg>

        {/* Performance Indicators */}
        <div className="absolute top-4 right-4 space-y-2">
          <div className="bg-card/90 backdrop-blur rounded-lg p-3 shadow-lg border border-border">
            <div className="text-xs text-muted-foreground mb-1">Current MRR</div>
            <div className="text-sm font-semibold text-foreground">
              {formatCurrency(filteredData[filteredData.length - 1]?.value || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Summary */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Growth: </span>
            <span className="font-medium text-success">
              {filteredData.length > 1
                ? formatPercentage(
                    (filteredData[filteredData.length - 1].value - filteredData[0].value) / filteredData[0].value
                  )
                : '0%'}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Peak: </span>
            <span className="font-medium text-primary">{formatCurrency(maxValue)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Cohort Retention Heatmap
export const CohortHeatmap: React.FC<CohortHeatmapProps> = ({
  data,
  title = 'Cohort Retention Analysis',
  className = '',
  metric = 'retentionRate',
}) => {
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentMetric, setMetric] = useState(metric);

  const cohortMatrix = useMemo(() => {
    const matrix: Record<string, CohortDataPoint[]> = {};
    data.forEach(point => {
      if (!matrix[point.cohortMonth]) {
        matrix[point.cohortMonth] = [];
      }
      matrix[point.cohortMonth].push(point);
    });

    // Sort periods for each cohort
    Object.keys(matrix).forEach(cohort => {
      matrix[cohort].sort((a, b) => a.period - b.period);
    });

    return matrix;
  }, [data]);

  const cohortMonths = Object.keys(cohortMatrix).sort();
  const maxPeriod = Math.max(...data.map(d => d.period));
  const maxValue = Math.max(...data.map(d => d[currentMetric] as number));

  const getHeatmapColor = (value: number) => {
    if (currentMetric === 'retentionRate') {
      const intensity = value; // Already a percentage
      if (intensity >= 0.8) return 'bg-success';
      if (intensity >= 0.6) return 'bg-success/70';
      if (intensity >= 0.4) return 'bg-warning';
      if (intensity >= 0.2) return 'bg-warning/70';
      return 'bg-error';
    }

    const intensity = value / maxValue;
    const opacity = Math.max(0.1, intensity);
    return `bg-primary opacity-${Math.round(opacity * 100)}`;
  };

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">Track user retention across different cohorts and time periods</p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={currentMetric}
            onChange={e => setMetric(e.target.value as 'retentionRate' | 'userCount' | 'revenue')}
            className="px-3 py-1 border border-border rounded-md text-sm bg-background text-foreground"
          >
            <option value="retentionRate">Retention Rate</option>
            <option value="userCount">User Count</option>
            <option value="revenue">Revenue</option>
          </select>

          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setZoomLevel(1)}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-auto" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
        <div className="min-w-max">
          {/* Header Row */}
          <div className="flex items-center mb-2">
            <div className="w-24 text-xs font-medium text-foreground pr-2">Cohort Month</div>
            {Array.from({ length: maxPeriod + 1 }, (_, i) => (
              <div key={i} className="w-16 text-center text-xs font-medium text-foreground">
                Period {i}
              </div>
            ))}
          </div>

          {/* Heatmap Rows */}
          {cohortMonths.map(cohortMonth => (
            <div
              key={cohortMonth}
              className={`flex items-center mb-1 ${selectedCohort === cohortMonth ? 'bg-primary/10 rounded' : ''}`}
            >
              <div className="w-24 text-xs text-muted-foreground pr-2 py-2">
                {new Date(cohortMonth).toLocaleDateString('en-US', {
                  month: 'short',
                  year: '2-digit',
                })}
              </div>

              {Array.from({ length: maxPeriod + 1 }, (_, period) => {
                const dataPoint = cohortMatrix[cohortMonth]?.find(d => d.period === period);
                const value = dataPoint ? (dataPoint[currentMetric] as number) : 0;

                return (
                  <div
                    key={period}
                    className={`w-16 h-8 m-0.5 rounded cursor-pointer transition-all hover:scale-110 ${
                      dataPoint ? getHeatmapColor(value) : 'bg-muted'
                    }`}
                    onClick={() => setSelectedCohort(selectedCohort === cohortMonth ? null : cohortMonth)}
                    title={
                      dataPoint
                        ? `${cohortMonth} - Period ${period}: ${
                            metric === 'retentionRate'
                              ? formatPercentage(value)
                              : metric === 'revenue'
                                ? formatCurrency(value)
                                : formatNumber(value)
                          }`
                        : 'No data'
                    }
                  >
                    {dataPoint && (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white drop-shadow">
                          {metric === 'retentionRate'
                            ? `${Math.round(value * 100)}%`
                            : metric === 'revenue'
                              ? `$${Math.round(value / 1000)}k`
                              : Math.round(value)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">Legend:</div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-success rounded"></div>
            <span className="text-xs">High</span>
            <div className="w-4 h-4 bg-warning rounded"></div>
            <span className="text-xs">Medium</span>
            <div className="w-4 h-4 bg-error rounded"></div>
            <span className="text-xs">Low</span>
          </div>
        </div>

        {selectedCohort && (
          <div className="text-sm text-primary">
            Selected:{' '}
            {new Date(selectedCohort).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

// Subscription Conversion Funnel
export const SubscriptionFunnel: React.FC<SubscriptionFunnelProps> = ({
  data,
  title = 'Subscription Conversion Funnel',
  className = '',
  orientation: _orientation = 'vertical',
}) => {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">Track conversion rates through subscription stages</p>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-3">
        {data.map((stage, index) => {
          const widthPercentage = (stage.value / maxValue) * 100;
          const isSelected = selectedStage === stage.stage;

          return (
            <div
              key={stage.stage}
              className={`cursor-pointer transition-all duration-200 ${isSelected ? 'scale-105' : 'hover:scale-102'}`}
              onClick={() => setSelectedStage(isSelected ? null : stage.stage)}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium text-foreground">{stage.stage}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground">{formatNumber(stage.value)}</span>
                  <Badge variant="outline">{formatPercentage(stage.percentage / 100)}</Badge>
                  {stage.conversionRate !== undefined && (
                    <Badge className="bg-success/10 text-success">{formatPercentage(stage.conversionRate)}</Badge>
                  )}
                </div>
              </div>

              {/* Funnel Bar */}
              <div className="relative">
                <div className="w-full bg-muted rounded-lg h-12 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isSelected
                        ? 'bg-primary'
                        : index === 0
                          ? 'bg-success'
                          : index === data.length - 1
                            ? 'bg-accent'
                            : 'bg-primary/70'
                    }`}
                    style={{ width: `${widthPercentage}%` }}
                  >
                    <div className="flex items-center justify-center h-full">
                      <span className="text-primary-foreground font-medium text-sm">{formatNumber(stage.value)}</span>
                    </div>
                  </div>
                </div>

                {/* Drop-off indicator */}
                {index < data.length - 1 && (
                  <div className="absolute -bottom-6 left-0 w-full flex items-center justify-center">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <TrendingDown className="w-3 h-3" />
                      <span>{formatNumber(stage.value - data[index + 1].value)} drop-off</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{formatNumber(data[0]?.value || 0)}</div>
            <div className="text-sm text-muted-foreground">Total Visitors</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-success">{formatNumber(data[data.length - 1]?.value || 0)}</div>
            <div className="text-sm text-muted-foreground">Conversions</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {data.length > 0 ? formatPercentage(data[data.length - 1].value / data[0].value) : '0%'}
            </div>
            <div className="text-sm text-muted-foreground">Overall Rate</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Churn Prediction Chart with ML insights
export const ChurnPredictionChart: React.FC<ChurnPredictionChartProps> = ({
  data,
  title = 'Churn Prediction Analysis',
  className = '',
}) => {
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true);
  const [timeHorizon, setTimeHorizon] = useState<'30d' | '60d' | '90d'>('30d');

  const maxValue = Math.max(...data.map(d => Math.max(d.predictedChurn, d.actualChurn || 0)));
  const minValue = Math.min(...data.map(d => Math.min(d.predictedChurn, d.actualChurn || 0)));
  const valueRange = maxValue - minValue;

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">AI-powered churn prediction with confidence intervals</p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={timeHorizon}
            onChange={e => setTimeHorizon(e.target.value as '30d' | '60d' | '90d')}
            className="px-3 py-1 border border-border rounded-md text-sm bg-background text-foreground"
          >
            <option value="30d">30 Days</option>
            <option value="60d">60 Days</option>
            <option value="90d">90 Days</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfidenceInterval(!showConfidenceInterval)}
            className={showConfidenceInterval ? 'bg-primary/10 border-primary' : ''}
          >
            <Info className="w-4 h-4 mr-2" />
            Confidence
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-80">
        <svg width="100%" height="100%" viewBox="0 0 800 320" className="w-full h-full">
          <defs>
            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--error))" stopOpacity="0.2" />
              <stop offset="100%" stopColor="hsl(var(--error))" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          <g className="opacity-20">
            {[0, 1, 2, 3, 4].map(i => (
              <line
                key={i}
                x1="60"
                y1={60 + i * 50}
                x2="740"
                y2={60 + i * 50}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            ))}
          </g>

          {/* Confidence Interval */}
          {showConfidenceInterval && (
            <path
              d={`M 60 ${260 - ((data[0]?.predictedChurn - data[0]?.confidence - minValue) / valueRange) * 200} ${data
                .map((point, index) => {
                  const x = 60 + index * (680 / (data.length - 1));
                  const y = 260 - ((point.predictedChurn - point.confidence - minValue) / valueRange) * 200;
                  return `L ${x} ${y}`;
                })
                .join(' ')} ${data
                .reverse()
                .map((point, index) => {
                  const x = 60 + (data.length - 1 - index) * (680 / (data.length - 1));
                  const y = 260 - ((point.predictedChurn + point.confidence - minValue) / valueRange) * 200;
                  return `L ${x} ${y}`;
                })
                .join(' ')} Z`}
              fill="url(#confidenceGradient)"
              className="transition-all duration-500"
            />
          )}

          {/* Predicted Churn Line */}
          <path
            d={`M 60 ${260 - ((data[0]?.predictedChurn - minValue) / valueRange) * 200} ${data
              .map((point, index) => {
                const x = 60 + index * (680 / (data.length - 1));
                const y = 260 - ((point.predictedChurn - minValue) / valueRange) * 200;
                return `L ${x} ${y}`;
              })
              .join(' ')}`}
            fill="none"
            stroke="hsl(var(--error))"
            strokeWidth="3"
            strokeDasharray="5,5"
            className="transition-all duration-500"
          />

          {/* Actual Churn Line */}
          <path
            d={`M 60 ${260 - ((data[0]?.actualChurn || 0 - minValue) / valueRange) * 200} ${data
              .filter(d => d.actualChurn !== undefined)
              .map((point) => {
                const x = 60 + data.findIndex(d => d === point) * (680 / (data.length - 1));
                const y = 260 - ((point.actualChurn! - minValue) / valueRange) * 200;
                return `L ${x} ${y}`;
              })
              .join(' ')}`}
            fill="none"
            stroke="hsl(var(--success))"
            strokeWidth="3"
            className="transition-all duration-500"
          />

          {/* Data Points */}
          {data.map((point, index) => {
            const x = 60 + index * (680 / (data.length - 1));
            const predY = 260 - ((point.predictedChurn - minValue) / valueRange) * 200;
            const actualY =
              point.actualChurn !== undefined ? 260 - ((point.actualChurn - minValue) / valueRange) * 200 : null;

            return (
              <g key={index}>
                {/* Predicted point */}
                <circle
                  cx={x}
                  cy={predY}
                  r="4"
                  fill="hsl(var(--error))"
                  stroke="hsl(var(--background))"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-6 transition-all duration-200"
                >
                  <title>
                    {new Date(point.date).toLocaleDateString()}: Predicted {formatPercentage(point.predictedChurn)}
                    (±{formatPercentage(point.confidence)})
                  </title>
                </circle>

                {/* Actual point */}
                {actualY && (
                  <circle
                    cx={x}
                    cy={actualY}
                    r="4"
                    fill="hsl(var(--success))"
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6 transition-all duration-200"
                  >
                    <title>
                      {new Date(point.date).toLocaleDateString()}: Actual {formatPercentage(point.actualChurn!)}
                    </title>
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-card/90 backdrop-blur rounded-lg p-3 shadow-lg border border-border">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-error" style={{ borderStyle: 'dashed', borderWidth: '1px 0' }}></div>
              <span className="text-xs text-muted-foreground">Predicted</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-success"></div>
              <span className="text-xs text-muted-foreground">Actual</span>
            </div>
            {showConfidenceInterval && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-0.5 bg-error/30"></div>
                <span className="text-xs text-muted-foreground">Confidence</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accuracy Metrics */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-primary">
              {data.filter(d => d.actualChurn !== undefined).length > 0
                ? Math.round(
                    (data
                      .filter(d => d.actualChurn !== undefined)
                      .reduce((acc, d) => acc + (1 - Math.abs(d.predictedChurn - d.actualChurn!) / d.actualChurn!), 0) /
                      data.filter(d => d.actualChurn !== undefined).length) *
                      100
                  )
                : 0}
              %
            </div>
            <div className="text-sm text-muted-foreground">Model Accuracy</div>
          </div>

          <div className="text-center">
            <div className="text-xl font-bold text-warning">
              {data.length > 0 ? Math.round((data.reduce((acc, d) => acc + d.confidence, 0) / data.length) * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Avg Confidence</div>
          </div>

          <div className="text-center">
            <div className="text-xl font-bold text-error">
              {data.length > 0 ? formatPercentage(data[data.length - 1].predictedChurn) : '0%'}
            </div>
            <div className="text-sm text-muted-foreground">Latest Prediction</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const AnalyticsCharts = {
  RevenueGrowthChart,
  CohortHeatmap,
  SubscriptionFunnel,
  ChurnPredictionChart,
};

export default AnalyticsCharts;
