import { render, screen, fireEvent } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import MainNavigation from '../MainNavigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('next/link', () => {
  const MockLink = ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

jest.mock('next/image', () => {
  const MockImage = ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  );
  MockImage.displayName = 'Image';
  return MockImage;
});

// Mock auth context  -  unauthenticated by default
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    logout: jest.fn(),
    hasPermission: jest.fn(() => false),
  })),
}));

// Mock hooks and accessibility utilities (external boundaries)
jest.mock('@/hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: jest.fn(),
  useFocusManagement: jest.fn(() => ({
    containerRef: { current: null },
    trapFocus: jest.fn(),
  })),
}));

jest.mock('@/components/accessibility/LiveRegion', () => ({
  useAnnouncements: jest.fn(() => ({ announce: jest.fn() })),
}));

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn() },
}));

// Mock fetch for notifications
global.fetch = jest.fn(() =>
  Promise.resolve({ ok: false } as Response)
);

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('MainNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
  });

  describe('Standard navigation links', () => {
    it('renders core nav links for unauthenticated users', () => {
      render(<MainNavigation />);
      expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /pricing/i })).toHaveAttribute('href', '/pricing');
    });

    it('renders Platforms link', () => {
      render(<MainNavigation />);
      expect(screen.getByRole('link', { name: /platforms/i })).toHaveAttribute('href', '/platforms');
    });
  });

  describe('Explore dropdown', () => {
    it('renders Explore button in desktop nav', () => {
      render(<MainNavigation />);
      const exploreButton = screen.getByRole('button', { name: /explore/i });
      expect(exploreButton).toBeInTheDocument();
      expect(exploreButton).toHaveAttribute('aria-haspopup', 'menu');
      expect(exploreButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens dropdown when Explore button is clicked', () => {
      render(<MainNavigation />);
      const exploreButton = screen.getByRole('button', { name: /explore/i });

      expect(screen.queryByRole('link', { name: 'Browse by Country' })).not.toBeInTheDocument();

      fireEvent.click(exploreButton);

      expect(screen.getByRole('link', { name: 'Browse by Country' })).toBeInTheDocument();
      expect(exploreButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('renders all 8 Explore child links with correct hrefs', () => {
      render(<MainNavigation />);
      fireEvent.click(screen.getByRole('button', { name: /explore/i }));

      expect(screen.getByRole('link', { name: 'Browse by Country' })).toHaveAttribute('href', '/countries');
      expect(screen.getByRole('link', { name: 'Compare Services' })).toHaveAttribute('href', '/compare');
      expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
      expect(screen.getByRole('link', { name: 'Streaming Guides' })).toHaveAttribute('href', '/guides');
      expect(screen.getByRole('link', { name: 'Genre Guides' })).toHaveAttribute('href', '/genres');
      expect(screen.getByRole('link', { name: 'Sports Streaming' })).toHaveAttribute('href', '/sports');
      expect(screen.getByRole('link', { name: 'Unblock Streaming' })).toHaveAttribute('href', '/unblock');
      expect(screen.getByRole('link', { name: 'How to Watch' })).toHaveAttribute('href', '/how-to-watch');
    });

    it('closes dropdown when a child link is clicked', () => {
      render(<MainNavigation />);
      fireEvent.click(screen.getByRole('button', { name: /explore/i }));

      expect(screen.getByRole('link', { name: 'Blog' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('link', { name: 'Blog' }));

      expect(screen.queryByRole('link', { name: 'Browse by Country' })).not.toBeInTheDocument();
    });

    it('toggles dropdown closed when Explore button clicked again', () => {
      render(<MainNavigation />);
      const exploreButton = screen.getByRole('button', { name: /explore/i });

      fireEvent.click(exploreButton);
      expect(screen.getByRole('link', { name: 'Blog' })).toBeInTheDocument();

      fireEvent.click(exploreButton);
      expect(screen.queryByRole('link', { name: 'Blog' })).not.toBeInTheDocument();
    });

    it('shows active state on Explore button when a child route is active', () => {
      mockUsePathname.mockReturnValue('/blog');
      render(<MainNavigation />);

      const exploreButton = screen.getByRole('button', { name: /explore/i });
      expect(exploreButton.className).toMatch(/bg-primary/);
    });

    it('does not show active state on Explore button for non-child routes', () => {
      mockUsePathname.mockReturnValue('/pricing');
      render(<MainNavigation />);

      const exploreButton = screen.getByRole('button', { name: /explore/i });
      expect(exploreButton.className).not.toMatch(/bg-primary text-primary-foreground/);
    });
  });

  describe('Mobile menu', () => {
    it('renders mobile menu toggle button', () => {
      render(<MainNavigation />);
      expect(screen.getByRole('button', { name: /toggle mobile menu/i })).toBeInTheDocument();
    });

    it('shows Explore section in mobile menu after opening', () => {
      render(<MainNavigation />);

      fireEvent.click(screen.getByRole('button', { name: /toggle mobile menu/i }));

      // Explore collapsible button should appear in mobile menu
      const exploreButtons = screen.getAllByRole('button', { name: /explore/i });
      expect(exploreButtons.length).toBeGreaterThan(0);
    });

    it('expands Explore children in mobile menu on click', () => {
      render(<MainNavigation />);

      fireEvent.click(screen.getByRole('button', { name: /toggle mobile menu/i }));

      const exploreButtons = screen.getAllByRole('button', { name: /explore/i });
      const mobileExploreButton = exploreButtons[exploreButtons.length - 1];
      fireEvent.click(mobileExploreButton);

      expect(screen.getByRole('link', { name: 'Blog' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Browse by Country' })).toBeInTheDocument();
    });
  });
});
