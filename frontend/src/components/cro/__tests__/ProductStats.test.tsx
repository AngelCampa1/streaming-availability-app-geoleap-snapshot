import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProductStats } from '../ProductStats';

describe('ProductStats', () => {
  it('renders all three capability stats', () => {
    render(<ProductStats />);
    expect(screen.getByText('42 Streaming Services')).toBeInTheDocument();
    expect(screen.getByText('57 Countries')).toBeInTheDocument();
    expect(screen.getByText('42 Platform Guides')).toBeInTheDocument();
  });

  describe('design token compliance', () => {
    it('uses design token classes instead of hardcoded colors', () => {
      const { container } = render(<ProductStats />);
      const html = container.innerHTML;

      expect(html).not.toContain('text-violet-');
      expect(html).not.toContain('text-gray-');
    });

    it('uses semantic primary and muted-foreground classes', () => {
      const { container } = render(<ProductStats />);
      const html = container.innerHTML;

      expect(html).toContain('text-primary');
      expect(html).toContain('text-muted-foreground');
    });
  });
});
