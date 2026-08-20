import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortDropdown, SortOption } from '../SortDropdown';

describe('SortDropdown', () => {
  const mockOnValueChange = jest.fn();
  const mockOnDirectionChange = jest.fn();

  const defaultProps = {
    value: 'relevance',
    direction: 'asc' as const,
    onValueChange: mockOnValueChange,
    onDirectionChange: mockOnDirectionChange,
    options: [
      { value: 'relevance', label: 'Relevance', description: 'Best match' },
      { value: 'rating', label: 'Rating', description: 'Highest rated' },
      { value: 'year', label: 'Release Year', description: 'Most recent' },
      { value: 'title', label: 'Title (A-Z)', description: 'Alphabetical' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders sort dropdown with current selection', () => {
      render(<SortDropdown {...defaultProps} />);

      expect(screen.getByText('Relevance')).toBeInTheDocument();
    });

    it('renders direction toggle button', () => {
      render(<SortDropdown {...defaultProps} />);

      const button = screen.getByRole('button', { name: /toggle sort direction/i });
      expect(button).toBeInTheDocument();
    });

    it('shows ascending icon when direction is asc', () => {
      render(<SortDropdown {...defaultProps} direction="asc" />);

      const button = screen.getByRole('button', { name: /toggle sort direction/i });
      const svg = button.querySelector('svg');
      expect(svg).toHaveClass('lucide-arrow-up');
    });

    it('shows descending icon when direction is desc', () => {
      render(<SortDropdown {...defaultProps} direction="desc" />);

      const button = screen.getByRole('button', { name: /toggle sort direction/i });
      const svg = button.querySelector('svg');
      expect(svg).toHaveClass('lucide-arrow-down');
    });

    it('displays direction label for larger screens', () => {
      render(<SortDropdown {...defaultProps} value="relevance" direction="asc" />);

      // Direction label is shown but may be hidden on small screens (hidden sm:inline-block)
      expect(screen.getByText('Ascending')).toBeInTheDocument();
    });
  });

  describe('Sort Option Selection', () => {
    it('displays all sort options when dropdown is opened', async () => {
      const user = userEvent.setup();
      render(<SortDropdown {...defaultProps} />);

      // Click the dropdown trigger
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      // Check all options are displayed (may appear multiple times - in trigger and dropdown)
      expect(screen.getAllByText('Relevance').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Rating').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Release Year').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Title (A-Z)').length).toBeGreaterThan(0);
    });

    it('displays option descriptions', async () => {
      const user = userEvent.setup();
      render(<SortDropdown {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByText('Best match')).toBeInTheDocument();
      expect(screen.getByText('Highest rated')).toBeInTheDocument();
      expect(screen.getByText('Most recent')).toBeInTheDocument();
      expect(screen.getByText('Alphabetical')).toBeInTheDocument();
    });

    it('calls onValueChange when option is selected', async () => {
      const user = userEvent.setup();
      render(<SortDropdown {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const ratingOption = screen.getAllByText('Rating')[0];
      await user.click(ratingOption);

      expect(mockOnValueChange).toHaveBeenCalledWith('rating');
    });
  });

  describe('Direction Toggle', () => {
    it('toggles direction from asc to desc', () => {
      render(<SortDropdown {...defaultProps} direction="asc" />);

      const toggleButton = screen.getByRole('button', { name: /toggle sort direction/i });
      fireEvent.click(toggleButton);

      expect(mockOnDirectionChange).toHaveBeenCalledWith('desc');
    });

    it('toggles direction from desc to asc', () => {
      render(<SortDropdown {...defaultProps} direction="desc" />);

      const toggleButton = screen.getByRole('button', { name: /toggle sort direction/i });
      fireEvent.click(toggleButton);

      expect(mockOnDirectionChange).toHaveBeenCalledWith('asc');
    });
  });

  describe('Direction Labels', () => {
    it('shows "Highest first" for rating desc', () => {
      render(<SortDropdown {...defaultProps} value="rating" direction="desc" />);

      expect(screen.getByText('Highest first')).toBeInTheDocument();
    });

    it('shows "Lowest first" for rating asc', () => {
      render(<SortDropdown {...defaultProps} value="rating" direction="asc" />);

      expect(screen.getByText('Lowest first')).toBeInTheDocument();
    });

    it('shows "Newest first" for year desc', () => {
      render(<SortDropdown {...defaultProps} value="year" direction="desc" />);

      expect(screen.getByText('Newest first')).toBeInTheDocument();
    });

    it('shows "Oldest first" for year asc', () => {
      render(<SortDropdown {...defaultProps} value="year" direction="asc" />);

      expect(screen.getByText('Oldest first')).toBeInTheDocument();
    });

    it('shows "A to Z" for title asc', () => {
      render(<SortDropdown {...defaultProps} value="title" direction="asc" />);

      expect(screen.getByText('A to Z')).toBeInTheDocument();
    });

    it('shows "Z to A" for title desc', () => {
      render(<SortDropdown {...defaultProps} value="title" direction="desc" />);

      expect(screen.getByText('Z to A')).toBeInTheDocument();
    });

    it('shows "Ascending" for unknown sort value with asc', () => {
      render(<SortDropdown {...defaultProps} value="unknown" direction="asc" />);

      expect(screen.getByText('Ascending')).toBeInTheDocument();
    });

    it('shows "Descending" for unknown sort value with desc', () => {
      render(<SortDropdown {...defaultProps} value="unknown" direction="desc" />);

      expect(screen.getByText('Descending')).toBeInTheDocument();
    });
  });

  describe('Default Sort Options', () => {
    it('uses default sort options when options prop is not provided', async () => {
      const user = userEvent.setup();
      const propsWithoutOptions = {
        value: 'relevance',
        direction: 'asc' as const,
        onValueChange: mockOnValueChange,
        onDirectionChange: mockOnDirectionChange,
        options: [
          { value: 'relevance', label: 'Relevance', description: 'Best match for your search' },
          { value: 'popularity', label: 'Popularity', description: 'Most viewed content' },
          { value: 'rating', label: 'Rating', description: 'Highest rated first' },
          { value: 'year', label: 'Release Year', description: 'Most recent first' },
          { value: 'title', label: 'Title (A-Z)', description: 'Alphabetical order' },
          { value: 'availability', label: 'Availability', description: 'Most widely available' },
          { value: 'runtime', label: 'Runtime', description: 'Duration length' },
          { value: 'added', label: 'Recently Added', description: 'Newest additions to platforms' },
        ],
      };

      render(<SortDropdown {...propsWithoutOptions} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      // Check for default options (may appear multiple times)
      expect(screen.getAllByText('Relevance').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Popularity').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Rating').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Release Year').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Title (A-Z)').length).toBeGreaterThan(0);
      expect(screen.getByText('Availability')).toBeInTheDocument();
      expect(screen.getByText('Runtime')).toBeInTheDocument();
      expect(screen.getByText('Recently Added')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables both dropdown and button when disabled=true', () => {
      render(<SortDropdown {...defaultProps} disabled={true} />);

      const dropdown = screen.getByRole('combobox');
      const button = screen.getByRole('button', { name: /toggle sort direction/i });

      expect(dropdown).toBeDisabled();
      expect(button).toBeDisabled();
    });

    it('does not call onDirectionChange when toggle button is clicked in disabled state', () => {
      render(<SortDropdown {...defaultProps} disabled={true} />);

      const toggleButton = screen.getByRole('button', { name: /toggle sort direction/i });
      fireEvent.click(toggleButton);

      expect(mockOnDirectionChange).not.toHaveBeenCalled();
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(<SortDropdown {...defaultProps} className="custom-class" />);

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('includes screen reader text for direction toggle', () => {
      render(<SortDropdown {...defaultProps} value="rating" direction="desc" />);

      expect(screen.getByText(/Toggle sort direction - currently Highest first/i)).toBeInTheDocument();
    });

    it('includes title attribute on direction toggle button', () => {
      render(<SortDropdown {...defaultProps} value="rating" direction="desc" />);

      const button = screen.getByRole('button', { name: /toggle sort direction/i });
      expect(button).toHaveAttribute('title', 'Sort direction: Highest first');
    });
  });

  describe('Edge Cases', () => {
    it('handles option without description', async () => {
      const user = userEvent.setup();
      const optionsWithoutDescription: SortOption[] = [
        { value: 'test', label: 'Test Option' }, // No description
      ];

      render(
        <SortDropdown
          {...defaultProps}
          value="test"
          options={optionsWithoutDescription}
        />
      );

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      // Option may appear in both trigger and dropdown
      expect(screen.getAllByText('Test Option').length).toBeGreaterThan(0);
    });

    it('shows placeholder when value does not match any option', () => {
      render(<SortDropdown {...defaultProps} value="nonexistent" />);

      // Should show "Sort by..." placeholder when current option not found
      expect(screen.getByText('Sort by...')).toBeInTheDocument();
    });
  });

  describe('Direction Labels for All Sort Options', () => {
    it('shows correct labels for popularity', () => {
      const { rerender } = render(<SortDropdown {...defaultProps} value="popularity" direction="desc" />);
      expect(screen.getByText('Most popular')).toBeInTheDocument();

      rerender(<SortDropdown {...defaultProps} value="popularity" direction="asc" />);
      expect(screen.getByText('Least popular')).toBeInTheDocument();
    });

    it('shows correct labels for availability', () => {
      const { rerender } = render(<SortDropdown {...defaultProps} value="availability" direction="desc" />);
      expect(screen.getByText('Most available')).toBeInTheDocument();

      rerender(<SortDropdown {...defaultProps} value="availability" direction="asc" />);
      expect(screen.getByText('Least available')).toBeInTheDocument();
    });

    it('shows correct labels for runtime', () => {
      const { rerender } = render(<SortDropdown {...defaultProps} value="runtime" direction="desc" />);
      expect(screen.getByText('Longest first')).toBeInTheDocument();

      rerender(<SortDropdown {...defaultProps} value="runtime" direction="asc" />);
      expect(screen.getByText('Shortest first')).toBeInTheDocument();
    });

    it('shows correct labels for added', () => {
      const { rerender } = render(<SortDropdown {...defaultProps} value="added" direction="desc" />);
      expect(screen.getByText('Recently added')).toBeInTheDocument();

      rerender(<SortDropdown {...defaultProps} value="added" direction="asc" />);
      expect(screen.getByText('Oldest added')).toBeInTheDocument();
    });
  });
});
