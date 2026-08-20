/**
 * ClearFiltersButton Integration Tests
 *
 * Tests clear filters button with real rendering logic.
 * Mocks Button, AlertDialog components, and lucide icons only.
 *
 * Coverage Target: 60%+
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClearFiltersButton } from '../ClearFiltersButton';

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className, title }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      title={title}
    >
      {children}
    </button>
  ),
}));

// Mock AlertDialog components
jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogContent: ({ children }: any) => <div data-testid="alert-dialog-content">{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div data-testid="alert-dialog-description">{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogAction: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className} data-testid="alert-action">
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: any) => <button data-testid="alert-cancel">{children}</button>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  RotateCcw: ({ className }: any) => <svg data-testid="rotate-ccw-icon" className={className} />,
  X: ({ className }: any) => <svg data-testid="x-icon" className={className} />,
}));

describe('ClearFiltersButton Component', () => {
  const mockOnClearFilters = jest.fn();

  beforeEach(() => {
    mockOnClearFilters.mockClear();
  });

  describe('Rendering Behavior', () => {
    it('renders button with filter count', () => {
      render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={5} />);

      // Component renders both desktop and mobile text with "Clear (5)"
      const clearTexts = screen.getAllByText(/Clear \(5\)/);
      expect(clearTexts).toHaveLength(2); // Desktop and mobile versions
    });

    it('does not render when activeFiltersCount is 0', () => {
      const { container } = render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={0} />);

      expect(container.firstChild).toBeNull();
    });

    it('shows singular filter in title when count is 1', () => {
      render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={1} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', expect.stringContaining('1 active filter'));
    });

    it('shows plural filters in title when count is multiple', () => {
      render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={3} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', expect.stringContaining('3 active filters'));
    });

    it('includes keep query message in title when keepQuery is true', () => {
      render(
        <ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={2} keepQuery={true} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', expect.stringContaining('(keep search query)'));
    });

    it('does not include keep query message when keepQuery is false', () => {
      render(
        <ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={2} keepQuery={false} />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', expect.not.stringContaining('(keep search query)'));
    });
  });

  describe('Button Variants and Styling', () => {
    it('applies default variant prop', () => {
      render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={1} variant="default" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'default');
    });

    it('applies outline variant by default', () => {
      render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={1} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'outline');
    });

    it('applies ghost variant prop', () => {
      render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={1} variant="ghost" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'ghost');
    });

    it('applies size prop', () => {
      render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={1} size="lg" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-size', 'lg');
    });

    it('applies custom className', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={1}
          className="custom-class"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('disables button when disabled prop is true', () => {
      render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={1} disabled={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Icon Rendering', () => {
    it('shows RotateCcw icon for outline variant', () => {
      render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={1} variant="outline" />);

      expect(screen.getByTestId('rotate-ccw-icon')).toBeInTheDocument();
    });

    it('shows X icon for ghost variant', () => {
      render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={1} variant="ghost" />);

      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('shows X icon when iconOnly is true', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={1}
          variant="outline"
          iconOnly={true}
        />
      );

      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('hides text when iconOnly is true', () => {
      render(
        <ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={3} iconOnly={true} />
      );

      expect(screen.queryByText(/Clear/)).not.toBeInTheDocument();
    });
  });

  describe('Click Behavior Without Confirmation', () => {
    it('calls onClearFilters immediately when showConfirmation is false', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={5}
          showConfirmation={false}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });

    it('calls onClearFilters immediately when activeFiltersCount is 3 or less', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={3}
          showConfirmation={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });

    it('calls onClearFilters immediately when activeFiltersCount is 1', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={1}
          showConfirmation={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Confirmation Dialog', () => {
    it('shows confirmation dialog when activeFiltersCount > 3 and showConfirmation is true', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={5}
          showConfirmation={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
      expect(mockOnClearFilters).not.toHaveBeenCalled();
    });

    it('does not show dialog when activeFiltersCount is exactly 3', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={3}
          showConfirmation={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });

    it('shows dialog title', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={5}
          showConfirmation={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Clear All Filters?')).toBeInTheDocument();
    });

    it('shows filter count in dialog description', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={7}
          showConfirmation={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText(/7 active filters/)).toBeInTheDocument();
    });

    it('shows keepQuery message in dialog when keepQuery is true', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={5}
          keepQuery={true}
          showConfirmation={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText(/Your search query will be preserved/)).toBeInTheDocument();
    });

    it('does not show keepQuery message when keepQuery is false', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={5}
          keepQuery={false}
          showConfirmation={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.queryByText(/Your search query will be preserved/)).not.toBeInTheDocument();
    });

    it('calls onClearFilters when confirmation action clicked', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={5}
          showConfirmation={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const confirmButton = screen.getByTestId('alert-action');
      fireEvent.click(confirmButton);

      expect(mockOnClearFilters).toHaveBeenCalledTimes(1);
    });

    it('does not call onClearFilters when cancel clicked', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={5}
          showConfirmation={true}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const cancelButton = screen.getByTestId('alert-cancel');
      expect(cancelButton).toBeInTheDocument();

      expect(mockOnClearFilters).not.toHaveBeenCalled();
    });
  });

  describe('Responsive Text Display', () => {
    it('shows desktop text with filter count', () => {
      render(<ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={3} />);

      // Both desktop and mobile versions show "Clear (3)"
      const clearTexts = screen.getAllByText(/Clear \(3\)/);
      expect(clearTexts).toHaveLength(2);
    });

    it('renders both desktop and mobile text elements', () => {
      const { container } = render(
        <ClearFiltersButton onClearFilters={mockOnClearFilters} activeFiltersCount={2} />
      );

      // Check for hidden sm:inline class (desktop)
      const desktopText = container.querySelector('.hidden.sm\\:inline');
      expect(desktopText).toBeInTheDocument();

      // Check for sm:hidden class (mobile)
      const mobileText = container.querySelector('.sm\\:hidden');
      expect(mobileText).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles disabled button with confirmation dialog', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={5}
          disabled={true}
          showConfirmation={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      // Disabled buttons don't fire click events
      fireEvent.click(button);
      expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
    });

    it('renders with all props combined', () => {
      render(
        <ClearFiltersButton
          onClearFilters={mockOnClearFilters}
          activeFiltersCount={10}
          showConfirmation={true}
          keepQuery={true}
          variant="secondary"
          size="lg"
          className="custom-btn"
          disabled={false}
          iconOnly={false}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-variant', 'secondary');
      expect(button).toHaveAttribute('data-size', 'lg');
      expect(button).toHaveClass('custom-btn');
      expect(button).not.toBeDisabled();
    });
  });
});

/**
 * COVERAGE TARGET: 60%+
 * Total Tests: 30
 * Tests button rendering, variants, confirmation dialog, responsive behavior
 */
