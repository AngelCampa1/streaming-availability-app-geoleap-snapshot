import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkipLinks from '../SkipLinks';

// Mock the useSkipLinks hook
const mockSkipToMain = jest.fn();
const mockSkipToNavigation = jest.fn();

jest.mock('@/hooks/useKeyboardNavigation', () => ({
  useSkipLinks: () => ({
    skipToMain: mockSkipToMain,
    skipToNavigation: mockSkipToNavigation,
  }),
}));

describe('SkipLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering & Basic Functionality', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<SkipLinks />);
      }).not.toThrow();
    });

    it('renders skip to main content button', () => {
      render(<SkipLinks />);

      const skipToMainButton = screen.getByText('Skip to main content');
      expect(skipToMainButton).toBeInTheDocument();
    });

    it('renders skip to navigation button', () => {
      render(<SkipLinks />);

      const skipToNavButton = screen.getByText('Skip to navigation');
      expect(skipToNavButton).toBeInTheDocument();
    });

    it('renders both skip links', () => {
      render(<SkipLinks />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('renders container with correct positioning', () => {
      const { container } = render(<SkipLinks />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('fixed');
      expect(wrapper).toHaveClass('top-0');
      expect(wrapper).toHaveClass('left-0');
    });

    it('renders container with high z-index', () => {
      const { container } = render(<SkipLinks />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('z-[100]');
    });
  });

  describe('Accessibility Classes', () => {
    it('skip to main button has sr-only class', () => {
      render(<SkipLinks />);

      const button = screen.getByText('Skip to main content');
      expect(button).toHaveClass('sr-only');
    });

    it('skip to navigation button has sr-only class', () => {
      render(<SkipLinks />);

      const button = screen.getByText('Skip to navigation');
      expect(button).toHaveClass('sr-only');
    });

    it('buttons become visible on focus with focus:not-sr-only', () => {
      render(<SkipLinks />);

      const mainButton = screen.getByText('Skip to main content');
      expect(mainButton).toHaveClass('focus:not-sr-only');
    });

    it('skip to main button has correct positioning classes', () => {
      render(<SkipLinks />);

      const button = screen.getByText('Skip to main content');
      expect(button).toHaveClass('focus:absolute');
      expect(button).toHaveClass('focus:top-2');
      expect(button).toHaveClass('focus:left-2');
    });

    it('skip to navigation button has correct positioning classes', () => {
      render(<SkipLinks />);

      const button = screen.getByText('Skip to navigation');
      expect(button).toHaveClass('focus:absolute');
      expect(button).toHaveClass('focus:top-2');
      expect(button).toHaveClass('focus:left-48');
    });

    it('buttons have primary styling', () => {
      render(<SkipLinks />);

      const mainButton = screen.getByText('Skip to main content');
      expect(mainButton).toHaveClass('bg-primary');
      expect(mainButton).toHaveClass('text-primary-foreground');
    });

    it('buttons have rounded corners', () => {
      render(<SkipLinks />);

      const mainButton = screen.getByText('Skip to main content');
      expect(mainButton).toHaveClass('rounded-full');
    });

    it('buttons have padding', () => {
      render(<SkipLinks />);

      const mainButton = screen.getByText('Skip to main content');
      expect(mainButton).toHaveClass('px-4');
      expect(mainButton).toHaveClass('py-2');
    });

    it('buttons have medium font weight', () => {
      render(<SkipLinks />);

      const mainButton = screen.getByText('Skip to main content');
      expect(mainButton).toHaveClass('font-medium');
    });

    it('buttons have shadow on focus', () => {
      render(<SkipLinks />);

      const mainButton = screen.getByText('Skip to main content');
      expect(mainButton).toHaveClass('shadow-lg');
    });

    it('buttons have focus ring styling', () => {
      render(<SkipLinks />);

      const mainButton = screen.getByText('Skip to main content');
      expect(mainButton).toHaveClass('focus:ring-2');
      expect(mainButton).toHaveClass('focus:ring-ring');
      expect(mainButton).toHaveClass('focus:ring-offset-2');
    });

    it('buttons have no outline on focus', () => {
      render(<SkipLinks />);

      const mainButton = screen.getByText('Skip to main content');
      expect(mainButton).toHaveClass('focus:outline-none');
    });
  });

  describe('Button Functionality', () => {
    it('calls skipToMain when skip to main content button is clicked', async () => {
      const user = userEvent.setup();
      render(<SkipLinks />);

      const button = screen.getByText('Skip to main content');
      await user.click(button);

      expect(mockSkipToMain).toHaveBeenCalledTimes(1);
    });

    it('calls skipToNavigation when skip to navigation button is clicked', async () => {
      const user = userEvent.setup();
      render(<SkipLinks />);

      const button = screen.getByText('Skip to navigation');
      await user.click(button);

      expect(mockSkipToNavigation).toHaveBeenCalledTimes(1);
    });

    it('does not call handlers on render', () => {
      render(<SkipLinks />);

      expect(mockSkipToMain).not.toHaveBeenCalled();
      expect(mockSkipToNavigation).not.toHaveBeenCalled();
    });

    it('skip to main can be called multiple times', async () => {
      const user = userEvent.setup();
      render(<SkipLinks />);

      const button = screen.getByText('Skip to main content');
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockSkipToMain).toHaveBeenCalledTimes(3);
    });

    it('both buttons can be clicked independently', async () => {
      const user = userEvent.setup();
      render(<SkipLinks />);

      const mainButton = screen.getByText('Skip to main content');
      const navButton = screen.getByText('Skip to navigation');

      await user.click(mainButton);
      expect(mockSkipToMain).toHaveBeenCalledTimes(1);
      expect(mockSkipToNavigation).not.toHaveBeenCalled();

      await user.click(navButton);
      expect(mockSkipToMain).toHaveBeenCalledTimes(1);
      expect(mockSkipToNavigation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Navigation', () => {
    it('skip to main button is focusable', () => {
      render(<SkipLinks />);

      const button = screen.getByText('Skip to main content');
      button.focus();

      expect(document.activeElement).toBe(button);
    });

    it('skip to navigation button is focusable', () => {
      render(<SkipLinks />);

      const button = screen.getByText('Skip to navigation');
      button.focus();

      expect(document.activeElement).toBe(button);
    });

    it('can tab between buttons', () => {
      render(<SkipLinks />);

      const mainButton = screen.getByText('Skip to main content');
      const navButton = screen.getByText('Skip to navigation');

      mainButton.focus();
      expect(document.activeElement).toBe(mainButton);

      navButton.focus();
      expect(document.activeElement).toBe(navButton);
    });

    it('activates skip to main with Enter key', async () => {
      const user = userEvent.setup();
      render(<SkipLinks />);

      const button = screen.getByText('Skip to main content');
      button.focus();
      await user.keyboard('{Enter}');

      expect(mockSkipToMain).toHaveBeenCalledTimes(1);
    });

    it('activates skip to navigation with Enter key', async () => {
      const user = userEvent.setup();
      render(<SkipLinks />);

      const button = screen.getByText('Skip to navigation');
      button.focus();
      await user.keyboard('{Enter}');

      expect(mockSkipToNavigation).toHaveBeenCalledTimes(1);
    });

    it('activates skip to main with Space key', async () => {
      const user = userEvent.setup();
      render(<SkipLinks />);

      const button = screen.getByText('Skip to main content');
      button.focus();
      await user.keyboard(' ');

      expect(mockSkipToMain).toHaveBeenCalledTimes(1);
    });
  });

  describe('Container Layout', () => {
    it('has spacing between buttons', () => {
      const { container } = render(<SkipLinks />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('space-x-2');
    });

    it('has padding around container', () => {
      const { container } = render(<SkipLinks />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('p-2');
    });
  });

  describe('Component Structure', () => {
    it('renders buttons as HTML button elements', () => {
      render(<SkipLinks />);

      const mainButton = screen.getByText('Skip to main content');
      expect(mainButton.tagName).toBe('BUTTON');

      const navButton = screen.getByText('Skip to navigation');
      expect(navButton.tagName).toBe('BUTTON');
    });

    it('renders in correct order (main, then navigation)', () => {
      render(<SkipLinks />);

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveTextContent('Skip to main content');
      expect(buttons[1]).toHaveTextContent('Skip to navigation');
    });
  });
});
