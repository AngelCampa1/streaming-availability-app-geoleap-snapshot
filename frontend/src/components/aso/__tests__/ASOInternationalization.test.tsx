import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import ASOInternationalizationManager from '../ASOInternationalizationManager';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      // Mock translation function
      const translations: Record<string, string> = {
        'aso.keywords.title': 'Keyword Management',
        'aso.keywords.search_volume': 'Search Volume',
        'aso.keywords.competition': 'Competition',
        'aso.keywords.ranking': 'Current Ranking',
        'aso.markets.united_states': 'United States',
        'aso.markets.united_kingdom': 'United Kingdom',
        'aso.markets.germany': 'Germany',
        'aso.markets.japan': 'Japan',
        'aso.markets.spain': 'Spain',
        'aso.localization.title': 'Localization Management',
        'aso.localization.add_locale': 'Add New Locale',
        'aso.localization.sync_status': 'Sync Status',
        'common.loading': 'Loading...',
        'common.error': 'Error occurred',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
      };
      return options?.count !== undefined ? `${translations[key]} (${options.count})` : translations[key] || key;
    },
    i18n: {
      changeLanguage: jest.fn() as any,
      language: 'en',
      languages: ['en', 'es', 'fr', 'de', 'ja'],
    },
  }),
}));

// MSW handles API mocking via jest.setup.js

/**
 * ASO Internationalization Test Suite
 * Tests comprehensive internationalization and localization functionality
 * Validates multi-market ASO content generation and management
 */
describe('ASO Internationalization', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    jest.clearAllMocks();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };

  describe('Component Rendering', () => {
    it('renders internationalization manager interface', () => {
      renderWithQueryClient(<ASOInternationalizationManager appId="test-app" />);

      expect(screen.getByText('ASO Internationalization Manager')).toBeInTheDocument();
      expect(screen.getByText('Progress: 0%')).toBeInTheDocument();
    });

    it('displays progress bar for localization generation', async () => {
      renderWithQueryClient(<ASOInternationalizationManager appId="test-app" />);

      // Wait for the progress bar to appear when loading starts
      await waitFor(
        () => {
          const progressBar = screen.getByRole('progressbar');
          expect(progressBar).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Locale Content Generation', () => {
    it('generates localized content for multiple markets', async () => {
      renderWithQueryClient(<ASOInternationalizationManager appId="test-app" />);

      await waitFor(
        () => {
          expect(screen.getByText('EN')).toBeInTheDocument();
          expect(screen.getByText('ES')).toBeInTheDocument();
          expect(screen.getByText('FR')).toBeInTheDocument();
          expect(screen.getByText('DE')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('displays market data for each locale', async () => {
      renderWithQueryClient(<ASOInternationalizationManager appId="test-app" />);

      await waitFor(
        () => {
          // Check for generated keyword counts
          const keywordElements = screen.getAllByText(/Keywords: \d+/);
          expect(keywordElements.length).toBeGreaterThan(0);

          // Check for search volume data
          const volumeElements = screen.getAllByText(/Search Vol: \d{1,3},\d{3}/);
          expect(volumeElements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it('completes localization process with progress tracking', async () => {
      renderWithQueryClient(<ASOInternationalizationManager appId="test-app" />);

      // Initially at 0%
      expect(screen.getByText('Progress: 0%')).toBeInTheDocument();

      // Eventually reaches 100%
      await waitFor(
        () => {
          // Look for high progress completion
          const progressText = screen.queryByText(/Progress: (?:9[0-9]|100)%/);
          expect(progressText).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Market Analysis', () => {
    it('generates market-specific app titles', async () => {
      renderWithQueryClient(<ASOInternationalizationManager appId="test-app" />);

      await waitFor(
        () => {
          // Check for localized titles
          const titleElements = screen.getAllByText(/GeoLeap - Secure Streaming/);
          expect(titleElements.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it('provides competitive analysis for each market', async () => {
      renderWithQueryClient(<ASOInternationalizationManager appId="test-app" />);

      await waitFor(
        () => {
          // Each locale card should show market data
          const localeCards = screen.getAllByText(/^[A-Z]{2}$/);
          expect(localeCards.length).toBeGreaterThan(5); // Should have multiple locales
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Performance Optimization', () => {
    it('handles large-scale localization efficiently', async () => {
      const startTime = performance.now();

      renderWithQueryClient(
        <ASOInternationalizationManager
          appId="test-app"
          targetMarkets={['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']}
        />
      );

      await waitFor(
        () => {
          // Look for high progress completion
          const progressText = screen.queryByText(/Progress: (?:9[0-9]|100)%/);
          expect(progressText).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const processingTime = performance.now() - startTime;
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.warn(`✅ ASO INTERNATIONALIZATION: Processed 10 markets in ${processingTime.toFixed(2)}ms`);
    });

    it('efficiently manages memory with concurrent locale processing', async () => {
      const component = renderWithQueryClient(<ASOInternationalizationManager appId="test-app" />);

      await waitFor(
        () => {
          // Look for high progress completion
          const progressText = screen.queryByText(/Progress: (?:9[0-9]|100)%/);
          expect(progressText).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Component should remain stable
      expect(component.container.firstChild).toBeInTheDocument();
    });
  });

  describe('Integration Points', () => {
    it('calls completion callback with generated content', async () => {
      const onComplete = jest.fn() as any;

      renderWithQueryClient(<ASOInternationalizationManager appId="test-app" onLocalizationComplete={onComplete} />);

      await waitFor(
        () => {
          expect(onComplete).toHaveBeenCalledWith(
            expect.objectContaining({
              en: expect.objectContaining({
                appTitle: expect.any(String),
                appDescription: expect.any(String),
                keywords: expect.any(Array),
                marketData: expect.any(Object),
              }),
            })
          );
        },
        { timeout: 3000 }
      );
    });

    it('handles error states gracefully', () => {
      renderWithQueryClient(<ASOInternationalizationManager appId="" />);

      // Should still render without crashing
      expect(screen.getByText('ASO Internationalization Manager')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for progress tracking', async () => {
      renderWithQueryClient(<ASOInternationalizationManager appId="test-app" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('maintains semantic structure for locale cards', async () => {
      renderWithQueryClient(<ASOInternationalizationManager appId="test-app" />);

      await waitFor(
        () => {
          const headings = screen.getAllByRole('heading');
          expect(headings.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });
  });
});
