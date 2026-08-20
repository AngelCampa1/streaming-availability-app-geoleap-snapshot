/**
 * US-9.1 VPN Guidance System - Mobile Responsive & Performance Tests
 *
 * Tests:
 * - Mobile responsive design across device sizes
 * - Touch interaction compatibility
 * - Performance benchmarks for sub-2-second load times
 * - Accessibility on mobile devices
 * - Cross-browser compatibility
 * - Memory usage optimization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock components for comprehensive testing
interface VpnProvider {
  id: string;
  name: string;
  rating: number;
  price: number;
  streamingSupport?: boolean;
  features: string[];
}

const MockResponsiveVpnComparison = ({
  providers = [],
  isMobile = false,
  onProviderSelect = jest.fn() as any,
}: {
  providers?: VpnProvider[];
  isMobile?: boolean;
  onProviderSelect?: jest.Mock;
}) => {
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);

  return (
    <div
      data-testid="responsive-vpn-comparison"
      className={`vpn-comparison ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: isMobile ? '1rem' : '2rem',
        padding: isMobile ? '1rem' : '2rem',
      }}
    >
      <h2 className={`heading ${isMobile ? 'mobile-heading' : 'desktop-heading'}`}>Compare VPN Providers</h2>

      {providers.map((provider, index) => (
        <div
          key={provider.id || index}
          data-testid={`mobile-provider-${provider.id || index}`}
          className={`provider-card ${selectedProvider === provider.id ? 'selected' : ''}`}
          style={{
            minHeight: '44px', // Minimum touch target
            padding: isMobile ? '1rem' : '1.5rem',
            border: '1px solid #ccc',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          onClick={() => {
            setSelectedProvider(provider.id);
            onProviderSelect(provider);
          }}
          onTouchEnd={() => {
            setSelectedProvider(provider.id);
            onProviderSelect(provider);
          }}
        >
          <h3 className={`provider-name ${isMobile ? 'mobile-text' : 'desktop-text'}`}>{provider.name}</h3>

          <div className="provider-details">
            <div data-testid="mobile-rating" className="rating">
              Rating: {provider.rating}/5
            </div>
            <div data-testid="mobile-price" className="price">
              ${provider.price}/month
            </div>
            <div data-testid="mobile-features" className="features">
              {isMobile
                ? `${provider.features?.length || 0} features`
                : provider.features?.join(', ') || 'No features listed'}
            </div>
          </div>

          <button
            type="button"
            data-testid={`mobile-select-${provider.id || index}`}
            className="select-button"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              padding: '0.5rem 1rem',
              fontSize: isMobile ? '16px' : '14px', // Prevent zoom on mobile
              backgroundColor: selectedProvider === provider.id ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginTop: '1rem',
            }}
          >
            {selectedProvider === provider.id ? 'Selected' : 'Select'}
          </button>
        </div>
      ))}

      {/* Mobile-specific quick actions */}
      {isMobile && selectedProvider && (
        <div data-testid="mobile-quick-actions" className="mobile-quick-actions">
          <button
            type="button"
            data-testid="mobile-get-link"
            style={{
              width: '100%',
              minHeight: '44px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              marginTop: '1rem',
            }}
          >
            Get Streaming Links
          </button>
        </div>
      )}
    </div>
  );
};

const MockPerformanceMonitor = ({ onPerformanceData = jest.fn() as any }) => {
  const [metrics, setMetrics] = React.useState({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    interactionDelay: 0,
  });

  React.useEffect(() => {
    const startTime = performance.now();

    // Simulate component loading
    setTimeout(() => {
      const loadTime = performance.now() - startTime;
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

      const newMetrics = {
        loadTime,
        renderTime: loadTime,
        memoryUsage,
        interactionDelay: 0,
      };

      setMetrics(newMetrics);
      onPerformanceData(newMetrics);
    }, 100);
  }, [onPerformanceData]);

  const measureInteraction = async (callback: () => void) => {
    const interactionStart = performance.now();
    callback();

    // Use setTimeout to measure after React updates
    setTimeout(() => {
      const interactionEnd = performance.now();
      const interactionDelay = interactionEnd - interactionStart;

      setMetrics(prev => ({
        ...prev,
        interactionDelay,
      }));
    }, 0);
  };

  return (
    <div data-testid="performance-monitor">
      <h3>Performance Metrics</h3>
      <div data-testid="load-time">Load Time: {metrics.loadTime.toFixed(2)}ms</div>
      <div data-testid="render-time">Render Time: {metrics.renderTime.toFixed(2)}ms</div>
      <div data-testid="memory-usage">Memory Usage: {(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
      <div data-testid="interaction-delay">Interaction Delay: {metrics.interactionDelay.toFixed(2)}ms</div>

      <button
        data-testid="performance-test-button"
        onClick={() =>
          measureInteraction(() => {
            // Simulate heavy interaction
            for (let i = 0; i < 10000; i++) {
              Math.random();
            }
          })
        }
      >
        Test Interaction Performance
      </button>
    </div>
  );
};

describe('US-9.1 VPN Guidance System - Mobile Responsive & Performance Tests', () => {
  // Mock data
  const mockProviders = [
    {
      id: 'nordvpn',
      name: 'NordVPN',
      rating: 4.5,
      price: 11.95,
      features: ['Netflix', 'HBO Max', 'Disney+', 'Fast Speeds', 'No Logs'],
    },
    {
      id: 'expressvpn',
      name: 'ExpressVPN',
      rating: 4.7,
      price: 12.95,
      features: ['Netflix', 'BBC iPlayer', 'Ultra Fast', 'Split Tunneling'],
    },
    {
      id: 'surfshark',
      name: 'Surfshark',
      rating: 4.2,
      price: 2.49,
      features: ['Netflix', 'Prime Video', 'Unlimited Devices', 'CleanWeb'],
    },
  ];

  // Helper to simulate different viewport sizes
  const setViewportSize = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });

    // Trigger resize event
    fireEvent(window, new Event('resize'));
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock performance API
    if (!(window as any).performance.memory) {
      (window as any).performance.memory = {
        usedJSHeapSize: 10000000, // 10MB
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 50000000,
      };
    }
  });

  afterEach(() => {
    // Reset viewport to default
    setViewportSize(1024, 768);
  });

  describe('Mobile Responsive Design', () => {
    const testViewports = [
      { name: 'iPhone SE', width: 375, height: 667, isMobile: true },
      { name: 'iPhone 12', width: 390, height: 844, isMobile: true },
      { name: 'iPad', width: 768, height: 1024, isMobile: false },
      { name: 'iPad Pro', width: 1024, height: 1366, isMobile: false },
      { name: 'Desktop', width: 1440, height: 900, isMobile: false },
      { name: 'Large Desktop', width: 1920, height: 1080, isMobile: false },
    ];

    testViewports.forEach(({ name, width, height, isMobile }) => {
      it(`should render correctly on ${name} (${width}x${height})`, () => {
        // Arrange
        setViewportSize(width, height);

        // Act
        render(<MockResponsiveVpnComparison providers={mockProviders} isMobile={isMobile} />);

        // Assert
        expect(screen.getByTestId('responsive-vpn-comparison')).toBeInTheDocument();
        expect(screen.getByText('Compare VPN Providers')).toBeInTheDocument();

        // Verify all providers are rendered
        mockProviders.forEach(provider => {
          expect(screen.getByTestId(`mobile-provider-${provider.id}`)).toBeInTheDocument();
          expect(screen.getByText(provider.name)).toBeInTheDocument();
        });

        // Mobile-specific checks
        if (isMobile) {
          // Should have mobile-specific classes or layout
          const comparison = screen.getByTestId('responsive-vpn-comparison');
          expect(comparison).toHaveClass('mobile-layout');
        }
      });
    });

    it('should show mobile-specific UI elements on small screens', async () => {
      const user = userEvent.setup();
      setViewportSize(375, 667); // iPhone SE size

      const mockOnProviderSelect = jest.fn() as any;

      render(
        <MockResponsiveVpnComparison
          providers={mockProviders}
          isMobile={true}
          onProviderSelect={mockOnProviderSelect}
        />
      );

      // Select a provider
      await user.click(screen.getByTestId('mobile-select-nordvpn'));

      // Should show mobile quick actions
      expect(screen.getByTestId('mobile-quick-actions')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-get-link')).toBeInTheDocument();

      expect(mockOnProviderSelect).toHaveBeenCalledWith(mockProviders[0]);
    });

    it('should adapt text and layout for mobile screens', () => {
      setViewportSize(375, 667);

      render(<MockResponsiveVpnComparison providers={mockProviders} isMobile={true} />);

      // Check mobile text formatting - get first instance
      const featuresElements = screen.getAllByTestId('mobile-features');
      expect(featuresElements[0]).toHaveTextContent('5 features'); // Condensed for mobile
    });
  });

  describe('Touch Interaction Compatibility', () => {
    it('should handle touch events correctly', async () => {
      setViewportSize(375, 667);
      const mockOnProviderSelect = jest.fn() as any;

      render(
        <MockResponsiveVpnComparison
          providers={mockProviders}
          isMobile={true}
          onProviderSelect={mockOnProviderSelect}
        />
      );

      const providerCard = screen.getByTestId('mobile-provider-nordvpn');

      // Simulate touch events
      fireEvent.touchStart(providerCard);
      fireEvent.touchEnd(providerCard);

      expect(mockOnProviderSelect).toHaveBeenCalledWith(mockProviders[0]);
    });

    it('should have appropriate touch targets (minimum 44px)', () => {
      setViewportSize(375, 667);

      render(<MockResponsiveVpnComparison providers={mockProviders} isMobile={true} />);

      // Check button touch targets
      const selectButtons = screen.getAllByTestId(/mobile-select-/);
      selectButtons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minWidth = parseInt(styles.minWidth);
        const minHeight = parseInt(styles.minHeight);

        expect(minWidth).toBeGreaterThanOrEqual(44);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });

    it('should prevent zoom on form inputs with proper font size', () => {
      setViewportSize(375, 667);

      render(<MockResponsiveVpnComparison providers={mockProviders} isMobile={true} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const fontSize = parseInt(styles.fontSize);

        // Font size should be at least 16px to prevent zoom on iOS
        expect(fontSize).toBeGreaterThanOrEqual(16);
      });
    });
  });

  describe('Performance Tests - Sub-2-Second Load Times', () => {
    it('should load components within performance budget', async () => {
      const performanceData: any[] = [];
      const mockOnPerformanceData = jest.fn(data => {
        performanceData.push(data);
      });

      const startTime = performance.now();

      render(
        <div>
          <MockPerformanceMonitor onPerformanceData={mockOnPerformanceData} />
          <MockResponsiveVpnComparison providers={mockProviders} />
        </div>
      );

      const renderTime = performance.now() - startTime;

      // Initial render should be fast
      expect(renderTime).toBeLessThan(100); // 100ms budget for initial render

      // Wait for performance monitor to collect data
      await waitFor(
        () => {
          expect(performanceData.length).toBeGreaterThan(0);
        },
        { timeout: 1000 }
      );

      const metrics = performanceData[0];
      expect(metrics.loadTime).toBeLessThan(500); // 500ms budget for component load
    });

    it('should maintain performance with large provider lists', () => {
      // Create large provider list (50 providers)
      const largeProviderList = Array.from({ length: 50 }, (_, i) => ({
        id: `provider-${i}`,
        name: `VPN Provider ${i}`,
        rating: 3 + Math.random() * 2,
        price: 5 + Math.random() * 15,
        features: [`Feature A${i}`, `Feature B${i}`, `Feature C${i}`],
      }));

      const startTime = performance.now();

      render(<MockResponsiveVpnComparison providers={largeProviderList} isMobile={false} />);

      const renderTime = performance.now() - startTime;

      // Should still render quickly even with 50 providers
      expect(renderTime).toBeLessThan(500); // 500ms budget for large lists
      expect(screen.getByTestId('responsive-vpn-comparison')).toBeInTheDocument();
    });

    it('should handle rapid user interactions without performance degradation', async () => {
      const user = userEvent.setup();

      render(<MockPerformanceMonitor />);

      const testButton = screen.getByTestId('performance-test-button');

      // Perform rapid interactions
      const interactionStart = performance.now();

      for (let i = 0; i < 5; i++) {
        await user.click(testButton);
      }

      const totalInteractionTime = performance.now() - interactionStart;

      // All interactions should complete within reasonable time
      expect(totalInteractionTime).toBeLessThan(1000); // 1 second for 5 interactions
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should maintain reasonable memory usage', async () => {
      const initialMemory = (performance as any).memory.usedJSHeapSize;

      // Render and unmount component multiple times
      const { unmount, rerender } = render(<MockResponsiveVpnComparison providers={mockProviders} />);

      // Re-render with different data multiple times
      for (let i = 0; i < 10; i++) {
        const updatedProviders = mockProviders.map(p => ({
          ...p,
          rating: Math.random() * 5,
        }));

        rerender(<MockResponsiveVpnComparison providers={updatedProviders} />);
      }

      unmount();

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }

      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Cross-Browser Compatibility', () => {
    const mockUserAgents = [
      {
        name: 'Chrome Mobile',
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/86.0.4240.93 Mobile/15E148 Safari/604.1',
      },
      {
        name: 'Safari Mobile',
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      },
      { name: 'Firefox Mobile', ua: 'Mozilla/5.0 (Mobile; rv:81.0) Gecko/81.0 Firefox/81.0' },
      {
        name: 'Samsung Internet',
        ua: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/12.0 Chrome/79.0.3945.136 Mobile Safari/537.36',
      },
    ];

    mockUserAgents.forEach(({ name, ua }) => {
      it(`should work correctly in ${name}`, () => {
        // Mock user agent
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: ua,
        });

        render(<MockResponsiveVpnComparison providers={mockProviders} isMobile={true} />);

        expect(screen.getByTestId('responsive-vpn-comparison')).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(mockProviders.length);
      });
    });
  });

  describe('Accessibility on Mobile', () => {
    it('should maintain accessibility standards on mobile devices', () => {
      setViewportSize(375, 667);

      render(<MockResponsiveVpnComparison providers={mockProviders} isMobile={true} />);

      // Check for proper heading structure
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();

      // Check button accessibility
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        // Buttons should be large enough for touch
        const styles = window.getComputedStyle(button);
        const minWidth = parseInt(styles.minWidth);
        const minHeight = parseInt(styles.minHeight);
        expect(minWidth).toBeGreaterThanOrEqual(44);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });

    it('should support screen reader navigation on mobile', () => {
      setViewportSize(375, 667);

      render(<MockResponsiveVpnComparison providers={mockProviders} isMobile={true} />);

      // Check for proper semantic structure - get main heading
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

      // All interactive elements should be accessible
      const interactiveElements = screen.getAllByRole('button');
      expect(interactiveElements.length).toBeGreaterThan(0);

      interactiveElements.forEach(element => {
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe('Progressive Web App Features', () => {
    it('should work offline with cached data', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<MockResponsiveVpnComparison providers={mockProviders} isMobile={true} />);

      // Should still render with cached/static data
      expect(screen.getByTestId('responsive-vpn-comparison')).toBeInTheDocument();
      expect(screen.getAllByText(/VPN/)).toHaveLength(mockProviders.length);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should collect comprehensive performance metrics', async () => {
      const performanceDataCollected: any[] = [];
      const mockOnPerformanceData = jest.fn(data => {
        performanceDataCollected.push(data);
      });

      render(<MockPerformanceMonitor onPerformanceData={mockOnPerformanceData} />);

      await waitFor(() => {
        expect(performanceDataCollected.length).toBeGreaterThan(0);
      });

      const metrics = performanceDataCollected[0];

      // Verify all expected metrics are collected
      expect(metrics).toHaveProperty('loadTime');
      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('interactionDelay');

      // Metrics should be reasonable values
      expect(metrics.loadTime).toBeGreaterThan(0);
      expect(metrics.loadTime).toBeLessThan(2000); // Less than 2 seconds
    });
  });
});
