/**
 * VpnEffectivenessTestScreen Tests
 * Phase 3.2: VPN Screen Tests
 */

import React from 'react';
import { renderWithProviders } from '../../utils/test-helpers';
import { VpnEffectivenessTestScreen } from '../../../screens/vpn/VpnEffectivenessTestScreen';
import { fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
};

describe('VpnEffectivenessTestScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State (Idle)', () => {
    it('should render the screen with header', () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('VPN Effectiveness Test')).toBeTruthy();
    });

    it('should display Test Your VPN title', () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Test Your VPN')).toBeTruthy();
    });

    it('should display test description', () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText(/Run a comprehensive test/)).toBeTruthy();
    });

    it('should display Start Test button', () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByText('Start Test')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is pressed', () => {
      const { getByLabelText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const backButton = getByLabelText('Back');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Running Tests', () => {
    it('should show running state when Start Test is pressed', async () => {
      const { getByText, queryByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const startButton = getByText('Start Test');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(getByText('Testing in Progress')).toBeTruthy();
      });

      // Idle state should be gone
      expect(queryByText('Test Your VPN')).toBeNull();
    });

    it('should display progress bar during test', async () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const startButton = getByText('Start Test');
      fireEvent.press(startButton);

      await waitFor(() => {
        expect(getByText(/Complete$/)).toBeTruthy();
      });
    });

    it('should show current test name during testing', async () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const startButton = getByText('Start Test');
      fireEvent.press(startButton);

      // Should show one of the test names
      await waitFor(() => {
        const testNames = ['IP Leak Test', 'DNS Leak Test', 'WebRTC Test', 'Kill Switch Test', 'Encryption Test', 'Speed Test'];
        const foundTestName = testNames.some(name => {
          try {
            getByText(name);
            return true;
          } catch {
            return false;
          }
        });
        expect(foundTestName).toBe(true);
      });
    });
  });

  describe('Test Completion', () => {
    it('should show complete state with score after tests finish', async () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const startButton = getByText('Start Test');
      fireEvent.press(startButton);

      // Fast-forward through all tests
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(getByText('Test Complete')).toBeTruthy();
      }, { timeout: 15000 });
    });

    it('should display Run Again button after completion', async () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const startButton = getByText('Start Test');
      fireEvent.press(startButton);

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(getByText('Run Again')).toBeTruthy();
      }, { timeout: 15000 });
    });

    it('should show Security Tests section with results', async () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const startButton = getByText('Start Test');
      fireEvent.press(startButton);

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(getByText('Security Tests')).toBeTruthy();
      }, { timeout: 15000 });
    });

    it('should display individual test results', async () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const startButton = getByText('Start Test');
      fireEvent.press(startButton);

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        // Should show test names in results
        expect(getByText('IP Leak Test')).toBeTruthy();
        expect(getByText('DNS Leak Test')).toBeTruthy();
      }, { timeout: 15000 });
    });
  });

  describe('Score Display', () => {
    it('should show score label based on score value', async () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      const startButton = getByText('Start Test');
      fireEvent.press(startButton);

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        // Should show one of the score labels
        const scoreLabels = ['Excellent', 'Good', 'Fair', 'Poor'];
        const foundLabel = scoreLabels.some(label => {
          try {
            getByText(label);
            return true;
          } catch {
            return false;
          }
        });
        expect(foundLabel).toBe(true);
      }, { timeout: 15000 });
    });
  });

  describe('Re-running Tests', () => {
    it('should allow running tests again after completion', async () => {
      const { getByText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      // First run
      const startButton = getByText('Start Test');
      fireEvent.press(startButton);

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      await waitFor(() => {
        expect(getByText('Run Again')).toBeTruthy();
      }, { timeout: 15000 });

      // Second run
      const runAgainButton = getByText('Run Again');
      fireEvent.press(runAgainButton);

      await waitFor(() => {
        expect(getByText('Testing in Progress')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible back button', () => {
      const { getByLabelText } = renderWithProviders(
        <VpnEffectivenessTestScreen navigation={mockNavigation as any} route={{} as any} />
      );

      expect(getByLabelText('Back')).toBeTruthy();
    });
  });
});
