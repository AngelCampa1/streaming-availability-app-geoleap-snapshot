import { render, screen } from '@testing-library/react';
import { PaywalledSearchResultCard } from './PaywalledSearchResultCard';
import { PaywalledSearchResult, ContentType } from '@/lib/types/paywall';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  logPaywallInteraction: jest.fn(),
}));

jest.mock('@/components/vpn/VpnCountryInlineExpansion', () => ({
  VpnCountryInlineExpansion: () => null,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const baseResult: PaywalledSearchResult = {
  id: 'test-1',
  title: 'Test Movie',
  type: ContentType.Movie,
  year: 2024,
  description: 'A test movie description',
  imdbRating: 8.5,
  genres: ['Action', 'Drama'],
  availableCountries: 15,
  relevanceScore: 90,
  isPaywalled: true, // even when isPaywalled=true, no blur/lock should appear
  streamingOptions: [
    {
      serviceId: 'netflix',
      serviceName: 'Netflix',
      type: 'subscription',
      availableInCountries: ['US', 'UK'],
      url: 'https://netflix.com/watch/1',
    },
  ],
};

describe('PaywalledSearchResultCard  -  no blur/lock', () => {
  it('renders title without blur when isPaywalled=true', () => {
    render(
      <PaywalledSearchResultCard
        result={baseResult}
        userCountryCode="US"
      />
    );
    const title = screen.getByText('Test Movie');
    expect(title).toBeInTheDocument();
    expect(title.className).not.toContain('blur');
  });

  it('does NOT render lock/paywall overlay', () => {
    render(
      <PaywalledSearchResultCard
        result={baseResult}
        userCountryCode="US"
      />
    );
    expect(screen.queryByText(/Premium Content/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unlock Now/i)).not.toBeInTheDocument();
  });

  it('renders geo-restriction warning when content not in user country', () => {
    render(
      <PaywalledSearchResultCard
        result={baseResult}
        userCountryCode="DE" // Not in US or UK streaming options
      />
    );
    expect(screen.getByText(/Not Available in Your Region/i)).toBeInTheDocument();
  });

  it('renders Find with Your VPN button for geo-restricted content', () => {
    render(
      <PaywalledSearchResultCard
        result={baseResult}
        userCountryCode="DE"
      />
    );
    expect(screen.getByText(/Find with Your VPN/i)).toBeInTheDocument();
  });

  it('renders year and IMDB rating without blur', () => {
    render(
      <PaywalledSearchResultCard
        result={baseResult}
        userCountryCode="US"
      />
    );
    expect(screen.getByText('2024')).toBeInTheDocument();
  });
});
