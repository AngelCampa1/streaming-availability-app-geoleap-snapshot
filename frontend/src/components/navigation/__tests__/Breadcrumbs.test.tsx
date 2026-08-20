/**
 * Breadcrumbs Component Tests
 *
 * Tests the breadcrumb navigation component
 */

import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import Breadcrumbs from '../Breadcrumbs';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('Breadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auto-generated Breadcrumbs', () => {
    it('does not render on home page', () => {
      mockUsePathname.mockReturnValue('/');

      const { container } = render(<Breadcrumbs />);

      expect(container.firstChild).toBeNull();
    });

    it('does not render for simple auth pages', () => {
      mockUsePathname.mockReturnValue('/auth/login');

      const { container } = render(<Breadcrumbs />);

      expect(container.firstChild).toBeNull();
    });

    it('renders breadcrumbs for dashboard path', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(<Breadcrumbs />);

      expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders breadcrumbs with mapped labels', () => {
      mockUsePathname.mockReturnValue('/admin/users');

      render(<Breadcrumbs />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    it('renders Home link', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(<Breadcrumbs />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('renders path segments as links except last', () => {
      mockUsePathname.mockReturnValue('/admin/users/roles');

      render(<Breadcrumbs />);

      // Admin and Users should be links
      const adminLink = screen.getByRole('link', { name: /admin/i });
      expect(adminLink).toHaveAttribute('href', '/admin');

      const usersLink = screen.getByRole('link', { name: /users/i });
      expect(usersLink).toHaveAttribute('href', '/admin/users');

      // Roles should be active (not a link)
      const rolesSpan = screen.getByText('Roles');
      expect(rolesSpan).toHaveAttribute('aria-current', 'page');
      expect(rolesSpan.tagName).toBe('SPAN');
    });

    it('capitalizes unmapped segments', () => {
      mockUsePathname.mockReturnValue('/custom/segment');

      render(<Breadcrumbs />);

      expect(screen.getByText('Custom')).toBeInTheDocument();
      expect(screen.getByText('Segment')).toBeInTheDocument();
    });

    it('renders chevron separators', () => {
      mockUsePathname.mockReturnValue('/dashboard/settings');

      const { container } = render(<Breadcrumbs />);

      const chevrons = container.querySelectorAll('svg');
      expect(chevrons.length).toBeGreaterThan(0);
    });
  });

  describe('Custom Breadcrumbs', () => {
    it('renders custom items when provided', () => {
      const customItems = [
        { label: 'Products', href: '/products', isActive: false },
        { label: 'Electronics', href: '/products/electronics', isActive: false },
        { label: 'Laptops', href: '/products/electronics/laptops', isActive: true },
      ];

      mockUsePathname.mockReturnValue('/products/electronics/laptops');

      render(<Breadcrumbs items={customItems} />);

      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Laptops')).toBeInTheDocument();
    });

    it('marks custom active item correctly', () => {
      const customItems = [
        { label: 'Level 1', href: '/level1', isActive: false },
        { label: 'Level 2', href: '/level1/level2', isActive: true },
      ];

      mockUsePathname.mockReturnValue('/level1/level2');

      render(<Breadcrumbs items={customItems} />);

      const activeItem = screen.getByText('Level 2');
      expect(activeItem).toHaveAttribute('aria-current', 'page');
      expect(activeItem.tagName).toBe('SPAN');
    });

    it('renders custom non-active items as links', () => {
      const customItems = [
        { label: 'Level 1', href: '/level1', isActive: false },
        { label: 'Level 2', href: '/level1/level2', isActive: true },
      ];

      mockUsePathname.mockReturnValue('/level1/level2');

      render(<Breadcrumbs items={customItems} />);

      const level1Link = screen.getByRole('link', { name: /level 1/i });
      expect(level1Link).toHaveAttribute('href', '/level1');
    });

    it('always renders Home link in custom mode', () => {
      const customItems = [
        { label: 'Custom', href: '/custom', isActive: true },
      ];

      mockUsePathname.mockReturnValue('/custom');

      render(<Breadcrumbs items={customItems} />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      const { container } = render(<Breadcrumbs className="custom-class" />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('custom-class');
    });

    it('has aria-label for accessibility', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(<Breadcrumbs />);

      const nav = screen.getByLabelText('Breadcrumb');
      expect(nav).toBeInTheDocument();
    });
  });

  describe('Path Label Mapping', () => {
    it('uses mapped label for "search"', () => {
      mockUsePathname.mockReturnValue('/search');

      render(<Breadcrumbs />);

      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('uses mapped label for "settings"', () => {
      mockUsePathname.mockReturnValue('/settings');

      render(<Breadcrumbs />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('uses mapped label for "audit-logs"', () => {
      mockUsePathname.mockReturnValue('/admin/audit-logs');

      render(<Breadcrumbs />);

      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    });

    it('uses mapped label for "forgot-password"', () => {
      mockUsePathname.mockReturnValue('/forgot-password');

      render(<Breadcrumbs />);

      expect(screen.getByText('Forgot Password')).toBeInTheDocument();
    });
  });

  describe('Multi-level Paths', () => {
    it('renders 3-level path correctly', () => {
      mockUsePathname.mockReturnValue('/dashboard/settings/security');

      render(<Breadcrumbs />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    it('renders 4-level path correctly', () => {
      mockUsePathname.mockReturnValue('/admin/users/roles/permissions');

      render(<Breadcrumbs />);

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Roles')).toBeInTheDocument();
      expect(screen.getByText('Permissions')).toBeInTheDocument();
    });

    it('builds correct href for nested paths', () => {
      mockUsePathname.mockReturnValue('/admin/users/settings');

      render(<Breadcrumbs />);

      const adminLink = screen.getByRole('link', { name: /admin/i });
      expect(adminLink).toHaveAttribute('href', '/admin');

      const usersLink = screen.getByRole('link', { name: /users/i });
      expect(usersLink).toHaveAttribute('href', '/admin/users');
    });
  });
});
