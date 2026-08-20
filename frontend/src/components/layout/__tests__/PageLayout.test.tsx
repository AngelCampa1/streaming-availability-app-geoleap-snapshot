/**
 * PageLayout Component Tests
 *
 * Tests the standard page layout with breadcrumbs
 */

import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { PageLayout } from '../PageLayout';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock breadcrumb components
jest.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: ({ items }: { items: any[] }) => (
    <nav data-testid="breadcrumb">
      {items.map((item, idx) => (
        <span key={idx}>{item.label}</span>
      ))}
    </nav>
  ),
  useBreadcrumbs: () => ({
    generateBreadcrumbs: (pathname: string) => {
      const parts = pathname.split('/').filter(Boolean);
      return parts.map((part) => ({ label: part, href: `/${part}` }));
    },
  }),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('PageLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/dashboard');
  });

  describe('Basic Rendering', () => {
    it('renders children', () => {
      render(
        <PageLayout>
          <div>Test Content</div>
        </PageLayout>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders without any props', () => {
      render(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Title and Description', () => {
    it('renders title when provided', () => {
      render(
        <PageLayout title="Dashboard">
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    });

    it('renders description when provided', () => {
      render(
        <PageLayout title="Dashboard" description="Manage your account">
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByText('Manage your account')).toBeInTheDocument();
    });

    it('renders title without description', () => {
      render(
        <PageLayout title="Dashboard">
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText(/manage/i)).not.toBeInTheDocument();
    });

    it('does not render header section when no title, description, or actions', () => {
      const { container } = render(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      const headers = container.querySelectorAll('h1');
      expect(headers.length).toBe(0);
    });
  });

  describe('Actions', () => {
    it('renders action buttons when provided', () => {
      render(
        <PageLayout
          title="Dashboard"
          actions={
            <button>Create New</button>
          }
        >
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByText('Create New')).toBeInTheDocument();
    });

    it('renders multiple actions', () => {
      render(
        <PageLayout
          title="Dashboard"
          actions={
            <>
              <button>Action 1</button>
              <button>Action 2</button>
            </>
          }
        >
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
    });
  });

  describe('Breadcrumbs', () => {
    it('shows auto-generated breadcrumbs by default', () => {
      mockUsePathname.mockReturnValue('/dashboard/settings');

      render(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
      expect(screen.getByText('dashboard')).toBeInTheDocument();
      expect(screen.getByText('settings')).toBeInTheDocument();
    });

    it('shows custom breadcrumbs when provided', () => {
      const customBreadcrumbs = [
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products' },
        { label: 'Details' },
      ];

      render(
        <PageLayout breadcrumbs={customBreadcrumbs}>
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
    });

    it('hides breadcrumbs when showBreadcrumbs is false', () => {
      render(
        <PageLayout showBreadcrumbs={false}>
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.queryByTestId('breadcrumb')).not.toBeInTheDocument();
    });

    it('does not show breadcrumbs when array is empty', () => {
      mockUsePathname.mockReturnValue('/');

      render(
        <PageLayout breadcrumbs={[]}>
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.queryByTestId('breadcrumb')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <PageLayout className="custom-class">
          <div>Content</div>
        </PageLayout>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('maintains default spacing classes', () => {
      const { container } = render(
        <PageLayout>
          <div>Content</div>
        </PageLayout>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('space-y-6');
    });
  });

  describe('Layout Structure', () => {
    it('renders content in proper wrapper', () => {
      const { container } = render(
        <PageLayout title="Test Page">
          <div data-testid="child-content">Content</div>
        </PageLayout>
      );

      const contentWrapper = container.querySelector('.space-y-4');
      expect(contentWrapper).toBeInTheDocument();
      expect(contentWrapper).toContainElement(screen.getByTestId('child-content'));
    });

    it('renders header before content', () => {
      render(
        <PageLayout title="Test Page">
          <div>Content</div>
        </PageLayout>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      const content = screen.getByText('Content');

      // heading should come before content in DOM
      expect(heading.compareDocumentPosition(content)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('Responsive Layout', () => {
    it('uses flexbox for header with actions', () => {
      const { container } = render(
        <PageLayout
          title="Dashboard"
          actions={<button>Action</button>}
        >
          <div>Content</div>
        </PageLayout>
      );

      const headerSection = container.querySelector('.flex.flex-col');
      expect(headerSection).toBeInTheDocument();
      expect(headerSection).toHaveClass('md:flex-row');
    });
  });

  describe('Edge Cases', () => {
    it('handles null pathname gracefully', () => {
      mockUsePathname.mockReturnValue(null as any);

      expect(() => {
        render(
          <PageLayout>
            <div>Content</div>
          </PageLayout>
        );
      }).not.toThrow();
    });

    it('renders with only actions, no title', () => {
      render(
        <PageLayout actions={<button>Action</button>}>
          <div>Content</div>
        </PageLayout>
      );

      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <PageLayout>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </PageLayout>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });
  });
});
