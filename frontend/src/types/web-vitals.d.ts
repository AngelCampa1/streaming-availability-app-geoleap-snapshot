// Type definitions for web-vitals metrics
declare module 'web-vitals' {
  export interface Metric {
    name: string;
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    delta: number;
    id: string;
    navigationType: 'navigate' | 'reload' | 'back_forward' | 'prerender';
  }

  export type ReportHandler = (metric: Metric) => void;

  export interface CLSMetric extends Metric {
    name: 'CLS';
    entries: PerformanceEventTiming[];
  }

  export interface FCPMetric extends Metric {
    name: 'FCP';
    entries: PerformancePaintTiming[];
  }

  export interface FIDMetric extends Metric {
    name: 'FID';
    entries: PerformanceEventTiming[];
  }

  export interface INPMetric extends Metric {
    name: 'INP';
    entries: PerformanceEventTiming[];
  }

  export interface LCPMetric extends Metric {
    name: 'LCP';
    entries: LargestContentfulPaint[];
  }

  export interface TTFBMetric extends Metric {
    name: 'TTFB';
    entries: PerformanceNavigationTiming[];
  }

  export function getCLS(onReport: ReportHandler, opts?: { reportAllChanges?: boolean }): void;
  export function getFCP(onReport: ReportHandler, opts?: { reportAllChanges?: boolean }): void;
  export function getFID(onReport: ReportHandler, opts?: { reportAllChanges?: boolean }): void;
  export function getINP(onReport: ReportHandler, opts?: { reportAllChanges?: boolean }): void;
  export function getLCP(onReport: ReportHandler, opts?: { reportAllChanges?: boolean }): void;
  export function getTTFB(onReport: ReportHandler, opts?: { reportAllChanges?: boolean }): void;
}

// Global types for web vitals in test environments
declare global {
  interface WebVitalsMetrics {
    CLS?: number;
    FCP?: number;
    FID?: number;
    INP?: number;
    LCP?: number;
    TTFB?: number;
    [key: string]: number | undefined;
  }

  interface Window {
    webVitals?: WebVitalsMetrics;
  }
}

export {};
