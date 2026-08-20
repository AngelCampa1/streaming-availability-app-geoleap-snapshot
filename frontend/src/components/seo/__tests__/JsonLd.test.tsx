import React from 'react';
import { render } from '@testing-library/react';
import { JsonLd } from '../JsonLd';

describe('JsonLd', () => {
  it('renders a script tag with application/ld+json type', () => {
    const data = { '@context': 'https://schema.org', '@type': 'Organization', name: 'GeoLeap' };
    const { container } = render(<JsonLd data={data} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
  });

  it('renders valid JSON in the script tag', () => {
    const data = { '@context': 'https://schema.org', '@type': 'Organization', name: 'GeoLeap' };
    const { container } = render(<JsonLd data={data} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const parsed = JSON.parse(script?.innerHTML || '{}');
    expect(parsed['@type']).toBe('Organization');
  });

  it('handles an array of schemas', () => {
    const data = [
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'GeoLeap' },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'GeoLeap' },
    ];
    const { container } = render(<JsonLd data={data} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(2);
  });

  it('returns null for empty array', () => {
    const { container } = render(<JsonLd data={[]} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(0);
  });

  it('renders single schema as one script tag', () => {
    const data = { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Test' };
    const { container } = render(<JsonLd data={data} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
  });

  describe('graph mode', () => {
    it('emits a single script with @graph when graph={true} and multiple schemas', () => {
      const data = [
        { '@context': 'https://schema.org', '@type': 'Organization', name: 'GeoLeap' },
        { '@context': 'https://schema.org', '@type': 'WebSite', name: 'GeoLeap' },
      ];
      const { container } = render(<JsonLd data={data} graph />);
      const scripts = container.querySelectorAll('script[type="application/ld+json"]');
      expect(scripts).toHaveLength(1);
      const parsed = JSON.parse(scripts[0].innerHTML);
      expect(parsed['@context']).toBe('https://schema.org');
      expect(Array.isArray(parsed['@graph'])).toBe(true);
      expect(parsed['@graph']).toHaveLength(2);
    });

    it('strips @context from individual schemas in @graph', () => {
      const data = [
        { '@context': 'https://schema.org', '@type': 'Organization', name: 'GeoLeap' },
        { '@context': 'https://schema.org', '@type': 'WebSite', name: 'GeoLeap' },
      ];
      const { container } = render(<JsonLd data={data} graph />);
      const parsed = JSON.parse(container.querySelector('script')?.innerHTML || '{}');
      for (const node of parsed['@graph'] as Array<Record<string, unknown>>) {
        expect(node['@context']).toBeUndefined();
      }
    });

    it('emits a single @graph script for a single schema when graph={true}', () => {
      const data = { '@context': 'https://schema.org', '@type': 'Organization', name: 'GeoLeap' };
      const { container } = render(<JsonLd data={data} graph />);
      const scripts = container.querySelectorAll('script[type="application/ld+json"]');
      expect(scripts).toHaveLength(1);
      const parsed = JSON.parse(scripts[0].innerHTML);
      expect(Array.isArray(parsed['@graph'])).toBe(true);
      expect(parsed['@graph']).toHaveLength(1);
    });

    it('falls back to individual scripts when graph is not set', () => {
      const data = [
        { '@context': 'https://schema.org', '@type': 'Organization', name: 'GeoLeap' },
        { '@context': 'https://schema.org', '@type': 'WebSite', name: 'GeoLeap' },
      ];
      const { container } = render(<JsonLd data={data} />);
      const scripts = container.querySelectorAll('script[type="application/ld+json"]');
      expect(scripts).toHaveLength(2);
    });
  });
});
