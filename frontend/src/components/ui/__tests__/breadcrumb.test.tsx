import React from 'react';
import { render, screen } from '@testing-library/react';
import { Breadcrumb, BreadcrumbMobile, useBreadcrumbs, type BreadcrumbItem } from '../breadcrumb';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function Link({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronRightIcon: () => <span data-testid="chevron-icon">→</span>,
  HomeIcon: () => <span data-testid="home-icon">🏠</span>,
}));

describe('Breadcrumb', () => {
  const mockItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Analytics', href: '/dashboard/analytics' },
    { label: 'Reports', current: true },
  ];

  it('renders breadcrumb items', () => {
    render(<Breadcrumb items={mockItems} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('renders home link when showHome is true', () => {
    render(<Breadcrumb items={mockItems} showHome={true} />);

    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('does not render home link when showHome is false', () => {
    render(<Breadcrumb items={mockItems} showHome={false} />);

    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('renders links for non-current items', () => {
    render(<Breadcrumb items={mockItems} />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('marks current item with aria-current', () => {
    render(<Breadcrumb items={mockItems} />);

    // Get the parent span that contains the aria-current attribute
    const currentItem = screen.getByText('Reports').parentElement;
    expect(currentItem).toHaveAttribute('aria-current', 'page');
  });

  it('has proper ARIA navigation role', () => {
    const { container } = render(<Breadcrumb items={mockItems} />);

    const nav = container.querySelector('nav');
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
  });

  it('renders separators between items', () => {
    render(<Breadcrumb items={mockItems} />);

    const separators = screen.getAllByTestId('chevron-icon');
    // Should have separators between items (including home)
    expect(separators.length).toBeGreaterThan(0);
  });
});

describe('BreadcrumbMobile', () => {
  it('shows only parent link and current item', () => {
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Analytics', current: true },
    ];

    render(<BreadcrumbMobile items={items} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows only current item when no parent exists', () => {
    const items: BreadcrumbItem[] = [{ label: 'Dashboard', current: true }];

    render(<BreadcrumbMobile items={items} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('chevron-icon')).not.toBeInTheDocument();
  });
});

describe('useBreadcrumbs hook', () => {
  function TestComponent({ pathname }: { pathname: string }) {
    const { generateBreadcrumbs } = useBreadcrumbs();
    const breadcrumbs = generateBreadcrumbs(pathname);

    return (
      <div>
        {breadcrumbs.map((item, index) => (
          <span key={index}>{item.label}</span>
        ))}
      </div>
    );
  }

  it('generates breadcrumbs from pathname', () => {
    render(<TestComponent pathname="/dashboard/analytics/reports" />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('converts dashes to spaces and capitalizes', () => {
    render(<TestComponent pathname="/user-settings/account-details" />);

    expect(screen.getByText('User Settings')).toBeInTheDocument();
    expect(screen.getByText('Account Details')).toBeInTheDocument();
  });

  it('handles custom labels', () => {
    function TestWithLabels() {
      const { generateBreadcrumbs } = useBreadcrumbs();
      const breadcrumbs = generateBreadcrumbs('/admin/users', { admin: 'Administration', users: 'User Management' });

      return (
        <div>
          {breadcrumbs.map((item, index) => (
            <span key={index}>{item.label}</span>
          ))}
        </div>
      );
    }

    render(<TestWithLabels />);

    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });
});
