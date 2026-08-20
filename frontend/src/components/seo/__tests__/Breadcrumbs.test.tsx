import React from 'react';
import { render, screen } from '@testing-library/react';
import { Breadcrumbs } from '../Breadcrumbs';

describe('Breadcrumbs', () => {
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Platforms', href: '/platforms' },
    { label: 'Netflix', href: '/platforms/netflix' },
  ];

  it('renders the correct number of breadcrumb items', () => {
    render(<Breadcrumbs items={items} />);
    // Check for the labels
    expect(screen.getByText('Home')).toBeDefined();
    expect(screen.getByText('Platforms')).toBeDefined();
    expect(screen.getByText('Netflix')).toBeDefined();
  });

  it('includes a JSON-LD script tag', () => {
    const { container } = render(<Breadcrumbs items={items} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
  });

  it('JSON-LD contains BreadcrumbList type', () => {
    const { container } = render(<Breadcrumbs items={items} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const parsed = JSON.parse(script?.innerHTML || '{}');
    expect(parsed['@type']).toBe('BreadcrumbList');
  });

  it('JSON-LD contains correct number of list items', () => {
    const { container } = render(<Breadcrumbs items={items} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const parsed = JSON.parse(script?.innerHTML || '{}');
    expect(parsed.itemListElement).toHaveLength(3);
  });

  it('renders a nav element for accessibility', () => {
    const { container } = render(<Breadcrumbs items={items} />);
    const nav = container.querySelector('nav');
    expect(nav).not.toBeNull();
  });

  it('renders links for non-last items', () => {
    render(<Breadcrumbs items={items} />);
    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toBeDefined();
  });

  describe('design token compliance', () => {
    it('uses design token classes instead of hardcoded gray colors', () => {
      const { container } = render(<Breadcrumbs items={items} />);
      const html = container.innerHTML;

      expect(html).not.toContain('text-gray-');
    });

    it('uses design token classes instead of hardcoded violet colors', () => {
      const { container } = render(<Breadcrumbs items={items} />);
      const html = container.innerHTML;

      expect(html).not.toContain('text-violet-');
      expect(html).not.toContain('hover:text-violet-');
    });

    it('uses semantic text classes', () => {
      const { container } = render(<Breadcrumbs items={items} />);
      const html = container.innerHTML;

      expect(html).toContain('text-muted-foreground');
      expect(html).toContain('text-foreground');
      expect(html).toContain('hover:text-primary');
    });
  });
});
