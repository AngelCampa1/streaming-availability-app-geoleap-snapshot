/**
 * SearchResultsSkeleton Component Tests
 *
 * Test coverage for loading state skeleton component.
 * Tests visual rendering, props handling, and responsive layouts.
 */

import React from 'react';
import { render } from '@testing-library/react';
import SearchResultsSkeleton from '../SearchResultsSkeleton';

describe('SearchResultsSkeleton', () => {
  describe('Basic Rendering', () => {
    it('renders skeleton component', () => {
      const { container } = render(<SearchResultsSkeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders with default 5 skeleton items', () => {
      const { container } = render(<SearchResultsSkeleton />);
      const skeletons = container.querySelectorAll('.bg-card.rounded-lg');
      expect(skeletons.length).toBe(5);
    });

    it('renders search stats skeleton', () => {
      const { container } = render(<SearchResultsSkeleton />);
      const statsSkeletons = container.querySelectorAll('.animate-pulse');
      expect(statsSkeletons.length).toBeGreaterThan(0);
    });

    it('renders pagination skeleton', () => {
      const { container } = render(<SearchResultsSkeleton />);
      const pagination = container.querySelector('.flex.justify-center');
      expect(pagination).toBeInTheDocument();
    });
  });

  describe('Count Prop', () => {
    it('renders custom count of skeleton items', () => {
      const { container } = render(<SearchResultsSkeleton count={3} />);
      const skeletons = container.querySelectorAll('.bg-card.rounded-lg');
      expect(skeletons.length).toBe(3);
    });

    it('renders 10 skeleton items when count is 10', () => {
      const { container } = render(<SearchResultsSkeleton count={10} />);
      const skeletons = container.querySelectorAll('.bg-card.rounded-lg');
      expect(skeletons.length).toBe(10);
    });

    it('renders 1 skeleton item when count is 1', () => {
      const { container } = render(<SearchResultsSkeleton count={1} />);
      const skeletons = container.querySelectorAll('.bg-card.rounded-lg');
      expect(skeletons.length).toBe(1);
    });

    it('renders 20 skeleton items when count is 20', () => {
      const { container } = render(<SearchResultsSkeleton count={20} />);
      const skeletons = container.querySelectorAll('.bg-card.rounded-lg');
      expect(skeletons.length).toBe(20);
    });
  });

  describe('Global View Mode', () => {
    it('renders with global view by default', () => {
      const { container } = render(<SearchResultsSkeleton />);
      // Global view shows availability sections
      const globalAvailability = container.querySelectorAll('.bg-muted\\/50');
      expect(globalAvailability.length).toBeGreaterThan(0);
    });

    it('renders without global view when showGlobalView is false', () => {
      const { container } = render(<SearchResultsSkeleton showGlobalView={false} />);
      // Without global view, should show simpler availability markers
      const globalAvailability = container.querySelectorAll('.bg-muted\\/50');
      expect(globalAvailability.length).toBe(0);
    });

    it('shows global availability indicator in global view mode', () => {
      const { container } = render(<SearchResultsSkeleton showGlobalView={true} />);
      const indicators = container.querySelectorAll('.bg-muted\\/50');
      expect(indicators.length).toBeGreaterThan(0);
    });
  });

  describe('Compact Mode', () => {
    it('renders in normal mode by default', () => {
      const { container } = render(<SearchResultsSkeleton />);
      // Normal mode uses shadow-md class
      const normalCards = container.querySelectorAll('.shadow-md');
      expect(normalCards.length).toBeGreaterThan(0);
    });

    it('renders in compact mode when compactMode is true', () => {
      const { container } = render(<SearchResultsSkeleton compactMode={true} />);
      // Compact mode uses border class
      const compactCards = container.querySelectorAll('.border');
      expect(compactCards.length).toBeGreaterThan(0);
    });

    it('uses smaller dimensions in compact mode', () => {
      const { container } = render(<SearchResultsSkeleton compactMode={true} count={1} />);
      // Compact mode uses w-12 h-18 for poster instead of w-16 h-24
      const poster = container.querySelector('.w-12.h-18');
      expect(poster).toBeInTheDocument();
    });

    it('uses larger dimensions in normal mode', () => {
      const { container } = render(<SearchResultsSkeleton compactMode={false} count={1} />);
      // Normal mode uses w-16 h-24 for poster
      const poster = container.querySelector('.w-16.h-24');
      expect(poster).toBeInTheDocument();
    });
  });

  describe('ClassName Prop', () => {
    it('applies default empty className', () => {
      const { container } = render(<SearchResultsSkeleton />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<SearchResultsSkeleton className="custom-class" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('preserves space-y-4 className with custom class', () => {
      const { container } = render(<SearchResultsSkeleton className="my-custom" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('space-y-4', 'my-custom');
    });
  });

  describe('Skeleton Structure', () => {
    it('renders poster skeleton', () => {
      const { container } = render(<SearchResultsSkeleton count={1} />);
      const poster = container.querySelector('.flex-shrink-0.bg-muted.rounded-md');
      expect(poster).toBeInTheDocument();
    });

    it('renders title skeleton', () => {
      const { container } = render(<SearchResultsSkeleton count={1} />);
      const title = container.querySelector('.bg-muted.rounded');
      expect(title).toBeInTheDocument();
    });

    it('renders metadata skeletons', () => {
      const { container } = render(<SearchResultsSkeleton count={1} />);
      const metadata = container.querySelectorAll('.bg-muted.rounded-full');
      // Should have multiple metadata items (rating, year, etc.)
      expect(metadata.length).toBeGreaterThan(0);
    });

    it('renders genre badges in skeleton', () => {
      const { container } = render(<SearchResultsSkeleton count={1} />);
      const genres = container.querySelectorAll('.bg-muted.rounded-full');
      expect(genres.length).toBeGreaterThan(2);
    });

    it('does not render description in compact mode', () => {
      const { container } = render(<SearchResultsSkeleton count={1} compactMode={true} />);
      // Compact mode has fewer skeleton elements
      const allSkeletons = container.querySelectorAll('.bg-muted');
      const compactCount = allSkeletons.length;

      const { container: normalContainer } = render(<SearchResultsSkeleton count={1} compactMode={false} />);
      const normalSkeletons = normalContainer.querySelectorAll('.bg-muted');
      const normalCount = normalSkeletons.length;

      // Normal mode should have more skeletons than compact mode
      expect(normalCount).toBeGreaterThan(compactCount);
    });

    it('renders description in normal mode', () => {
      const { container } = render(<SearchResultsSkeleton count={1} compactMode={false} />);
      // Normal mode should have description skeletons (multiple lines)
      const descriptions = container.querySelectorAll('.mb-3 .bg-muted.rounded.h-4');
      expect(descriptions.length).toBeGreaterThan(0);
    });
  });

  describe('Animation', () => {
    it('applies animate-pulse to skeleton elements', () => {
      const { container } = render(<SearchResultsSkeleton />);
      const animatedElements = container.querySelectorAll('.animate-pulse');
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('applies animate-pulse to search stats', () => {
      const { container } = render(<SearchResultsSkeleton />);
      const statsContainer = container.querySelector('.flex.items-center.justify-between');
      const animatedStats = statsContainer?.querySelectorAll('.animate-pulse');
      expect(animatedStats && animatedStats.length).toBeGreaterThan(0);
    });

    it('applies animate-pulse to pagination', () => {
      const { container } = render(<SearchResultsSkeleton />);
      const paginationElements = container.querySelectorAll('.flex.justify-center .animate-pulse');
      expect(paginationElements.length).toBeGreaterThan(0);
    });
  });

  describe('Pagination Skeleton', () => {
    it('renders pagination with 5 page number skeletons', () => {
      const { container } = render(<SearchResultsSkeleton />);
      const pagination = container.querySelector('.flex.justify-center.items-center');
      const pageNumbers = pagination?.querySelectorAll('.w-8.h-8');
      expect(pageNumbers?.length).toBe(5);
    });

    it('renders previous button skeleton', () => {
      const { container } = render(<SearchResultsSkeleton />);
      const pagination = container.querySelector('.flex.justify-center');
      const prevButton = pagination?.querySelector('.w-20');
      expect(prevButton).toBeInTheDocument();
    });

    it('renders next button skeleton', () => {
      const { container } = render(<SearchResultsSkeleton />);
      const pagination = container.querySelector('.flex.justify-center');
      const nextButton = pagination?.querySelector('.w-16');
      expect(nextButton).toBeInTheDocument();
    });
  });

  describe('Combined Props', () => {
    it('handles all props together', () => {
      const { container } = render(
        <SearchResultsSkeleton
          count={7}
          showGlobalView={false}
          compactMode={true}
          className="test-class"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('test-class');

      const skeletons = container.querySelectorAll('.bg-card.rounded-lg');
      expect(skeletons.length).toBe(7);

      const compactPosters = container.querySelectorAll('.w-12.h-18');
      expect(compactPosters.length).toBe(7);
    });

    it('handles global view with custom count', () => {
      const { container } = render(
        <SearchResultsSkeleton count={3} showGlobalView={true} />
      );

      const skeletons = container.querySelectorAll('.bg-card.rounded-lg');
      expect(skeletons.length).toBe(3);

      const globalSections = container.querySelectorAll('.bg-muted\\/50');
      expect(globalSections.length).toBeGreaterThan(0);
    });
  });
});
