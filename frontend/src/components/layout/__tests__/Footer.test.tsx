import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';

describe('Footer', () => {
  it('renders Browse column with all hub links', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Streaming Platforms' })).toHaveAttribute('href', '/platforms');
    expect(screen.getByRole('link', { name: 'Browse by Country' })).toHaveAttribute('href', '/countries');
    expect(screen.getByRole('link', { name: 'Compare Services' })).toHaveAttribute('href', '/compare');
    expect(screen.getByRole('link', { name: 'Sports Streaming' })).toHaveAttribute('href', '/sports');
    expect(screen.getByRole('link', { name: 'How to Watch' })).toHaveAttribute('href', '/how-to-watch');
  });

  it('renders Learn column with all hub links', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
    expect(screen.getByRole('link', { name: 'Guides' })).toHaveAttribute('href', '/guides');
    expect(screen.getByRole('link', { name: 'Genre Guides' })).toHaveAttribute('href', '/genres');
    expect(screen.getByRole('link', { name: 'Streaming Glossary' })).toHaveAttribute('href', '/glossary');
  });

  it('renders Product column links', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/search');
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing');
  });

  it('renders Legal column links', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
  });

  it('renders Support column with all links', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq');
    expect(screen.getByRole('link', { name: 'Help Center' })).toHaveAttribute('href', '/help');
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
    expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', 'mailto:hello@example.com');
  });

  it('renders Connect column with Twitter link', () => {
    render(<Footer />);
    const twitterLink = screen.getByRole('link', { name: 'Twitter' });
    expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/geoleapapp');
    expect(twitterLink).toHaveAttribute('target', '_blank');
    expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders copyright notice', () => {
    render(<Footer />);
    expect(screen.getByText(/GeoLeap\. All rights reserved\./)).toBeInTheDocument();
  });

  it('renders all section headings', () => {
    render(<Footer />);
    expect(screen.getByRole('heading', { name: 'Browse' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Legal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Connect' })).toBeInTheDocument();
  });
});
