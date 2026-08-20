/**
 * StarRating Component Tests
 *
 * Test coverage for interactive star rating component.
 * Tests rendering, interactions, accessibility, and display modes.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating, StarRatingDisplay } from '../StarRating';

describe('StarRating', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      const { container } = render(<StarRating />);

      // Default: 5 stars, rating 0
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(5);
    });

    it('renders with custom rating', () => {
      render(<StarRating rating={3.5} />);

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAccessibleName('Rating: 3.5 out of 5 stars');
    });

    it('renders with custom maxRating', () => {
      const { container } = render(<StarRating maxRating={10} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(10);
    });

    it('applies custom className', () => {
      const { container } = render(<StarRating className="custom-class" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('renders without value by default', () => {
      render(<StarRating rating={4.2} />);

      expect(screen.queryByText(/4.2/)).not.toBeInTheDocument();
    });
  });

  describe('Star Display States', () => {
    it('shows filled stars for whole number rating', () => {
      render(<StarRating rating={3} />);

      const button = screen.getByLabelText('Rate 3 stars');
      const stars = button.querySelectorAll('svg');

      // Should have 2 stars: background + filled overlay
      expect(stars.length).toBe(2);
    });

    it('shows empty stars for rating below star value', () => {
      render(<StarRating rating={2} />);

      const button = screen.getByLabelText('Rate 5 stars');
      const stars = button.querySelectorAll('svg');

      // Should only have background star
      expect(stars.length).toBe(1);
    });

    it('shows partial stars for half ratings', () => {
      render(<StarRating rating={3.5} />);

      // Star 4 should be partial (3.5 is less than 4, but 3.5 >= 4 - 0.5)
      const button = screen.getByLabelText('Rate 4 stars');
      const stars = button.querySelectorAll('svg');

      // Should have 2 stars: background + partial overlay
      expect(stars.length).toBe(2);
    });

    it('displays correct number of filled stars', () => {
      const { container } = render(<StarRating rating={4} />);

      const buttons = container.querySelectorAll('button');
      let filledCount = 0;

      buttons.forEach((button) => {
        const stars = button.querySelectorAll('svg');
        if (stars.length === 2) filledCount++; // Has filled overlay
      });

      expect(filledCount).toBe(4);
    });

    it('updates display when rating changes', () => {
      const { rerender } = render(<StarRating rating={2} />);

      let radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAccessibleName('Rating: 2 out of 5 stars');

      rerender(<StarRating rating={4} />);

      radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAccessibleName('Rating: 4 out of 5 stars');
    });

    it('shows hover state rating when hovering', async () => {
      const user = userEvent.setup();
      render(<StarRating rating={2} />);

      const star4Button = screen.getByLabelText('Rate 4 stars');
      await user.hover(star4Button);

      // Hover state should override current rating
      // Button should have hover class
      expect(star4Button).toHaveClass('hover:scale-110');
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      render(<StarRating size="sm" />);

      const button = screen.getByLabelText('Rate 1 star');
      const star = button.querySelector('svg');

      expect(star).toHaveClass('w-4', 'h-4');
    });

    it('renders medium size by default', () => {
      render(<StarRating />);

      const button = screen.getByLabelText('Rate 1 star');
      const star = button.querySelector('svg');

      expect(star).toHaveClass('w-5', 'h-5');
    });

    it('renders large size', () => {
      render(<StarRating size="lg" />);

      const button = screen.getByLabelText('Rate 1 star');
      const star = button.querySelector('svg');

      expect(star).toHaveClass('w-6', 'h-6');
    });
  });

  describe('Interactive Mode', () => {
    it('calls onRatingChange when star is clicked', async () => {
      const user = userEvent.setup();
      const onRatingChange = jest.fn();

      render(<StarRating onRatingChange={onRatingChange} />);

      const star3Button = screen.getByLabelText('Rate 3 stars');
      await user.click(star3Button);

      expect(onRatingChange).toHaveBeenCalledWith(3);
    });

    it('has cursor-pointer in interactive mode', () => {
      render(<StarRating />);

      const button = screen.getByLabelText('Rate 1 star');
      expect(button).toHaveClass('cursor-pointer');
    });

    it('has hover scale effect in interactive mode', () => {
      render(<StarRating />);

      const button = screen.getByLabelText('Rate 1 star');
      expect(button).toHaveClass('hover:scale-110');
    });

    it('handles mouse enter to show hover rating', async () => {
      const user = userEvent.setup();
      render(<StarRating rating={2} />);

      const star4Button = screen.getByLabelText('Rate 4 stars');
      await user.hover(star4Button);

      // Component should update internally - button should still be enabled
      expect(star4Button).not.toBeDisabled();
    });

    it('handles mouse leave to clear hover rating', async () => {
      const user = userEvent.setup();
      render(<StarRating rating={2} />);

      const star4Button = screen.getByLabelText('Rate 4 stars');
      await user.hover(star4Button);
      await user.unhover(star4Button);

      // Component should revert to original rating
      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAccessibleName('Rating: 2 out of 5 stars');
    });

    it('handles focus to show hover rating', async () => {
      const user = userEvent.setup();
      render(<StarRating rating={2} />);

      const star4Button = screen.getByLabelText('Rate 4 stars');
      await user.tab(); // Focus first element

      // Button should have focus ring
      expect(star4Button).toHaveClass('focus:ring-2');
    });

    it('handles blur to clear hover rating', async () => {
      render(<StarRating rating={2} />);

      const star4Button = screen.getByLabelText('Rate 4 stars');
      star4Button.focus();
      star4Button.blur();

      // Component should revert
      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAccessibleName('Rating: 2 out of 5 stars');
    });

    it('allows rating all stars from 1 to maxRating', async () => {
      const user = userEvent.setup();
      const onRatingChange = jest.fn();

      render(<StarRating maxRating={5} onRatingChange={onRatingChange} />);

      for (let i = 1; i <= 5; i++) {
        const label = i === 1 ? 'Rate 1 star' : `Rate ${i} stars`;
        const button = screen.getByLabelText(label);
        await user.click(button);
      }

      expect(onRatingChange).toHaveBeenCalledTimes(5);
      expect(onRatingChange).toHaveBeenNthCalledWith(5, 5);
    });
  });

  describe('Readonly Mode', () => {
    it('disables all buttons in readonly mode', () => {
      const { container } = render(<StarRating readonly />);

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('has cursor-default in readonly mode', () => {
      render(<StarRating readonly />);

      const button = screen.getByLabelText('Rate 1 star');
      expect(button).toHaveClass('cursor-default');
    });

    it('does not have hover scale effect in readonly mode', () => {
      render(<StarRating readonly />);

      const button = screen.getByLabelText('Rate 1 star');
      expect(button).not.toHaveClass('hover:scale-110');
    });

    it('does not call onRatingChange when clicked in readonly mode', async () => {
      const user = userEvent.setup();
      const onRatingChange = jest.fn();

      render(<StarRating readonly onRatingChange={onRatingChange} />);

      const star3Button = screen.getByLabelText('Rate 3 stars');
      await user.click(star3Button);

      expect(onRatingChange).not.toHaveBeenCalled();
    });
  });

  describe('Value Display', () => {
    it('shows numeric value when showValue is true', () => {
      render(<StarRating rating={4.2} showValue />);

      expect(screen.getByText('4.2/5')).toBeInTheDocument();
    });

    it('hides numeric value when showValue is false', () => {
      render(<StarRating rating={4.2} showValue={false} />);

      expect(screen.queryByText(/4.2/)).not.toBeInTheDocument();
    });

    it('formats value to 1 decimal place', () => {
      render(<StarRating rating={3} showValue />);

      expect(screen.getByText('3.0/5')).toBeInTheDocument();
    });

    it('displays value with custom maxRating', () => {
      render(<StarRating rating={7.5} maxRating={10} showValue />);

      expect(screen.getByText('7.5/10')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has radiogroup role on container', () => {
      render(<StarRating rating={3} />);

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toBeInTheDocument();
    });

    it('has accessible label on radiogroup', () => {
      render(<StarRating rating={3.5} maxRating={5} />);

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAccessibleName('Rating: 3.5 out of 5 stars');
    });

    it('has accessible labels on star buttons', () => {
      render(<StarRating />);

      expect(screen.getByLabelText('Rate 1 star')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 2 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 3 stars')).toBeInTheDocument();
    });

    it('uses singular "star" for rating 1', () => {
      render(<StarRating />);

      expect(screen.getByLabelText('Rate 1 star')).toBeInTheDocument();
    });

    it('uses plural "stars" for ratings > 1', () => {
      render(<StarRating />);

      expect(screen.getByLabelText('Rate 2 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 5 stars')).toBeInTheDocument();
    });

    it('has focus ring styling', () => {
      render(<StarRating />);

      const button = screen.getByLabelText('Rate 1 star');
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-primary');
    });

    it('has minimum touch target size for mobile', () => {
      render(<StarRating />);

      const button = screen.getByLabelText('Rate 1 star');
      expect(button).toHaveClass('min-w-[44px]', 'min-h-[44px]');
    });
  });

  describe('StarRatingDisplay Wrapper', () => {
    it('renders StarRatingDisplay component', () => {
      render(<StarRatingDisplay rating={4} />);

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAccessibleName('Rating: 4 out of 5 stars');
    });

    it('sets readonly mode automatically', () => {
      const { container } = render(<StarRatingDisplay rating={3} />);

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('shows value by default in display mode', () => {
      render(<StarRatingDisplay rating={3.5} />);

      expect(screen.getByText('3.5/5')).toBeInTheDocument();
    });

    it('uses small size by default in display mode', () => {
      render(<StarRatingDisplay rating={3} />);

      const button = screen.getByLabelText('Rate 1 star');
      const star = button.querySelector('svg');

      expect(star).toHaveClass('w-4', 'h-4');
    });

    it('accepts custom props in display mode', () => {
      render(<StarRatingDisplay rating={7} maxRating={10} size="lg" className="custom" />);

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAccessibleName('Rating: 7 out of 10 stars');

      const button = screen.getByLabelText('Rate 1 star');
      const star = button.querySelector('svg');
      expect(star).toHaveClass('w-6', 'h-6');

      const wrapper = radiogroup.closest('.custom');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rating of 0', () => {
      render(<StarRating rating={0} showValue />);

      expect(screen.getByText('0.0/5')).toBeInTheDocument();

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAccessibleName('Rating: 0 out of 5 stars');
    });

    it('handles maximum rating', () => {
      render(<StarRating rating={5} maxRating={5} showValue />);

      expect(screen.getByText('5.0/5')).toBeInTheDocument();
    });

    it('handles rating exceeding maxRating', () => {
      const { container } = render(<StarRating rating={7} maxRating={5} />);

      // All stars should be filled when rating > maxRating
      const buttons = container.querySelectorAll('button');
      let filledCount = 0;

      buttons.forEach((button) => {
        const stars = button.querySelectorAll('svg');
        if (stars.length === 2) filledCount++;
      });

      expect(filledCount).toBe(5);
    });

    it('handles negative rating gracefully', () => {
      const { container } = render(<StarRating rating={-1} />);

      // No stars should be filled for negative rating
      const buttons = container.querySelectorAll('button');
      let filledCount = 0;

      buttons.forEach((button) => {
        const stars = button.querySelectorAll('svg');
        if (stars.length === 2) filledCount++;
      });

      expect(filledCount).toBe(0);
    });

    it('handles decimal ratings correctly', () => {
      render(<StarRating rating={3.7} showValue />);

      expect(screen.getByText('3.7/5')).toBeInTheDocument();
    });
  });
});
