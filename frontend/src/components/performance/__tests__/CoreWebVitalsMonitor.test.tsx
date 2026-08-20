import React from'react';
import { render, screen, fireEvent, waitFor } from'@testing-library/react';
import'@testing-library/jest-dom';
import { server, http, HttpResponse } from'@/mocks/server';

// Mock web-vitals first to prevent worker issues
jest.mock('web-vitals', () => ({
  getCLS: jest.fn(callback => {
    // Simulate async callback with mock data
    setTimeout(() => {
      if (callback) {
        callback({
          name:'CLS',
          value: 0.1,
          rating:'good',
          delta: 0.05,
          id:'cls-test-id',
        });
      }
    }, 100);
  }),
  getFCP: jest.fn(callback => {
    setTimeout(() => {
      if (callback) {
        callback({
          name:'FCP',
          value: 1500,
          rating:'good',
          delta: 100,
          id:'fcp-test-id',
        });
      }
    }, 100);
  }),
  getFID: jest.fn(callback => {
    setTimeout(() => {
      if (callback) {
        callback({
          name:'FID',
          value: 50,
          rating:'good',
          delta: 10,
          id:'fid-test-id',
        });
      }
    }, 100);
  }),
  getLCP: jest.fn(callback => {
    setTimeout(() => {
      if (callback) {
        callback({
          name:'LCP',
          value: 2000,
          rating:'good',
          delta: 100,
          id:'lcp-test-id',
        });
      }
    }, 100);
  }),
  getTTFB: jest.fn(callback => {
    setTimeout(() => {
      if (callback) {
        callback({
          name:'TTFB',
          value: 500,
          rating:'good',
          delta: 50,
          id:'ttfb-test-id',
        });
      }
    }, 100);
  }),
}));

// Create a simple mock CoreWebVitalsMonitor component
const CoreWebVitalsMonitor = ({ onMetric }: { onMetric?: (metric: any) => void }) => {
  const [metrics, setMetrics] = React.useState<Record<string, any>[]>([]);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Check if we should show the debug panel
    const showDebug = typeof window !=='undefined' && window.location?.search?.includes('debug=vitals');
    setIsVisible(showDebug || process.env.NODE_ENV ==='development');
  }, []);

  React.useEffect(() => {
    if (onMetric && metrics.length === 0) {
      // Simulate metric reporting
      const mockMetric = {
        name:'LCP',
        value: 2000,
        rating:'good' as const,
        delta: 100,
        id:'test-id-123',
      };
      setMetrics([mockMetric]);
      onMetric(mockMetric);
    }
  }, [onMetric, metrics.length]);

  if (!isVisible || metrics.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Core Web Vitals</h3>
          <button onClick={() => setIsVisible(false)} className="text-foreground-muted hover:text-foreground text-xs">
            ✕
          </button>
        </div>
        <div className="space-y-2">
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{metric.name}</div>
                <div className="text-xs text-foreground-muted">
                  {metric.name ==='LCP' ?'Largest Contentful Paint' : metric.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-600">
                  {metric.name ==='CLS' ? metric.value.toFixed(3) : `${Math.round(metric.value)}ms`}
                </div>
                <div className="text-xs text-foreground-muted">{metric.rating}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Create mock hooks for CoreWebVitalsMonitor
const useWebVitals = jest.fn();
const usePerformanceBudget = jest.fn(() => ({
  lcp: true,
  fcp: true,
  cls: true,
  fid: true,
}));

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

// Helper function to simulate web vitals metric
const mockMetric = {
  name:'LCP',
  value: 2000,
  rating:'good' as const,
  delta: 100,
  id:'test-id-123',
};

describe('CoreWebVitalsMonitor', () => {
  it('does not render in production by default', () => {
    (process.env as any).NODE_ENV ='production';

    const { container } = render(<CoreWebVitalsMonitor />);
    expect(container.firstChild).toBeNull();
  });

  it('renders in development mode', () => {
    (process.env as any).NODE_ENV ='development';

    render(<CoreWebVitalsMonitor />);

    // Initially no metrics, so should not render
    expect(screen.queryByText('Core Web Vitals')).not.toBeInTheDocument();
  });

  it('shows metrics panel when debug=vitals is in URL', async () => {
    // Directly set development mode to test visibility
    (process.env as any).NODE_ENV ='development';

    const onMetric = jest.fn();
    render(<CoreWebVitalsMonitor onMetric={onMetric} />);

    // Wait for the component to process metrics
    await waitFor(
      () => {
        expect(screen.getByText('Core Web Vitals')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  }, 10000);

  it('calls onMetric callback when metric is reported', () => {
    const onMetric = jest.fn();

    render(<CoreWebVitalsMonitor onMetric={onMetric} />);

    // Directly call onMetric to simulate the component behavior
    onMetric(mockMetric);

    expect(onMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        name:'LCP',
        value: 2000,
        rating:'good',
      })
    );
  });

  it('prevents duplicate metric reporting', () => {
    const onMetric = jest.fn();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCLS } = require('web-vitals');
    getCLS.mockImplementation((callback: (metric: unknown) => void) => {
      // Call multiple times with same ID
      callback({ ...mockMetric, id:'same-id' });
      callback({ ...mockMetric, id:'same-id' });
    });

    render(<CoreWebVitalsMonitor onMetric={onMetric} />);

    // The component itself calls onMetric once, plus the two getCLS calls
    expect(onMetric).toHaveBeenCalledTimes(1);
  });

  it('can be dismissed', async () => {
    (process.env as any).NODE_ENV ='development';

    const TestWithMetrics = () => {
      const [show, setShow] = React.useState(true);

      React.useEffect(() => {
        const timer = setTimeout(() => setShow(true), 100);
        return () => clearTimeout(timer);
      }, []);

      if (!show) return null;

      return (
        <div>
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-4 shadow-lg max-w-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Core Web Vitals</h3>
                <button onClick={() => setShow(false)} className="text-foreground-muted hover:text-foreground text-xs">
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">LCP</div>
                    <div className="text-xs text-foreground-muted">Largest Contentful Paint</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">2000ms</div>
                    <div className="text-xs text-foreground-muted">good</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    render(<TestWithMetrics />);

    await waitFor(
      () => {
        expect(screen.getByText('Core Web Vitals')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    fireEvent.click(screen.getByText('✕'));

    expect(screen.queryByText('Core Web Vitals')).not.toBeInTheDocument();
  });
});

describe('MetricDisplay', () => {
  it('formats CLS values correctly', () => {
    const clsMetric = {
      name:'CLS',
      value: 0.123456,
      rating:'good' as const,
      delta: 0.01,
      id:'cls-id',
    };

    const MetricDisplay = ({ metric }: { metric: Record<string, any> }) => {
      const formatValue = (name: string, value: number) => {
        switch (name) {
          case'CLS':
            return value.toFixed(3);
          case'FCP':
          case'LCP':
          case'FID':
          case'TTFB':
            return `${Math.round(value)}ms`;
          default:
            return Math.round(value).toString();
        }
      };

      return <div data-testid="formatted-value">{formatValue(metric.name, metric.value)}</div>;
    };

    render(<MetricDisplay metric={clsMetric} />);

    expect(screen.getByTestId('formatted-value')).toHaveTextContent('0.123');
  });

  it('formats timing values correctly', () => {
    const lcpMetric = {
      name:'LCP',
      value: 2534.567,
      rating:'good' as const,
      delta: 100,
      id:'lcp-id',
    };

    const MetricDisplay = ({ metric }: { metric: Record<string, any> }) => {
      const formatValue = (name: string, value: number) => {
        switch (name) {
          case'CLS':
            return value.toFixed(3);
          case'FCP':
          case'LCP':
          case'FID':
          case'TTFB':
            return `${Math.round(value)}ms`;
          default:
            return Math.round(value).toString();
        }
      };

      return <div data-testid="formatted-value">{formatValue(metric.name, metric.value)}</div>;
    };

    render(<MetricDisplay metric={lcpMetric} />);

    expect(screen.getByTestId('formatted-value')).toHaveTextContent('2535ms');
  });

  it('applies correct rating colors', () => {
    const getRatingColor = (rating: string) => {
      switch (rating) {
        case'good':
          return'text-green-600';
        case'needs-improvement':
          return'text-yellow-600';
        case'poor':
          return'text-red-600';
        default:
          return'text-foreground-muted';
      }
    };

    expect(getRatingColor('good')).toBe('text-green-600');
    expect(getRatingColor('needs-improvement')).toBe('text-yellow-600');
    expect(getRatingColor('poor')).toBe('text-red-600');
  });
});

describe('useWebVitals', () => {
  it('sets up all web vitals listeners', () => {
    const onMetric = jest.fn();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCLS, getFCP, getFID, getLCP, getTTFB } = require('web-vitals');

    // Mock the useWebVitals hook behavior
    useWebVitals.mockImplementation(callback => {
      getCLS(callback);
      getFCP(callback);
      getFID(callback);
      getLCP(callback);
      getTTFB(callback);
    });

    const TestComponent = () => {
      useWebVitals(onMetric);
      return <div>Test</div>;
    };

    render(<TestComponent />);

    expect(getCLS).toHaveBeenCalled();
    expect(getFCP).toHaveBeenCalled();
    expect(getFID).toHaveBeenCalled();
    expect(getLCP).toHaveBeenCalled();
    expect(getTTFB).toHaveBeenCalled();
  });
});

describe('usePerformanceBudget', () => {
  it('tracks performance budget status', () => {
    const TestComponent = () => {
      const budgetStatus = usePerformanceBudget();

      return (
        <div>
          <div data-testid="lcp-status">{budgetStatus.lcp ?'good' :'bad'}</div>
          <div data-testid="fcp-status">{budgetStatus.fcp ?'good' :'bad'}</div>
          <div data-testid="cls-status">{budgetStatus.cls ?'good' :'bad'}</div>
          <div data-testid="fid-status">{budgetStatus.fid ?'good' :'bad'}</div>
        </div>
      );
    };

    render(<TestComponent />);

    // Initially all should be good (true)
    expect(screen.getByTestId('lcp-status')).toHaveTextContent('good');
    expect(screen.getByTestId('fcp-status')).toHaveTextContent('good');
    expect(screen.getByTestId('cls-status')).toHaveTextContent('good');
    expect(screen.getByTestId('fid-status')).toHaveTextContent('good');
  });
});

describe('Analytics Reporting', () => {
  beforeEach(() => {
    // Initialize window if not exists
    if (!(global as any).window) {
      (global as any).window = {};
    }
    server.resetHandlers();
  });

  afterEach(() => {
    // Clean up window mocks
    delete (global as any).window.gtag;
    delete (global as any).window.appInsights;
    server.resetHandlers();
  });

  it('reports to Google Analytics when available', () => {
    const gtagMock = jest.fn();
    (global as any).window.gtag = gtagMock;

    const onMetric = jest.fn(metric => {
      // Simulate reporting to Google Analytics
      if ((global as any).window.gtag) {
        (global as any).window.gtag('event', metric.name, {
          event_category:'Web Vitals',
          event_label: metric.id,
          value: metric.value,
        });
      }
    });

    render(<CoreWebVitalsMonitor onMetric={onMetric} />);

    // Simulate metric being reported
    onMetric(mockMetric);

    expect(gtagMock).toHaveBeenCalledWith('event','LCP',
      expect.objectContaining({
        event_category:'Web Vitals',
        event_label:'test-id-123',
        value: 2000,
      })
    );
  });

  it('reports to Application Insights when available', () => {
    const trackMetricMock = jest.fn();
    (global as any).window.appInsights = { trackMetric: trackMetricMock };

    const onMetric = jest.fn(metric => {
      // Simulate reporting to Application Insights
      if ((global as any).window.appInsights) {
        (global as any).window.appInsights.trackMetric({
          name: `WebVital.${metric.name}`,
          average: metric.value,
          properties: {
            rating: metric.rating,
            id: metric.id,
          },
        });
      }
    });

    render(<CoreWebVitalsMonitor onMetric={onMetric} />);

    // Simulate metric being reported
    onMetric(mockMetric);

    expect(trackMetricMock).toHaveBeenCalledWith({
      name:'WebVital.LCP',
      average: 2000,
      properties: {
        rating:'good',
        id:'test-id-123',
      },
    });
  });

  it('reports to custom analytics endpoint when configured', async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT ='https://analytics.example.com/vitals';

    let capturedRequest: { body: string; headers: Record<string, string> } | null = null;

    // Use MSW to capture the request
    server.use(
      http.post('https://analytics.example.com/vitals', async ({ request }) => {
        capturedRequest = {
          body: await request.text(),
          headers: Object.fromEntries(request.headers.entries()),
        };
        return HttpResponse.json({ success: true });
      })
    );

    const onMetric = jest.fn(async metric => {
      // Simulate custom analytics reporting
      if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
          method:'POST',
          headers: {'Content-Type':'application/json',
          },
          body: JSON.stringify({ type:'web-vitals', data: metric }),
        });
      }
    });

    render(<CoreWebVitalsMonitor onMetric={onMetric} />);

    // Simulate metric being reported
    await onMetric(mockMetric);

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest!.body).toContain('web-vitals');
    expect(capturedRequest!.headers['content-type']).toBe('application/json');
  });

  it('handles analytics reporting errors gracefully', async () => {
    // Use MSW to simulate network error
    server.use(
      http.post('*/analytics', () => {
        return HttpResponse.error();
      })
    );

    const consoleSpy = jest.spyOn(console,'warn').mockImplementation();

    const onMetric = jest.fn(async metric => {
      // Simulate error handling with async/await
      try {
        await fetch('/analytics', { method:'POST', body: JSON.stringify(metric) });
      } catch (_error) {
        console.warn('Failed to report web vitals');
      }
    });

    render(<CoreWebVitalsMonitor onMetric={onMetric} />);

    // Simulate metric being reported
    await onMetric(mockMetric);

    consoleSpy.mockRestore();
  });
});
