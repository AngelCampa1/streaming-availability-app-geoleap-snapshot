import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubscriptionFilterToggle } from '../SubscriptionFilterToggle';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import type { UserStreamingSubscription } from '@/types/streaming';

// Mock the useSubscriptions hook (component uses this, not useUserSubscriptions)
jest.mock('@/hooks/useSubscriptions');

const mockUseSubscriptions = useSubscriptions as jest.MockedFunction<typeof useSubscriptions>;

// Helper to create mock subscriptions with required properties
const createMockSubscription = (serviceId: string): UserStreamingSubscription => ({
  id: `sub-${serviceId}`,
  userId: 'test-user',
  serviceId,
  serviceName: serviceId.charAt(0).toUpperCase() + serviceId.slice(1),
  isActive: true,
  addedAt: new Date().toISOString(),
});

describe('SubscriptionFilterToggle', () => {
  const defaultMockReturn = {
    subscriptions: [] as UserStreamingSubscription[],
    loading: false,
    error: null,
    addSubscription: jest.fn(),
    removeSubscription: jest.fn(),
    updateSubscription: jest.fn(),
    hasSubscription: jest.fn(),
    getServiceIds: jest.fn().mockReturnValue([]),
    refetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSubscriptions.mockReturnValue(defaultMockReturn);
  });

  it('does not render when user has no subscriptions', () => {
    mockUseSubscriptions.mockReturnValue({
      ...defaultMockReturn,
      subscriptions: [],
    });

    const { container } = render(
      <SubscriptionFilterToggle onlyUserServices={false} onToggle={jest.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('does not render when loading', () => {
    mockUseSubscriptions.mockReturnValue({
      ...defaultMockReturn,
      loading: true,
      subscriptions: [createMockSubscription('netflix'), createMockSubscription('hulu'), createMockSubscription('disney')],
    });

    const { container } = render(
      <SubscriptionFilterToggle onlyUserServices={false} onToggle={jest.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders when user has subscriptions', () => {
    mockUseSubscriptions.mockReturnValue({
      ...defaultMockReturn,
      subscriptions: [createMockSubscription('netflix'), createMockSubscription('hulu'), createMockSubscription('disney')],
    });

    render(
      <SubscriptionFilterToggle onlyUserServices={false} onToggle={jest.fn()} />
    );

    expect(screen.getByTestId('subscription-filter-toggle')).toBeInTheDocument();
    expect(screen.getByText('My Services Only')).toBeInTheDocument();
    expect(screen.getByText('(3 services)')).toBeInTheDocument();
  });

  it('displays singular "service" for 1 subscription', () => {
    mockUseSubscriptions.mockReturnValue({
      ...defaultMockReturn,
      subscriptions: [createMockSubscription('netflix')],
    });

    render(
      <SubscriptionFilterToggle onlyUserServices={false} onToggle={jest.fn()} />
    );

    expect(screen.getByText('(1 service)')).toBeInTheDocument();
  });

  it('calls onToggle with true when toggled on', () => {
    mockUseSubscriptions.mockReturnValue({
      ...defaultMockReturn,
      subscriptions: [createMockSubscription('netflix'), createMockSubscription('hulu')],
    });

    const onToggle = jest.fn();
    render(
      <SubscriptionFilterToggle onlyUserServices={false} onToggle={onToggle} />
    );

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('calls onToggle with false when toggled off', () => {
    mockUseSubscriptions.mockReturnValue({
      ...defaultMockReturn,
      subscriptions: [createMockSubscription('netflix'), createMockSubscription('hulu')],
    });

    const onToggle = jest.fn();
    render(
      <SubscriptionFilterToggle onlyUserServices={true} onToggle={onToggle} />
    );

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('switch is checked when onlyUserServices is true', () => {
    mockUseSubscriptions.mockReturnValue({
      ...defaultMockReturn,
      subscriptions: [createMockSubscription('netflix'), createMockSubscription('hulu')],
    });

    render(
      <SubscriptionFilterToggle onlyUserServices={true} onToggle={jest.fn()} />
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('switch is unchecked when onlyUserServices is false', () => {
    mockUseSubscriptions.mockReturnValue({
      ...defaultMockReturn,
      subscriptions: [createMockSubscription('netflix'), createMockSubscription('hulu')],
    });

    render(
      <SubscriptionFilterToggle onlyUserServices={false} onToggle={jest.fn()} />
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('applies custom className', () => {
    mockUseSubscriptions.mockReturnValue({
      ...defaultMockReturn,
      subscriptions: [createMockSubscription('netflix'), createMockSubscription('hulu')],
    });

    render(
      <SubscriptionFilterToggle
        onlyUserServices={false}
        onToggle={jest.fn()}
        className="custom-class"
      />
    );

    const toggle = screen.getByTestId('subscription-filter-toggle');
    expect(toggle).toHaveClass('custom-class');
  });
});
