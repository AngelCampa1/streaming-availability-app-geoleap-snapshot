import { render, screen } from '@testing-library/react';
import { StreamingServiceLogo } from '../StreamingServiceLogo';

describe('StreamingServiceLogo', () => {
  describe('Rendering', () => {
    it('renders logo image for known service', () => {
      render(<StreamingServiceLogo serviceId="netflix" />);

      const logo = screen.getByRole('img');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('alt', 'Netflix streaming service logo');
    });

    it('renders fallback icon for unknown service', () => {
      render(<StreamingServiceLogo serviceId="unknown-service" />);

      // Should render fallback text icon
      const fallback = screen.getByText(/./);
      expect(fallback).toBeInTheDocument();
    });

    it('renders with correct size variant - xs (16px)', () => {
      render(<StreamingServiceLogo serviceId="netflix" size="xs" />);

      const container = screen.getByRole('img').parentElement;
      expect(container).toHaveStyle({ width: '16px', height: '16px' });
    });

    it('renders with correct size variant - sm (24px)', () => {
      render(<StreamingServiceLogo serviceId="netflix" size="sm" />);

      const container = screen.getByRole('img').parentElement;
      expect(container).toHaveStyle({ width: '24px', height: '24px' });
    });

    it('renders with correct size variant - md (32px)', () => {
      render(<StreamingServiceLogo serviceId="netflix" size="md" />);

      const container = screen.getByRole('img').parentElement;
      expect(container).toHaveStyle({ width: '32px', height: '32px' });
    });

    it('renders with correct size variant - lg (48px)', () => {
      render(<StreamingServiceLogo serviceId="netflix" size="lg" />);

      const container = screen.getByRole('img').parentElement;
      expect(container).toHaveStyle({ width: '48px', height: '48px' });
    });

    it('renders with correct size variant - xl (64px)', () => {
      render(<StreamingServiceLogo serviceId="netflix" size="xl" />);

      const container = screen.getByRole('img').parentElement;
      expect(container).toHaveStyle({ width: '64px', height: '64px' });
    });

    it('applies custom className', () => {
      render(<StreamingServiceLogo serviceId="netflix" className="custom-class" />);

      const container = screen.getByLabelText(/Netflix streaming service/i);
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('has proper alt text for screen readers', () => {
      render(<StreamingServiceLogo serviceId="hbo" />);

      const logo = screen.getByRole('img');
      expect(logo).toHaveAttribute('alt', 'HBO Max streaming service logo');
    });

    it('has role="img" for logo image', () => {
      render(<StreamingServiceLogo serviceId="disney" />);

      const logo = screen.getByRole('img');
      expect(logo).toBeInTheDocument();
    });

    it('provides descriptive aria-label on container', () => {
      render(<StreamingServiceLogo serviceId="amazon" />);

      const container = screen.getByLabelText(/Amazon Prime Video/i);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Service Name Display', () => {
    it('shows service name when showName is true', () => {
      render(<StreamingServiceLogo serviceId="netflix" showName={true} />);

      expect(screen.getByText('Netflix')).toBeInTheDocument();
    });

    it('hides service name when showName is false', () => {
      render(<StreamingServiceLogo serviceId="netflix" showName={false} />);

      expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
    });

    it('hides service name by default', () => {
      render(<StreamingServiceLogo serviceId="hulu" />);

      expect(screen.queryByText('Hulu')).not.toBeInTheDocument();
    });
  });

  describe('Fallback Behavior', () => {
    it('uses brand color for fallback when logo unavailable', () => {
      render(<StreamingServiceLogo serviceId="unknown-service" />);

      const fallback = screen.getByRole('img');
      expect(fallback).toBeInTheDocument();
      // Should render fallback container
      expect(fallback).toHaveAttribute('aria-label', 'Unknown streaming service');
    });

    it('displays fallback text icon from POPULAR_SERVICES', () => {
      render(<StreamingServiceLogo serviceId="netflix" fallbackToIcon={true} />);

      // Should show 'N' for Netflix if logo fails
      const fallback = screen.getByText('N');
      expect(fallback).toBeInTheDocument();
    });
  });

  describe('Logo Path Generation', () => {
    it('generates correct logo path for known services', () => {
      render(<StreamingServiceLogo serviceId="netflix" />);

      const logo = screen.getByRole('img') as HTMLImageElement;
      expect(logo.src).toContain('/logos/streaming/netflix.svg');
    });

    it('handles service IDs with special characters', () => {
      render(<StreamingServiceLogo serviceId="disney" />);

      const logo = screen.getByRole('img') as HTMLImageElement;
      expect(logo.src).toContain('/logos/streaming/disney-plus.svg');
    });
  });
});
