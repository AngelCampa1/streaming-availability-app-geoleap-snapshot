import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterfacePreferences } from '../InterfacePreferences';
import { useTheme } from '@/contexts/ThemeContext';

// Mock the theme context
jest.mock('@/contexts/ThemeContext');

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('InterfacePreferences', () => {
  const mockOnUpdate = jest.fn();
  const mockSetTheme = jest.fn();

  const defaultProps = {
    preferences: {
      themePreference: 'light',
      autoThemeSwitch: false,
      lightThemeStart: '06:00',
      darkThemeStart: '18:00',
      layoutDensity: 'comfortable',
      resultsPerPage: 20,
      gridColumns: 4,
      showSidebar: true,
      stickyHeader: true,
      cardStyle: 'modern',
      showRatings: true,
      showYear: true,
      showDuration: true,
      showProviders: true,
      hoverEffects: true,
      animationSpeed: 'normal',
      lazyLoading: true,
      preloadImages: true,
      infiniteScroll: true,
    },
    onUpdate: mockOnUpdate,
    isUpdating: false,
    currentTheme: 'light',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      toggleTheme: jest.fn(),
      systemTheme: 'light',
      isSystemTheme: false,
      setSystemTheme: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('renders all preference sections', () => {
      render(<InterfacePreferences {...defaultProps} />);

      expect(screen.getByText('Theme & Appearance')).toBeInTheDocument();
      expect(screen.getByText('Layout & Navigation')).toBeInTheDocument();
      expect(screen.getByText('Content Display')).toBeInTheDocument();
      expect(screen.getByText('Animation & Performance')).toBeInTheDocument();
    });

    it('shows updating indicator when isUpdating is true', () => {
      render(<InterfacePreferences {...defaultProps} isUpdating={true} />);

      expect(screen.getByText('Updating preferences...')).toBeInTheDocument();
    });

    it('displays current theme correctly', () => {
      render(<InterfacePreferences {...defaultProps} />);

      expect(screen.getByText('🌞 Light Theme')).toBeInTheDocument();
    });
  });

  describe('Theme Settings', () => {
    it('shows the theme selector with light theme option', () => {
      render(<InterfacePreferences {...defaultProps} />);

      expect(screen.getByText('🌞 Light Theme')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
    });
  });

  describe('Layout Settings', () => {
    it('handles layout density change', () => {
      render(<InterfacePreferences {...defaultProps} />);

      expect(screen.getByText('Layout Density')).toBeInTheDocument();
      expect(screen.getByText('Comfortable - Balanced spacing')).toBeInTheDocument();
    });

    it('handles results per page change', () => {
      render(<InterfacePreferences {...defaultProps} />);

      expect(screen.getByText('Results Per Page')).toBeInTheDocument();
      expect(screen.getByText('20 results')).toBeInTheDocument();
    });

    it('handles grid columns slider change', () => {
      render(<InterfacePreferences {...defaultProps} />);

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(screen.getByText('4 columns')).toBeInTheDocument();
    });

    it('handles sidebar toggle', async () => {
      const user = userEvent.setup();
      render(<InterfacePreferences {...defaultProps} />);

      // switches[0] = showSidebar (no auto theme switch in light-only mode)
      const switches = screen.getAllByRole('switch');
      const sidebarSwitch = switches[0];
      expect(sidebarSwitch).toBeInTheDocument();
      await user.click(sidebarSwitch);

      expect(mockOnUpdate).toHaveBeenCalledWith('showSidebar', false);
    });

    it('handles sticky header toggle', async () => {
      const user = userEvent.setup();
      render(<InterfacePreferences {...defaultProps} />);

      const switches = screen.getAllByRole('switch');
      const stickyHeaderSwitch = switches[1];
      expect(stickyHeaderSwitch).toBeInTheDocument();
      await user.click(stickyHeaderSwitch);

      expect(mockOnUpdate).toHaveBeenCalledWith('stickyHeader', false);
    });
  });

  describe('Content Display Settings', () => {
    it('handles card style change', () => {
      render(<InterfacePreferences {...defaultProps} />);

      expect(screen.getByText('Card Style')).toBeInTheDocument();
      expect(screen.getByText('Modern - Rounded with shadows')).toBeInTheDocument();
    });

    it('handles show ratings toggle', async () => {
      const user = userEvent.setup();
      render(<InterfacePreferences {...defaultProps} />);

      const switches = screen.getAllByRole('switch');
      const ratingsSwitch = switches[2];
      expect(ratingsSwitch).toBeInTheDocument();
      await user.click(ratingsSwitch);

      expect(mockOnUpdate).toHaveBeenCalledWith('showRatings', false);
    });

    it('handles show year toggle', async () => {
      const user = userEvent.setup();
      render(<InterfacePreferences {...defaultProps} />);

      const switches = screen.getAllByRole('switch');
      const yearSwitch = switches[3];
      expect(yearSwitch).toBeInTheDocument();
      await user.click(yearSwitch);

      expect(mockOnUpdate).toHaveBeenCalledWith('showYear', false);
    });

    it('handles show duration toggle', async () => {
      const user = userEvent.setup();
      render(<InterfacePreferences {...defaultProps} />);

      const switches = screen.getAllByRole('switch');
      const durationSwitch = switches[4];
      expect(durationSwitch).toBeInTheDocument();
      await user.click(durationSwitch);

      expect(mockOnUpdate).toHaveBeenCalledWith('showDuration', false);
    });

    it('handles show providers toggle', async () => {
      const user = userEvent.setup();
      render(<InterfacePreferences {...defaultProps} />);

      const switches = screen.getAllByRole('switch');
      const providersSwitch = switches[5];
      expect(providersSwitch).toBeInTheDocument();
      await user.click(providersSwitch);

      expect(mockOnUpdate).toHaveBeenCalledWith('showProviders', false);
    });

    it('handles hover effects toggle', async () => {
      const user = userEvent.setup();
      render(<InterfacePreferences {...defaultProps} />);

      const switches = screen.getAllByRole('switch');
      const hoverSwitch = switches[6];
      expect(hoverSwitch).toBeInTheDocument();
      await user.click(hoverSwitch);

      expect(mockOnUpdate).toHaveBeenCalledWith('hoverEffects', false);
    });
  });

  describe('Animation & Performance Settings', () => {
    it('handles animation speed change', () => {
      render(<InterfacePreferences {...defaultProps} />);

      expect(screen.getByText('Animation Speed')).toBeInTheDocument();
      expect(screen.getByText('Normal - Standard speed')).toBeInTheDocument();
    });

    it('handles lazy loading toggle', async () => {
      const user = userEvent.setup();
      render(<InterfacePreferences {...defaultProps} />);

      const switches = screen.getAllByRole('switch');
      const lazyLoadingSwitch = switches[7];
      expect(lazyLoadingSwitch).toBeInTheDocument();
      await user.click(lazyLoadingSwitch);

      expect(mockOnUpdate).toHaveBeenCalledWith('lazyLoading', false);
    });

    it('handles preload images toggle', async () => {
      const user = userEvent.setup();
      render(<InterfacePreferences {...defaultProps} />);

      const switches = screen.getAllByRole('switch');
      const preloadSwitch = switches[8];
      expect(preloadSwitch).toBeInTheDocument();
      await user.click(preloadSwitch);

      expect(mockOnUpdate).toHaveBeenCalledWith('preloadImages', false);
    });

    it('handles infinite scroll toggle', async () => {
      const user = userEvent.setup();
      render(<InterfacePreferences {...defaultProps} />);

      const switches = screen.getAllByRole('switch');
      const infiniteScrollSwitch = switches[9];
      expect(infiniteScrollSwitch).toBeInTheDocument();
      await user.click(infiniteScrollSwitch);

      expect(mockOnUpdate).toHaveBeenCalledWith('infiniteScroll', false);
    });
  });

  describe('Disabled States', () => {
    it('disables all controls when isUpdating is true', () => {
      render(<InterfacePreferences {...defaultProps} isUpdating={true} />);

      const selects = screen.getAllByRole('combobox');
      expect(selects[0]).toBeDisabled();

      const switches = screen.getAllByRole('switch');
      expect(switches[0]).toBeDisabled();
    });

    it('theme timing controls are not visible (light-only mode)', () => {
      render(<InterfacePreferences {...defaultProps} />);

      expect(screen.queryByText('Light Theme Start')).not.toBeInTheDocument();
    });
  });

  describe('Default Values', () => {
    it('uses default values when preferences are not provided', () => {
      const propsWithoutPreferences = {
        ...defaultProps,
        preferences: {},
      };

      render(<InterfacePreferences {...propsWithoutPreferences} />);

      expect(screen.getByText('Theme & Appearance')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for key controls', () => {
      render(<InterfacePreferences {...defaultProps} />);

      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Layout Density')).toBeInTheDocument();
      expect(screen.getByText('Results Per Page')).toBeInTheDocument();
    });

    it('provides descriptive text for preferences', () => {
      render(<InterfacePreferences {...defaultProps} />);

      expect(screen.getByText('Display the navigation sidebar on larger screens')).toBeInTheDocument();
      expect(screen.getByText('Keep the navigation header visible while scrolling')).toBeInTheDocument();
    });
  });

  describe('Grid Columns Display', () => {
    it('displays current grid columns value', () => {
      render(<InterfacePreferences {...defaultProps} />);

      expect(screen.getByText('4 columns')).toBeInTheDocument();
    });

    it('updates grid columns display when value changes', () => {
      const propsWithDifferentColumns = {
        ...defaultProps,
        preferences: { ...defaultProps.preferences, gridColumns: 6 },
      };

      render(<InterfacePreferences {...propsWithDifferentColumns} />);

      const columnsElements = screen.getAllByText('6 columns');
      expect(columnsElements).toHaveLength(2);
      expect(screen.getByText('2 columns')).toBeInTheDocument();
    });
  });
});
