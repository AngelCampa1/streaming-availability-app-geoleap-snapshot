'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

interface ConversionFunnelsProps {
  dateRange?: DateRange;
  className?: string;
}

interface FunnelAnalysis {
  funnelId: string;
  funnelName: string;
  analysisDate: string;
  startDate: string;
  endDate: string;
  stepResults: FunnelStepResult[];
  totalUsers: number;
  completedUsers: number;
  overallConversionRate: number;
  averageTimeToComplete: string;
}

interface FunnelStepResult {
  stepId: string;
  stepName: string;
  order: number;
  usersEntered: number;
  usersCompleted: number;
  usersDropped: number;
  conversionRate: number;
  dropOffRate: number;
  averageTimeInStep: string;
  medianTimeInStep: string;
  targetRate?: number;
  performance?: number;
}

interface Funnel {
  id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  isActive: boolean;
}

interface FunnelStep {
  id: string;
  name: string;
  order: number;
  eventNames: string[];
  isRequired: boolean;
  targetRate?: number;
}

/**
 * Conversion Funnel Analysis with step-by-step breakdown
 */
export function ConversionFunnels({ dateRange, className }: ConversionFunnelsProps) {
  const [selectedFunnel, setSelectedFunnel] = useState<string>('');
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [analysis, setAnalysis] = useState<FunnelAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFunnels();
  }, []);

  useEffect(() => {
    if (selectedFunnel && dateRange?.from && dateRange?.to) {
      loadFunnelAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFunnel, dateRange]);

  const loadFunnels = async (): Promise<void> => {
    try {
      const response = await fetch('/api/growth-analytics/funnels');
      if (!response.ok) throw new Error('Failed to load funnels');

      const funnelsData = await response.json();
      setFunnels(funnelsData);

      // Select first active funnel
      const activeFunnel = funnelsData.find((f: Funnel) => f.isActive);
      if (activeFunnel) {
        setSelectedFunnel(activeFunnel.id);
      } else if (funnelsData.length > 0) {
        setSelectedFunnel(funnelsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load funnels:', err);
      setError(err instanceof Error ? err.message : 'Failed to load funnels');
    } finally {
      setLoading(false);
    }
  };

  const loadFunnelAnalysis = async (): Promise<void> => {
    // Note: Conditions checked by useEffect before calling this function
    if (!dateRange?.from || !dateRange?.to) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
        funnelId: selectedFunnel,
      });

      const response = await fetch(`/api/growth-analytics/funnels/analysis?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Failed to load funnel analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to load funnel data');
    } finally {
      setLoading(false);
    }
  };

  const getStepColor = (conversionRate: number, targetRate: number): string => {
    // Note: targetRate is required - null case handled at call site
    const performance = (conversionRate / targetRate) * 100;
    if (performance >= 100) return 'bg-success';
    if (performance >= 80) return 'bg-warning';
    return 'bg-error';
  };

  const getPerformanceIndicator = (performance: number): React.ReactNode => {
    // Note: Only called when performance is truthy (see conditional rendering)
    if (performance >= 100) {
      return <TrendingUpIcon className="h-4 w-4 text-success" />;
    }
    if (performance >= 80) {
      return <TrendingDownIcon className="h-4 w-4 text-warning" />;
    }
    return <TrendingDownIcon className="h-4 w-4 text-error" />;
  };

  if (loading && !analysis) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="animate-pulse space-y-3 sm:space-y-4">
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
              <div className="h-40 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-3 sm:space-y-4 md:space-y-6 ${className}`}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Conversion Funnel Analysis</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Analyze user flow and identify optimization opportunities</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <label className="text-xs sm:text-sm font-medium">Funnel:</label>
              <Select value={selectedFunnel} onValueChange={setSelectedFunnel}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select funnel" />
                </SelectTrigger>
                <SelectContent>
                  {funnels.map(funnel => (
                    <SelectItem key={funnel.id} value={funnel.id}>
                      {funnel.name} {!funnel.isActive && '(Inactive)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-destructive text-center">
              <p className="font-medium text-sm sm:text-base">Error loading funnel analysis</p>
              <p className="text-xs sm:text-sm mt-1 sm:mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <>
          {/* Funnel Summary */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{analysis.totalUsers.toLocaleString()}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">Entered funnel</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Completed Users</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{analysis.completedUsers.toLocaleString()}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">Reached final step</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{analysis.overallConversionRate.toFixed(2)}%</div>
                <p className="text-xs sm:text-sm text-muted-foreground">Overall funnel</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 p-3 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-medium">Avg. Time</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold">{analysis.averageTimeToComplete}</div>
                <p className="text-xs sm:text-sm text-muted-foreground">To complete</p>
              </CardContent>
            </Card>
          </div>

          {/* Funnel Visualization */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-lg sm:text-xl">Funnel Flow</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Visual representation of user flow through funnel steps</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                {analysis.stepResults.map((step, index) => {
                  const isLast = index === analysis.stepResults.length - 1;
                  const nextStep = analysis.stepResults[index + 1];
                  const dropOffUsers = nextStep ? step.usersCompleted - nextStep.usersEntered : 0;

                  // Extract ternary for better test coverage
                  const progressColor = step.targetRate
                    ? getStepColor(step.conversionRate, step.targetRate)
                    : 'bg-primary';

                  return (
                    <div key={step.stepId} className="relative">
                      {/* Step Card */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-card">
                        {/* Step Number */}
                        <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-medium">
                          {step.order}
                        </div>

                        {/* Step Info */}
                        <div className="flex-1 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 sm:mb-3">
                            <h3 className="font-medium text-sm sm:text-base">{step.stepName}</h3>
                            {step.performance && (
                              <div className="flex items-center gap-2">
                                {getPerformanceIndicator(step.performance)}
                                <Badge
                                  className="text-xs sm:text-sm"
                                  variant={
                                    step.performance >= 100
                                      ? 'default'
                                      : step.performance >= 80
                                        ? 'secondary'
                                        : 'destructive'
                                  }
                                >
                                  {step.performance.toFixed(0)}% vs target
                                </Badge>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3 sm:mb-4">
                            <Progress
                              value={step.conversionRate}
                              className="h-2 sm:h-3"
                              style={
                                {
                                  '--progress-foreground': progressColor,
                                } as React.CSSProperties
                              }
                            />
                          </div>

                          {/* Metrics - Responsive Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm">
                            <div>
                              <span className="text-muted-foreground text-xs">Entered:</span>
                              <div className="font-medium text-sm sm:text-base">{step.usersEntered.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Completed:</span>
                              <div className="font-medium text-sm sm:text-base">{step.usersCompleted.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Conversion:</span>
                              <div className="font-medium text-sm sm:text-base">{step.conversionRate.toFixed(2)}%</div>
                            </div>
                            <div className="hidden sm:block">
                              <span className="text-muted-foreground text-xs">Drop-off:</span>
                              <div className="font-medium text-error text-sm sm:text-base">{step.dropOffRate.toFixed(2)}%</div>
                            </div>
                            <div className="hidden lg:flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="text-muted-foreground text-xs">Avg:</span>
                                <span className="font-medium text-sm">{step.averageTimeInStep}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Drop-off Indicator */}
                      {!isLast && dropOffUsers > 0 && (
                        <div className="mt-2 sm:absolute sm:left-4 sm:-bottom-3 flex items-center gap-2 text-xs sm:text-sm text-error">
                          <TrendingDownIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>{dropOffUsers.toLocaleString()} users dropped off</span>
                        </div>
                      )}

                      {/* Connector Line - Hidden on mobile */}
                      {!isLast && <div className="hidden sm:absolute sm:block sm:left-7 sm:-bottom-6 w-0.5 h-12 bg-border"></div>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Step Performance */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-lg sm:text-xl">Step Performance Details</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Detailed metrics for each funnel step with targets and performance</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 sm:p-3">Step</th>
                      <th className="text-right p-2 sm:p-3 hidden sm:table-cell">Users Entered</th>
                      <th className="text-right p-2 sm:p-3 hidden md:table-cell">Users Completed</th>
                      <th className="text-right p-2 sm:p-3">Conv. Rate</th>
                      <th className="text-right p-2 sm:p-3 hidden lg:table-cell">Target Rate</th>
                      <th className="text-right p-2 sm:p-3">Perf.</th>
                      <th className="text-right p-2 sm:p-3 hidden lg:table-cell">Avg. Time</th>
                      <th className="text-right p-2 sm:p-3 hidden 2xl:table-cell">Median Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.stepResults.map((step, index) => {
                      // Extract ternaries for better test coverage
                      const targetRateDisplay = step.targetRate ? `${step.targetRate.toFixed(2)}%` : '-';
                      const performanceDisplay = step.performance ? (
                        <span
                          className={
                            step.performance >= 100
                              ? 'text-success'
                              : step.performance >= 80
                                ? 'text-warning'
                                : 'text-error'
                          }
                        >
                          {step.performance.toFixed(0)}%
                        </span>
                      ) : (
                        '-'
                      );

                      return (
                        <tr key={index} className="border-b last:border-0">
                          <td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">{step.stepName}</td>
                          <td className="text-right p-2 sm:p-3 hidden sm:table-cell text-xs sm:text-sm">{step.usersEntered.toLocaleString()}</td>
                          <td className="text-right p-2 sm:p-3 hidden md:table-cell text-xs sm:text-sm">{step.usersCompleted.toLocaleString()}</td>
                          <td className="text-right p-2 sm:p-3 text-xs sm:text-sm">{step.conversionRate.toFixed(2)}%</td>
                          <td className="text-right p-2 sm:p-3 hidden lg:table-cell text-xs sm:text-sm">{targetRateDisplay}</td>
                          <td className="text-right p-2 sm:p-3 text-xs sm:text-sm">{performanceDisplay}</td>
                          <td className="text-right p-2 sm:p-3 hidden lg:table-cell text-xs sm:text-sm">{step.averageTimeInStep}</td>
                          <td className="text-right p-2 sm:p-3 hidden 2xl:table-cell text-xs sm:text-sm">{step.medianTimeInStep}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!analysis && !loading && (
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <p className="text-center text-xs sm:text-sm text-muted-foreground">Select a funnel and date range to view analysis</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
