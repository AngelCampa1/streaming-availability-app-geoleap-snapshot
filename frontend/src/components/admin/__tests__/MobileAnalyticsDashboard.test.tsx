import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock for mobile-specific functionality
const mockMatchMedia = (query: string) => ({
  matches: query.includes('max-width: 768px'), // Simulate mobile viewport
  media: query,
  onchange: null,
  addListener: jest.fn() as any, // deprecated
  removeListener: jest.fn() as any, // deprecated
  addEventListener: jest.fn() as any,
  removeEventListener: jest.fn() as any,
  dispatchEvent: jest.fn() as any,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn((query: string) => mockMatchMedia(query)),
});

// Mock touch events
Object.defineProperty(window, 'ontouchstart', {
  writable: true,
  value: {},
});

// Mobile Analytics Dashboard Component for testing
const MobileAnalyticsDashboard = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [showMenu, setShowMenu] = React.useState(false);
  const [metrics] = React.useState({
    dailyActiveUsers: 1250,
    weeklyActiveUsers: 4800,
    monthlyActiveUsers: 15600,
    searchVolume: 89000,
  });

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div
      className={`mobile-analytics-dashboard ${isMobile ? 'mobile-view' : 'desktop-view'}`}
      data-testid="mobile-analytics-dashboard"
    >
      {/* Mobile Header */}
      <div className="mobile-header" data-testid="mobile-header">
        <h1 className="dashboard-title">Analytics</h1>
        <button className="menu-toggle" data-testid="menu-toggle" onClick={() => setShowMenu(!showMenu)}>
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {showMenu && (
        <div className="mobile-menu" data-testid="mobile-menu">
          <button
            data-testid="mobile-overview-tab"
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => {
              setActiveTab('overview');
              setShowMenu(false);
            }}
          >
            Overview
          </button>
          <button
            data-testid="mobile-content-tab"
            className={activeTab === 'content' ? 'active' : ''}
            onClick={() => {
              setActiveTab('content');
              setShowMenu(false);
            }}
          >
            Content
          </button>
          <button
            data-testid="mobile-system-tab"
            className={activeTab === 'system' ? 'active' : ''}
            onClick={() => {
              setActiveTab('system');
              setShowMenu(false);
            }}
          >
            System
          </button>
        </div>
      )}

      {/* Mobile Metrics Cards */}
      <div className="mobile-metrics" data-testid="mobile-metrics">
        <div className="metric-card-mobile" data-testid="mobile-daily-users">
          <div className="metric-label">Daily Users</div>
          <div className="metric-value">{metrics.dailyActiveUsers.toLocaleString()}</div>
        </div>

        <div className="metric-card-mobile" data-testid="mobile-weekly-users">
          <div className="metric-label">Weekly Users</div>
          <div className="metric-value">{metrics.weeklyActiveUsers.toLocaleString()}</div>
        </div>
      </div>

      {/* Mobile Tab Content */}
      <div className="mobile-content" data-testid="mobile-content">
        {activeTab === 'overview' && (
          <div data-testid="mobile-overview-content" className="tab-content-mobile">
            <h2>User Activity</h2>
            <div className="mobile-chart" data-testid="mobile-chart">
              <div className="chart-placeholder">📊 Mobile Chart View</div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div data-testid="mobile-content-content" className="tab-content-mobile">
            <h2>Popular Content</h2>
            <div className="content-list" data-testid="mobile-content-list">
              <div className="content-item">Stranger Things</div>
              <div className="content-item">The Office</div>
              <div className="content-item">Marvel Movies</div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div data-testid="mobile-system-content" className="tab-content-mobile">
            <h2>System Status</h2>
            <div className="system-metrics-mobile" data-testid="mobile-system-metrics">
              <div className="status-item">✅ API: Online</div>
              <div className="status-item">⚡ Response: 245ms</div>
              <div className="status-item">📊 Uptime: 99.9%</div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Actions */}
      <div className="mobile-actions" data-testid="mobile-actions">
        <button className="mobile-action-btn" data-testid="mobile-refresh-btn" onClick={() => window.location.reload()}>
          🔄 Refresh
        </button>

        <button
          className="mobile-action-btn"
          data-testid="mobile-export-btn"
          onClick={() => alert('Mobile CSV export')}
        >
          📥 Export
        </button>
      </div>

      {/* Touch gesture area */}
      <div
        className="gesture-area"
        data-testid="gesture-area"
        onTouchStart={e => {
          // Handle touch gestures for mobile
          const touch = e.touches[0];
          e.currentTarget.setAttribute('data-touch-start', touch.clientX.toString());
        }}
        onTouchEnd={e => {
          const startX = parseInt(e.currentTarget.getAttribute('data-touch-start') || '0');
          const endX = e.changedTouches[0].clientX;
          const diff = startX - endX;

          if (Math.abs(diff) > 50) {
            // Swipe gesture detected
            if (diff > 0) {
              // Swipe left - next tab
              const tabs = ['overview', 'content', 'system'];
              const currentIndex = tabs.indexOf(activeTab);
              const nextIndex = (currentIndex + 1) % tabs.length;
              setActiveTab(tabs[nextIndex]);
            } else {
              // Swipe right - previous tab
              const tabs = ['overview', 'content', 'system'];
              const currentIndex = tabs.indexOf(activeTab);
              const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
              setActiveTab(tabs[prevIndex]);
            }
          }
        }}
      >
        Swipe to navigate tabs
      </div>
    </div>
  );
};

describe('MobileAnalyticsDashboard - Mobile Responsiveness Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset viewport to mobile size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  describe('Mobile Layout Rendering', () => {
    it('renders mobile dashboard with proper mobile styling', () => {
      // Act
      render(<MobileAnalyticsDashboard />);

      // Assert
      expect(screen.getByTestId('mobile-analytics-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-header')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-content')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-actions')).toBeInTheDocument();
    });

    it('displays mobile-specific navigation menu', () => {
      // Act
      render(<MobileAnalyticsDashboard />);

      // Assert
      expect(screen.getByTestId('menu-toggle')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument(); // Hidden initially

      // Open menu
      fireEvent.click(screen.getByTestId('menu-toggle'));
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
    });

    it('shows mobile-optimized metric cards', () => {
      // Act
      render(<MobileAnalyticsDashboard />);

      // Assert
      expect(screen.getByTestId('mobile-daily-users')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-weekly-users')).toBeInTheDocument();

      // Check values are displayed correctly
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('4,800')).toBeInTheDocument();
    });
  });

  describe('Mobile Navigation', () => {
    it('opens and closes mobile menu on toggle', () => {
      // Arrange
      render(<MobileAnalyticsDashboard />);

      // Initially menu should be closed
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();

      // Act - Open menu
      fireEvent.click(screen.getByTestId('menu-toggle'));

      // Assert - Menu should be open
      expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-overview-tab')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-content-tab')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-system-tab')).toBeInTheDocument();
    });

    it('switches tabs through mobile menu and closes menu', () => {
      // Arrange
      render(<MobileAnalyticsDashboard />);

      // Open menu
      fireEvent.click(screen.getByTestId('menu-toggle'));

      // Act - Switch to content tab
      fireEvent.click(screen.getByTestId('mobile-content-tab'));

      // Assert - Menu should close and content should change
      expect(screen.queryByTestId('mobile-menu')).not.toBeInTheDocument();
      expect(screen.getByTestId('mobile-content-content')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-overview-content')).not.toBeInTheDocument();
    });

    it('highlights active tab in mobile menu', () => {
      // Arrange
      render(<MobileAnalyticsDashboard />);

      // Open menu
      fireEvent.click(screen.getByTestId('menu-toggle'));

      // Assert - Overview tab should be active by default
      const overviewTab = screen.getByTestId('mobile-overview-tab');
      expect(overviewTab).toHaveClass('active');
    });
  });

  describe('Touch Interactions', () => {
    it('handles touch gestures for tab navigation', () => {
      // Arrange
      render(<MobileAnalyticsDashboard />);
      const gestureArea = screen.getByTestId('gesture-area');

      // Initially on overview tab
      expect(screen.getByTestId('mobile-overview-content')).toBeInTheDocument();

      // Act - Simulate swipe left (next tab)
      fireEvent.touchStart(gestureArea, {
        touches: [{ clientX: 200 }],
      });
      fireEvent.touchEnd(gestureArea, {
        changedTouches: [{ clientX: 100 }], // 100px swipe left
      });

      // Assert - Should switch to next tab (content)
      expect(screen.getByTestId('mobile-content-content')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-overview-content')).not.toBeInTheDocument();
    });

    it('handles swipe right to go to previous tab', () => {
      // Arrange
      render(<MobileAnalyticsDashboard />);
      const gestureArea = screen.getByTestId('gesture-area');

      // Act - Simulate swipe right (previous tab)
      fireEvent.touchStart(gestureArea, {
        touches: [{ clientX: 100 }],
      });
      fireEvent.touchEnd(gestureArea, {
        changedTouches: [{ clientX: 200 }], // 100px swipe right
      });

      // Assert - Should switch to previous tab (system, wrapping around)
      expect(screen.getByTestId('mobile-system-content')).toBeInTheDocument();
    });

    it('ignores small touch movements', () => {
      // Arrange
      render(<MobileAnalyticsDashboard />);
      const gestureArea = screen.getByTestId('gesture-area');

      // Initially on overview
      expect(screen.getByTestId('mobile-overview-content')).toBeInTheDocument();

      // Act - Small touch movement (should be ignored)
      fireEvent.touchStart(gestureArea, {
        touches: [{ clientX: 200 }],
      });
      fireEvent.touchEnd(gestureArea, {
        changedTouches: [{ clientX: 180 }], // Only 20px movement
      });

      // Assert - Should stay on same tab
      expect(screen.getByTestId('mobile-overview-content')).toBeInTheDocument();
    });
  });

  describe('Mobile Actions', () => {
    it('renders mobile action buttons', () => {
      // Act
      render(<MobileAnalyticsDashboard />);

      // Assert
      expect(screen.getByTestId('mobile-refresh-btn')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-export-btn')).toBeInTheDocument();
    });

    it('handles mobile refresh button click', () => {
      // Arrange
      render(<MobileAnalyticsDashboard />);

      // Act - Just test that the button can be clicked without crashing
      fireEvent.click(screen.getByTestId('mobile-refresh-btn'));

      // Assert - Check that the component is still functional after click
      expect(screen.getByTestId('mobile-refresh-btn')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-analytics-dashboard')).toBeInTheDocument();
    });

    it('handles mobile export button click', () => {
      // Arrange
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
      render(<MobileAnalyticsDashboard />);

      // Act
      fireEvent.click(screen.getByTestId('mobile-export-btn'));

      // Assert
      expect(mockAlert).toHaveBeenCalledWith('Mobile CSV export');

      mockAlert.mockRestore();
    });
  });

  describe('Mobile Content Display', () => {
    it('displays content appropriate for mobile screens', () => {
      // Act
      render(<MobileAnalyticsDashboard />);

      // Assert - Check mobile-specific content
      expect(screen.getByTestId('mobile-chart')).toBeInTheDocument();
      expect(screen.getByText('📊 Mobile Chart View')).toBeInTheDocument();
    });

    it('shows mobile content list in content tab', () => {
      // Arrange
      render(<MobileAnalyticsDashboard />);

      // Open menu and switch to content
      fireEvent.click(screen.getByTestId('menu-toggle'));
      fireEvent.click(screen.getByTestId('mobile-content-tab'));

      // Assert
      expect(screen.getByTestId('mobile-content-list')).toBeInTheDocument();
      expect(screen.getByText('Stranger Things')).toBeInTheDocument();
      expect(screen.getByText('The Office')).toBeInTheDocument();
      expect(screen.getByText('Marvel Movies')).toBeInTheDocument();
    });

    it('displays mobile system metrics in system tab', () => {
      // Arrange
      render(<MobileAnalyticsDashboard />);

      // Open menu and switch to system
      fireEvent.click(screen.getByTestId('menu-toggle'));
      fireEvent.click(screen.getByTestId('mobile-system-tab'));

      // Assert
      expect(screen.getByTestId('mobile-system-metrics')).toBeInTheDocument();
      expect(screen.getByText('✅ API: Online')).toBeInTheDocument();
      expect(screen.getByText('⚡ Response: 245ms')).toBeInTheDocument();
      expect(screen.getByText('📊 Uptime: 99.9%')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('applies correct CSS classes for mobile view', () => {
      // Act
      render(<MobileAnalyticsDashboard />);

      // Assert
      const dashboard = screen.getByTestId('mobile-analytics-dashboard');
      expect(dashboard).toHaveClass('mobile-view');
    });

    it('adapts to different mobile screen orientations', () => {
      // Arrange - Portrait mode
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 667 });

      render(<MobileAnalyticsDashboard />);

      // Should render in mobile view
      expect(screen.getByTestId('mobile-analytics-dashboard')).toHaveClass('mobile-view');

      // Act - Simulate landscape mode
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 667 });
      Object.defineProperty(window, 'innerHeight', { writable: true, value: 375 });

      // Trigger resize event
      fireEvent(window, new Event('resize'));

      // Assert - Should still be mobile view (under 768px width)
      expect(screen.getByTestId('mobile-analytics-dashboard')).toHaveClass('mobile-view');
    });
  });

  describe('Performance on Mobile', () => {
    it('renders efficiently on mobile devices', () => {
      // Arrange
      const startTime = performance.now();

      // Act
      render(<MobileAnalyticsDashboard />);
      const endTime = performance.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(100); // Should render quickly
      expect(screen.getByTestId('mobile-analytics-dashboard')).toBeInTheDocument();
    });

    it('handles rapid touch interactions without lag', async () => {
      // Arrange
      render(<MobileAnalyticsDashboard />);
      const gestureArea = screen.getByTestId('gesture-area');

      // Act - Rapid touch interactions
      for (let i = 0; i < 3; i++) {
        fireEvent.touchStart(gestureArea, { touches: [{ clientX: 200 }] });
        fireEvent.touchEnd(gestureArea, { changedTouches: [{ clientX: 100 }] });
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }

      // Assert - Should handle rapid interactions smoothly
      expect(screen.getByTestId('mobile-analytics-dashboard')).toBeInTheDocument();
    });
  });

  describe('Accessibility on Mobile', () => {
    it('maintains accessibility on mobile devices', () => {
      // Act
      render(<MobileAnalyticsDashboard />);

      // Assert
      expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '☰' })).toBeInTheDocument();

      // Mobile buttons should be accessible
      expect(screen.getByTestId('mobile-refresh-btn')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-export-btn')).toBeInTheDocument();
    });

    it('supports keyboard navigation on mobile', () => {
      // Arrange
      render(<MobileAnalyticsDashboard />);

      // Act
      const menuToggle = screen.getByTestId('menu-toggle');
      menuToggle.focus();

      // Assert
      expect(document.activeElement).toBe(menuToggle);
    });
  });

  describe('Cross-browser Mobile Compatibility', () => {
    it('works with different mobile user agents', () => {
      // Test with different mobile user agents
      const mobileUserAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
        'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      ];

      mobileUserAgents.forEach((userAgent) => {
        // Arrange
        Object.defineProperty(navigator, 'userAgent', {
          writable: true,
          value: userAgent,
        });

        // Act
        const { unmount } = render(<MobileAnalyticsDashboard />);

        // Assert
        expect(screen.getByTestId('mobile-analytics-dashboard')).toBeInTheDocument();

        // Cleanup after each render to prevent duplicates
        unmount();
      });
    });
  });
});
