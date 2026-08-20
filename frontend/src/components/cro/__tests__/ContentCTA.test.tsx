/**
 * Tests for ContentCTA component
 *
 * Coverage: renders contextual copy per page type, interpolates context names,
 * links to /search and /pricing, renders for all supported page types
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ContentCTA } from '../ContentCTA';

describe('ContentCTA', () => {
  it('renders a search CTA link', () => {
    render(<ContentCTA pageType="country" context={{ name: 'Japan' }} />);
    const link = screen.getByRole('link', { name: /search/i });
    expect(link).toHaveAttribute('href', '/search');
  });

  it('renders a pricing link', () => {
    render(<ContentCTA pageType="platform" context={{ name: 'Netflix' }} />);
    const link = screen.getByRole('link', { name: /pricing/i });
    expect(link).toHaveAttribute('href', '/pricing');
  });

  it('interpolates country name in headline', () => {
    render(<ContentCTA pageType="country" context={{ name: 'Japan' }} />);
    expect(screen.getByText(/Japan/)).toBeInTheDocument();
  });

  it('interpolates platform name in headline', () => {
    render(<ContentCTA pageType="platform" context={{ name: 'Netflix' }} />);
    expect(screen.getByText(/Netflix/)).toBeInTheDocument();
  });

  it('renders without context (uses fallback copy)', () => {
    render(<ContentCTA pageType="guide" />);
    expect(screen.getByRole('link', { name: /search/i })).toBeInTheDocument();
  });

  it('renders for all supported page types without error', () => {
    const pageTypes = [
      'country',
      'platform',
      'compare',
      'glossary',
      'sport',
      'genre',
      'guide',
      'blog',
      'how-to-watch',
    ] as const;

    pageTypes.forEach((pageType) => {
      const { unmount } = render(
        <ContentCTA pageType={pageType} context={{ name: 'Test' }} />
      );
      expect(screen.getByRole('link', { name: /search/i })).toBeInTheDocument();
      unmount();
    });
  });

  it('includes capability stat in body text', () => {
    render(<ContentCTA pageType="country" context={{ name: 'Japan' }} />);
    expect(screen.getByText(/42 streaming services/i)).toBeInTheDocument();
  });

  describe('design token compliance', () => {
    it('uses design token classes instead of hardcoded violet colors', () => {
      const { container } = render(<ContentCTA pageType="compare" />);
      const html = container.innerHTML;

      expect(html).not.toContain('border-violet-');
      expect(html).not.toContain('bg-violet-');
      expect(html).not.toContain('text-violet-');
      expect(html).not.toContain('hover:bg-violet-');
      expect(html).not.toContain('hover:text-violet-');
    });

    it('uses design token classes instead of hardcoded gray colors', () => {
      const { container } = render(<ContentCTA pageType="compare" />);
      const html = container.innerHTML;

      expect(html).not.toContain('text-gray-');
    });

    it('uses semantic primary classes for CTA button', () => {
      const { container } = render(<ContentCTA pageType="compare" />);
      const html = container.innerHTML;

      expect(html).toContain('bg-primary');
      expect(html).toContain('border-primary');
    });

    it('uses semantic text classes for content', () => {
      const { container } = render(<ContentCTA pageType="compare" />);
      const html = container.innerHTML;

      expect(html).toContain('text-foreground');
      expect(html).toContain('text-muted-foreground');
    });
  });
});
