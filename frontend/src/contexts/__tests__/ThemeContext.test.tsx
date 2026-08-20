import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.documentElement.classList.remove('light');
    const existingMeta = document.querySelector('meta[name="theme-color"]');
    if (existingMeta) {
      existingMeta.remove();
    }
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function TestConsumer() {
    const { theme } = useTheme();
    return <span data-testid="current-theme">{theme}</span>;
  }

  describe('ThemeProvider', () => {
    it('renders children correctly', async () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Child Content</div>
        </ThemeProvider>
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('provides light theme', async () => {
      render(
        <ThemeProvider>
          <TestConsumer />
        </ThemeProvider>
      );

      await act(async () => {
        jest.runAllTimers();
      });

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    });
  });

  describe('useTheme hook', () => {
    it('returns stable light theme value', () => {
      function Consumer() {
        const ctx = useTheme();
        return (
          <div>
            <span data-testid="theme">{ctx.theme}</span>
          </div>
        );
      }

      render(
        <ThemeProvider>
          <Consumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });

    it('returns light theme when used outside ThemeProvider (safe default)', () => {
      function Consumer() {
        const ctx = useTheme();
        return <span data-testid="theme">{ctx.theme}</span>;
      }

      render(<Consumer />);

      expect(screen.getByTestId('theme')).toHaveTextContent('light');
    });
  });
});
