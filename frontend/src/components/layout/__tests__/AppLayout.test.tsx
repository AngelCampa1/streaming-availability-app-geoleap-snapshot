/**
 * AppLayout Component Tests
 *
 * Tests the main application layout with navigation
 */

import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import AppLayout from '../AppLayout';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock components
jest.mock('@/components/navigation/MainNavigation', () => {
  const MockMainNavigation = () => <nav data-testid="main-navigation">Main Navigation</nav>;
  MockMainNavigation.displayName = 'MainNavigation';
  return MockMainNavigation;
});

jest.mock('@/components/navigation/Breadcrumbs', () => {
  const MockBreadcrumbs = () => <div data-testid="breadcrumbs">Breadcrumbs</div>;
  MockBreadcrumbs.displayName = 'Breadcrumbs';
  return MockBreadcrumbs;
});

// Mock dynamic ExitIntentPopup to avoid AuthProvider requirement
jest.mock('next/dynamic', () => () => {
  const MockComponent = () => null;
  MockComponent.displayName = 'DynamicMock';
  return MockComponent;
});

jest.mock('@/components/accessibility/SkipLinks', () => {
  const MockSkipLinks = () => <div data-testid="skip-links">Skip Links</div>;
  MockSkipLinks.displayName = 'SkipLinks';
  return MockSkipLinks;
});

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('AppLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/dashboard');
  });

  describe('Basic Rendering', () => {
    it('renders children', () => {
      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders skip links', () => {
      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.getByTestId('skip-links')).toBeInTheDocument();
    });

    it('renders main element with role', () => {
      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Navigation Visibility', () => {
    it('shows navigation on dashboard page', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.getByTestId('main-navigation')).toBeInTheDocument();
    });

    it('hides navigation on login page', () => {
      mockUsePathname.mockReturnValue('/auth/login');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('main-navigation')).not.toBeInTheDocument();
    });

    it('hides navigation on register page', () => {
      mockUsePathname.mockReturnValue('/auth/register');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('main-navigation')).not.toBeInTheDocument();
    });

    it('hides navigation on forgot password page', () => {
      mockUsePathname.mockReturnValue('/auth/forgot-password');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('main-navigation')).not.toBeInTheDocument();
    });

    it('hides navigation on reset password page', () => {
      mockUsePathname.mockReturnValue('/auth/reset-password');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('main-navigation')).not.toBeInTheDocument();
    });

    it('hides navigation on OAuth callback page', () => {
      mockUsePathname.mockReturnValue('/auth/callback');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('main-navigation')).not.toBeInTheDocument();
    });
  });

  describe('Breadcrumbs Visibility', () => {
    it('shows breadcrumbs on nested pages', () => {
      mockUsePathname.mockReturnValue('/dashboard/settings');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    });

    it('hides breadcrumbs on home page', () => {
      mockUsePathname.mockReturnValue('/');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('breadcrumbs')).not.toBeInTheDocument();
    });

    it('hides breadcrumbs on dashboard page', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('breadcrumbs')).not.toBeInTheDocument();
    });

    it('hides breadcrumbs on search page', () => {
      mockUsePathname.mockReturnValue('/search');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('breadcrumbs')).not.toBeInTheDocument();
    });

    it('hides breadcrumbs on pricing page', () => {
      mockUsePathname.mockReturnValue('/pricing');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('breadcrumbs')).not.toBeInTheDocument();
    });

    it('hides breadcrumbs on admin root page', () => {
      mockUsePathname.mockReturnValue('/admin');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('breadcrumbs')).not.toBeInTheDocument();
    });

    it('hides breadcrumbs on auth pages', () => {
      mockUsePathname.mockReturnValue('/auth/login');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('breadcrumbs')).not.toBeInTheDocument();
    });

    it('hides breadcrumbs when showBreadcrumbs is false', () => {
      mockUsePathname.mockReturnValue('/dashboard/settings');

      render(
        <AppLayout showBreadcrumbs={false}>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.queryByTestId('breadcrumbs')).not.toBeInTheDocument();
    });
  });

  describe('Container Width', () => {
    it('uses xl width by default', () => {
      const { container } = render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      const contentContainer = container.querySelector('.max-w-7xl');
      expect(contentContainer).toBeInTheDocument();
    });

    it('applies sm width', () => {
      const { container } = render(
        <AppLayout maxWidth="sm">
          <div>Content</div>
        </AppLayout>
      );

      const contentContainer = container.querySelector('.max-w-3xl');
      expect(contentContainer).toBeInTheDocument();
    });

    it('applies md width', () => {
      const { container } = render(
        <AppLayout maxWidth="md">
          <div>Content</div>
        </AppLayout>
      );

      const contentContainer = container.querySelector('.max-w-4xl');
      expect(contentContainer).toBeInTheDocument();
    });

    it('applies lg width', () => {
      const { container } = render(
        <AppLayout maxWidth="lg">
          <div>Content</div>
        </AppLayout>
      );

      const contentContainer = container.querySelector('.max-w-6xl');
      expect(contentContainer).toBeInTheDocument();
    });

    it('applies 2xl width', () => {
      const { container } = render(
        <AppLayout maxWidth="2xl">
          <div>Content</div>
        </AppLayout>
      );

      const contentContainer = container.querySelector('.container.mx-auto.px-4');
      expect(contentContainer).toBeInTheDocument();
    });

    it('applies full width', () => {
      const { container } = render(
        <AppLayout maxWidth="full">
          <div>Content</div>
        </AppLayout>
      );

      const contentContainer = container.querySelector('.w-full.px-4');
      expect(contentContainer).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className to main element', () => {
      render(
        <AppLayout className="custom-class">
          <div>Content</div>
        </AppLayout>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('custom-class');
    });

    it('maintains bg-background class on root', () => {
      const { container } = render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      const root = container.firstChild as HTMLElement;
      expect(root).toHaveClass('min-h-screen', 'bg-background');
    });
  });

  describe('Layout Structure', () => {
    it('renders navigation before main content', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      const navigation = screen.getByTestId('main-navigation');
      const main = screen.getByRole('main');

      expect(navigation.compareDocumentPosition(main)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('renders breadcrumbs inside main', () => {
      mockUsePathname.mockReturnValue('/dashboard/settings');

      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      const breadcrumbs = screen.getByTestId('breadcrumbs');
      const main = screen.getByRole('main');

      expect(main).toContainElement(breadcrumbs);
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined pathname gracefully', () => {
      mockUsePathname.mockReturnValue(undefined as any);

      expect(() => {
        render(
          <AppLayout>
            <div>Content</div>
          </AppLayout>
        );
      }).not.toThrow();
    });

    it('renders with no children', () => {
      expect(() => {
        render(<AppLayout>{null}</AppLayout>);
      }).not.toThrow();
    });

    it('renders with multiple children', () => {
      render(
        <AppLayout>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </AppLayout>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });
  });
});
