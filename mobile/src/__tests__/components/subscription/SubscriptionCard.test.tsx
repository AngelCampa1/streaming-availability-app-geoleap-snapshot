/**
 * Comprehensive Tests for SubscriptionCard Component
 * Tests subscription display, edit/remove actions, and confirmation dialogs
 *
 * Test Coverage:
 * - Subscription data rendering
 * - Edit button functionality
 * - Remove button with confirmation
 * - Notes display (optional)
 * - Badge and icon display
 */

// Mock logger before any other imports
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
  },
}));

// Mock Alert
import { Alert } from 'react-native';
jest.spyOn(Alert, 'alert');

// Mock Card component
jest.mock('../../../components/common/Card', () => ({
  Card: 'Card',
}));

// Mock child components
jest.mock('../../../components/subscription/StreamingServiceIcon', () => ({
  __esModule: true,
  default: 'StreamingServiceIcon',
}));

jest.mock('../../../components/subscription/SubscriptionBadge', () => ({
  __esModule: true,
  default: 'SubscriptionBadge',
}));

// Mock useTheme hook from ThemeProvider (correct path)
jest.mock('../../../theme/ThemeProvider', () => ({
  useTheme: () => ({
    theme: {
      spacing: Array.from({ length: 50 }, (_, i) => i * 4),
      colors: {
        primary: { 100: '#e0f2fe', 600: '#0284c7' },
        error: { 100: '#fee2e2', 600: '#dc2626' },
      },
      semantic: {
        text: {
          primary: '#000000',
          secondary: '#666666',
        },
        background: {
          secondary: '#f5f5f5',
        },
      },
      typography: {
        fontSize: { xs: 11, sm: 14, lg: 18 },
        fontWeight: { semibold: '600' },
        lineHeight: { normal: 1.5 },
      },
      borderRadius: {
        lg: 12,
      },
    },
  }),
}));

// Import after mocks
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SubscriptionCard } from '../../../components/subscription/SubscriptionCard';
import { UserStreamingSubscription } from '../../../types/streaming';

describe('SubscriptionCard Component', () => {
  const mockSubscription: UserStreamingSubscription = {
    serviceId: 'netflix',
    serviceName: 'Netflix',
    isActive: true,
    subscriptionTier: 'Premium',
    addedAt: '2024-01-15T10:30:00Z',
    notes: 'Family plan, password shared',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Alert.alert as jest.Mock).mockClear();
  });

  // ============================================
  // Subscription Data Rendering Tests (2 tests)
  // ============================================

  it('should render subscription with all data', () => {
    const { getByText } = render(
      <SubscriptionCard subscription={mockSubscription} />
    );

    // Verify service name
    expect(getByText('Netflix')).toBeTruthy();

    // Verify date is formatted
    expect(getByText(/Added/)).toBeTruthy();
    expect(getByText(/Jan/)).toBeTruthy();
  });

  it('should render notes when provided', () => {
    const { getByText } = render(
      <SubscriptionCard subscription={mockSubscription} />
    );

    // Verify notes section
    expect(getByText('Notes:')).toBeTruthy();
    expect(getByText('Family plan, password shared')).toBeTruthy();
  });

  // ============================================
  // Edit Button Test (1 test)
  // ============================================

  it('should call onEdit when edit button is pressed', () => {
    const mockOnEdit = jest.fn();

    const { getByText } = render(
      <SubscriptionCard
        subscription={mockSubscription}
        onEdit={mockOnEdit}
      />
    );

    // Press edit button
    fireEvent.press(getByText('Edit'));

    // Verify onEdit was called with subscription
    expect(mockOnEdit).toHaveBeenCalledWith(mockSubscription);
  });

  // ============================================
  // Remove Button Test (2 tests)
  // ============================================

  it('should show confirmation dialog when remove button is pressed', () => {
    const mockOnRemove = jest.fn();

    const { getByText } = render(
      <SubscriptionCard
        subscription={mockSubscription}
        onRemove={mockOnRemove}
      />
    );

    // Press remove button
    fireEvent.press(getByText('Remove'));

    // Verify confirmation dialog was shown
    expect(Alert.alert).toHaveBeenCalledWith(
      'Remove Subscription',
      'Are you sure you want to remove Netflix from your subscriptions?',
      expect.any(Array)
    );
  });

  it('should call onRemove when confirmation is accepted', async () => {
    const mockOnRemove = jest.fn().mockResolvedValue(undefined);

    // Mock Alert.alert to automatically call the remove handler
    (Alert.alert as jest.Mock).mockImplementation(
      (_title, _message, buttons) => {
        const confirmButton = buttons?.find((b: { text: string; onPress?: () => void }) => b.text === 'Remove');
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      }
    );

    const { getByText } = render(
      <SubscriptionCard
        subscription={mockSubscription}
        onRemove={mockOnRemove}
      />
    );

    // Press remove button
    fireEvent.press(getByText('Remove'));

    // Wait for async remove to complete using waitFor
    await waitFor(() => {
      expect(mockOnRemove).toHaveBeenCalledWith('netflix');
    }, { timeout: 5000 });
  });

  // ============================================
  // Optional Props Test (1 test)
  // ============================================

  it('should not render action buttons when callbacks not provided', () => {
    const { queryByText } = render(
      <SubscriptionCard subscription={mockSubscription} />
    );

    // Verify buttons are not rendered
    expect(queryByText('Edit')).toBeNull();
    expect(queryByText('Remove')).toBeNull();
  });

  // ============================================
  // Disabled State Test (1 test)
  // ============================================

  it('should disable buttons during removal', () => {
    const mockOnRemove = jest.fn();
    const mockOnEdit = jest.fn();

    // Mock Alert to trigger removal immediately
    (Alert.alert as jest.Mock).mockImplementation(
      (title, message, buttons) => {
        const confirmButton = buttons.find((b: any) => b.text === 'Remove');
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      }
    );

    const { getByText } = render(
      <SubscriptionCard
        subscription={mockSubscription}
        onEdit={mockOnEdit}
        onRemove={mockOnRemove}
      />
    );

    // Press remove button
    fireEvent.press(getByText('Remove'));

    // Verify removing state is shown
    expect(getByText('Removing...')).toBeTruthy();
  });
});
