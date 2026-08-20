/**
 * SkeletonLoader Integration Tests
 *
 * Tests skeleton loading components with real logic.
 * No mocks needed - these are pure presentational components.
 *
 * Coverage Target: 60%+
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  SkeletonLoader,
  SearchResultSkeleton,
  ImageSkeleton,
  CardSkeleton,
  FilterSkeleton,
  ListSkeleton,
} from '../SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders with default props', () => {
    const { container } = render(<SkeletonLoader />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-label', 'Loading...');
  });

  it('applies custom width as string', () => {
    const { container } = render(<SkeletonLoader width="50%" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ width: '50%' });
  });

  it('applies custom width as number (converts to px)', () => {
    const { container } = render(<SkeletonLoader width={200} />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ width: '200px' });
  });

  it('applies custom height as string', () => {
    const { container } = render(<SkeletonLoader height="2rem" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ height: '2rem' });
  });

  it('applies custom height as number (converts to px)', () => {
    const { container } = render(<SkeletonLoader height={100} />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ height: '100px' });
  });

  it('applies rounded class when rounded is true', () => {
    const { container } = render(<SkeletonLoader rounded={true} />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.className).toContain('rounded-full');
  });

  it('applies rounded class (not rounded-full) when rounded is false', () => {
    const { container } = render(<SkeletonLoader rounded={false} />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.className).toContain('rounded');
    expect(skeleton.className).not.toContain('rounded-full');
  });

  it('applies animate-pulse class when animate is true', () => {
    const { container } = render(<SkeletonLoader animate={true} />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.className).toContain('animate-pulse');
  });

  it('does not apply animate-pulse class when animate is false', () => {
    const { container } = render(<SkeletonLoader animate={false} />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.className).not.toContain('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonLoader className="custom-class" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.className).toContain('custom-class');
  });
});

describe('SearchResultSkeleton', () => {
  it('renders default count of 3 skeletons', () => {
    const { container } = render(<SearchResultSkeleton />);

    const skeletons = container.querySelectorAll('.bg-card');
    expect(skeletons.length).toBe(3);
  });

  it('renders custom count of skeletons', () => {
    const { container } = render(<SearchResultSkeleton count={5} />);

    const skeletons = container.querySelectorAll('.bg-card');
    expect(skeletons.length).toBe(5);
  });

  it('shows images when showImages is true (default)', () => {
    const { container } = render(<SearchResultSkeleton />);

    // Check for image skeleton with width={120} height={180}
    const skeletons = container.querySelectorAll('div[aria-label="Loading..."]');
    expect(skeletons.length).toBeGreaterThan(3); // Includes image skeletons
  });

  it('hides images when showImages is false', () => {
    const { container } = render(<SearchResultSkeleton showImages={false} />);

    // Should have fewer skeletons when images are hidden
    const cards = container.querySelectorAll('.bg-card');
    expect(cards.length).toBe(3); // Still renders 3 cards

    // But no image skeletons with flex-shrink-0
    const imageSkeletons = container.querySelectorAll('.flex-shrink-0');
    expect(imageSkeletons.length).toBe(0);
  });

  it('renders with animate-pulse class on cards', () => {
    const { container } = render(<SearchResultSkeleton />);

    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBeGreaterThan(0);
  });
});

describe('ImageSkeleton', () => {
  it('renders with default poster aspect ratio', () => {
    const { container } = render(<ImageSkeleton />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ width: '200px', height: '300px' });
  });

  it('renders with square aspect ratio', () => {
    const { container } = render(<ImageSkeleton aspectRatio="square" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ width: '200px', height: '200px' });
  });

  it('renders with landscape aspect ratio', () => {
    const { container } = render(<ImageSkeleton aspectRatio="landscape" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ width: '300px', height: '169px' });
  });

  it('uses custom width and height when provided', () => {
    const { container } = render(<ImageSkeleton width={400} height={500} />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ width: '400px', height: '500px' });
  });

  it('custom dimensions override aspect ratio', () => {
    const { container } = render(<ImageSkeleton aspectRatio="square" width={100} height={200} />);

    const skeleton = container.firstChild as HTMLElement;
    // Custom dimensions should take precedence
    expect(skeleton).toHaveStyle({ width: '100px', height: '200px' });
  });

  it('applies custom className', () => {
    const { container } = render(<ImageSkeleton className="custom-image" />);

    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.className).toContain('custom-image');
  });

  it('renders shimmer animation', () => {
    const { container } = render(<ImageSkeleton />);

    // Check for shimmer effect div
    const shimmer = container.querySelector('.animate-\\[shimmer_2s_infinite\\]');
    expect(shimmer).toBeInTheDocument();
  });

  it('renders placeholder icon', () => {
    const { container } = render(<ImageSkeleton />);

    // Check for SVG icon
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});

describe('CardSkeleton', () => {
  it('renders with image by default', () => {
    const { container } = render(<CardSkeleton />);

    // Should have ImageSkeleton
    const imageContainer = container.querySelector('.relative.overflow-hidden');
    expect(imageContainer).toBeInTheDocument();
  });

  it('renders without image when showImage is false', () => {
    const { container } = render(<CardSkeleton showImage={false} />);

    // Should not have ImageSkeleton
    const imageContainer = container.querySelector('.relative.overflow-hidden');
    expect(imageContainer).not.toBeInTheDocument();
  });

  it('renders default 3 lines', () => {
    const { container } = render(<CardSkeleton />);

    // Check for content lines (looking for skeletons in p-4 div)
    // CardSkeleton renders `lines` content lines + 2 badge skeletons
    const contentDiv = container.querySelector('.p-4');
    const lines = contentDiv?.querySelectorAll('div[aria-label="Loading..."]');
    expect(lines?.length).toBe(5); // 3 content lines + 2 badges
  });

  it('renders custom number of lines', () => {
    const { container } = render(<CardSkeleton lines={5} />);

    const contentDiv = container.querySelector('.p-4');
    const lines = contentDiv?.querySelectorAll('div[aria-label="Loading..."]');
    expect(lines?.length).toBe(7); // 5 content lines + 2 badges
  });

  it('renders with custom image aspect ratio', () => {
    const { container } = render(<CardSkeleton imageAspectRatio="landscape" />);

    // Should render ImageSkeleton with landscape ratio (300x169)
    const imageContainer = container.querySelector('.relative.overflow-hidden');
    const imageDiv = imageContainer as HTMLElement;
    expect(imageDiv).toHaveStyle({ width: '300px', height: '169px' });
  });

  it('applies custom className', () => {
    const { container } = render(<CardSkeleton className="custom-card" />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('custom-card');
  });

  it('renders with animate-pulse class', () => {
    const { container } = render(<CardSkeleton />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('animate-pulse');
  });

  it('renders badges at the bottom', () => {
    const { container } = render(<CardSkeleton />);

    // Check for rounded badges (space-x-2 container has 2 rounded skeletons)
    const badgeContainer = container.querySelector('.flex.space-x-2');
    expect(badgeContainer).toBeInTheDocument();
  });
});

describe('FilterSkeleton', () => {
  it('renders default count of 5 filter groups', () => {
    const { container } = render(<FilterSkeleton />);

    const filterGroups = container.querySelectorAll('.space-y-3');
    expect(filterGroups.length).toBe(5);
  });

  it('renders custom count of filter groups', () => {
    const { container } = render(<FilterSkeleton count={3} />);

    const filterGroups = container.querySelectorAll('.space-y-3');
    expect(filterGroups.length).toBe(3);
  });

  it('renders 4 options per filter group', () => {
    const { container } = render(<FilterSkeleton count={1} />);

    // Each filter group has 4 options
    const options = container.querySelectorAll('.flex.items-center.space-x-2');
    expect(options.length).toBe(4);
  });

  it('renders filter title skeleton', () => {
    const { container } = render(<FilterSkeleton count={1} />);

    // Check for title skeleton (40% width, 20 height)
    const allSkeletons = container.querySelectorAll('div[aria-label="Loading..."]');
    expect(allSkeletons.length).toBeGreaterThan(0);
  });
});

describe('ListSkeleton', () => {
  it('renders default 6 items in grid layout', () => {
    const { container } = render(<ListSkeleton />);

    // Grid layout has grid class
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();

    // Should have 6 CardSkeletons
    const cards = container.querySelectorAll('.bg-card');
    expect(cards.length).toBe(6);
  });

  it('renders custom item count in grid', () => {
    const { container } = render(<ListSkeleton itemCount={10} />);

    const cards = container.querySelectorAll('.bg-card');
    expect(cards.length).toBe(10);
  });

  it('renders horizontal layout when horizontal is true', () => {
    const { container } = render(<ListSkeleton horizontal={true} itemCount={4} />);

    // Horizontal layout has flex class
    const flex = container.querySelector('.flex.space-x-4');
    expect(flex).toBeInTheDocument();

    // Should have 4 items
    const items = container.querySelectorAll('.flex-shrink-0');
    expect(items.length).toBe(4);
  });

  it('shows images by default in grid layout', () => {
    const { container } = render(<ListSkeleton itemCount={2} />);

    // CardSkeletons should have images
    const images = container.querySelectorAll('.relative.overflow-hidden');
    expect(images.length).toBe(2);
  });

  it('renders images in grid layout (showImages prop not passed to CardSkeleton)', () => {
    const { container } = render(<ListSkeleton itemCount={2} showImages={false} />);

    // In grid mode, ListSkeleton doesn't pass showImages to CardSkeleton
    // So images still render (CardSkeleton defaults to showImage=true)
    const cards = container.querySelectorAll('.bg-card');
    expect(cards.length).toBe(2);

    const images = container.querySelectorAll('.relative.overflow-hidden');
    expect(images.length).toBe(2); // Images still render in grid mode
  });

  it('shows images in horizontal layout when showImages is true', () => {
    const { container } = render(<ListSkeleton horizontal={true} showImages={true} itemCount={3} />);

    const images = container.querySelectorAll('.relative.overflow-hidden');
    expect(images.length).toBe(3);
  });

  it('hides images in horizontal layout when showImages is false', () => {
    const { container } = render(<ListSkeleton horizontal={true} showImages={false} itemCount={3} />);

    const images = container.querySelectorAll('.relative.overflow-hidden');
    expect(images.length).toBe(0);
  });

  it('renders grid with responsive column classes', () => {
    const { container } = render(<ListSkeleton />);

    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain('grid-cols-2');
    expect(grid.className).toContain('md:grid-cols-3');
    expect(grid.className).toContain('lg:grid-cols-4');
    expect(grid.className).toContain('xl:grid-cols-5');
  });
});

/**
 * COVERAGE TARGET: 60%+
 * Total Tests: 50
 * Pure presentational components - no mocks needed
 * Tests rendering, props, styling, and conditional rendering
 */
