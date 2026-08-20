import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { LiveRegion, useLiveRegion, LoadingLiveRegion, FormLiveRegion, RealTimeUpdateLiveRegion } from '../live-region';

describe('LiveRegion', () => {
  it('renders message with correct ARIA attributes', () => {
    const { container } = render(<LiveRegion message="Test message" />);

    const region = container.firstChild as HTMLElement;
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveTextContent('Test message');
  });

  it('hides visually by default (screen reader only)', () => {
    const { container } = render(<LiveRegion message="Test message" />);

    const region = container.firstChild as HTMLElement;
    expect(region).toHaveClass('sr-only');
  });

  it('shows visually when visible prop is true', () => {
    const { container } = render(<LiveRegion message="Test message" visible={true} />);

    const region = container.firstChild as HTMLElement;
    expect(region).not.toHaveClass('sr-only');
  });

  it('supports assertive politeness level', () => {
    const { container } = render(<LiveRegion message="Urgent message" politeness="assertive" />);

    const region = container.firstChild as HTMLElement;
    expect(region).toHaveAttribute('aria-live', 'assertive');
  });

  it('clears message after specified delay', async () => {
    jest.useFakeTimers();

    const { container } = render(<LiveRegion message="Temporary message" clearAfter={1000} />);

    const region = container.firstChild as HTMLElement;
    expect(region).toHaveTextContent('Temporary message');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(region).toHaveTextContent('');
    });

    jest.useRealTimers();
  });

  it('does not render when message is empty', () => {
    const { container } = render(<LiveRegion message="" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('useLiveRegion hook', () => {
  function TestComponent() {
    const { message, politeness, announce } = useLiveRegion();

    return (
      <div>
        <button onClick={() => announce('Polite message')}>Announce Polite</button>
        <button onClick={() => announce('Urgent message', 'assertive')}>Announce Assertive</button>
        <LiveRegion message={message} politeness={politeness} visible={true} />
      </div>
    );
  }

  it('announces messages with correct politeness level', () => {
    render(<TestComponent />);

    const politeButton = screen.getByText('Announce Polite');
    const assertiveButton = screen.getByText('Announce Assertive');

    act(() => {
      politeButton.click();
    });
    expect(screen.getByText('Polite message')).toBeInTheDocument();

    act(() => {
      assertiveButton.click();
    });
    expect(screen.getByText('Urgent message')).toBeInTheDocument();
  });
});

describe('LoadingLiveRegion', () => {
  it('announces loading state', () => {
    const { rerender } = render(<LoadingLiveRegion isLoading={false} />);

    rerender(<LoadingLiveRegion isLoading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('announces custom loading message', () => {
    const { rerender } = render(<LoadingLiveRegion isLoading={false} loadingMessage="Please wait" />);

    rerender(<LoadingLiveRegion isLoading={true} loadingMessage="Please wait" />);
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  it('announces success message when loading completes', () => {
    const { rerender } = render(<LoadingLiveRegion isLoading={true} successMessage="Data loaded successfully" />);

    rerender(<LoadingLiveRegion isLoading={false} successMessage="Data loaded successfully" />);
    expect(screen.getByText('Data loaded successfully')).toBeInTheDocument();
  });

  it('announces error message with assertive politeness', () => {
    const { rerender, container } = render(<LoadingLiveRegion isLoading={true} errorMessage="Failed to load data" />);

    rerender(<LoadingLiveRegion isLoading={false} errorMessage="Failed to load data" />);

    const region = container.querySelector('[role="status"]');
    expect(region).toHaveAttribute('aria-live', 'assertive');
    expect(region).toHaveTextContent('Failed to load data');
  });
});

describe('FormLiveRegion', () => {
  it('announces validation errors', () => {
    const errors = ['Email is required', 'Password must be at least 8 characters'];
    render(<FormLiveRegion errors={errors} />);

    expect(screen.getByText(/2 errors found:/)).toBeInTheDocument();
    expect(screen.getByText(/Email is required/)).toBeInTheDocument();
  });

  it('announces success message', () => {
    render(<FormLiveRegion successMessage="Form submitted successfully" />);
    expect(screen.getByText('Form submitted successfully')).toBeInTheDocument();
  });

  it('uses assertive politeness for errors', () => {
    const { container } = render(<FormLiveRegion errors={['Error 1']} />);

    const region = container.querySelector('[role="status"]');
    expect(region).toHaveAttribute('aria-live', 'assertive');
  });
});

describe('RealTimeUpdateLiveRegion', () => {
  it('announces new items when count increases', () => {
    const { rerender } = render(<RealTimeUpdateLiveRegion count={5} />);

    rerender(<RealTimeUpdateLiveRegion count={7} />);
    expect(screen.getByText('2 new items')).toBeInTheDocument();
  });

  it('uses custom item type', () => {
    const { rerender } = render(<RealTimeUpdateLiveRegion count={3} itemType="message" />);

    rerender(<RealTimeUpdateLiveRegion count={4} itemType="message" />);
    expect(screen.getByText('1 new message')).toBeInTheDocument();
  });

  it('does not announce when count decreases', () => {
    const { rerender, container } = render(<RealTimeUpdateLiveRegion count={5} />);

    rerender(<RealTimeUpdateLiveRegion count={3} />);

    // Should not have any announcement
    const region = container.querySelector('[role="status"]');
    expect(region).toBeNull();
  });
});
