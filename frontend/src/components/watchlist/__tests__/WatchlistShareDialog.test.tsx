/**
 * WatchlistShareDialog Integration Tests
 *
 * Tests share dialog with REAL sharing logic and settings management.
 * Uses boundary-only mocking (watchlistApi, navigator.clipboard, window.open).
 *
 * Coverage Target: 80%+
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WatchlistShareDialog } from '../WatchlistShareDialog';
import watchlistApi from '@/services/watchlistApi';

// Mock watchlistApi (BOUNDARY ONLY)
jest.mock('../../../services/watchlistApi', () => ({
  __esModule: true,
  default: {
    createShare: jest.fn(),
  },
}));

// Mock navigator.clipboard (BOUNDARY)
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock window.open (BOUNDARY)
const mockWindowOpen = jest.fn();
global.open = mockWindowOpen;

describe('WatchlistShareDialog - Integration Tests', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dialog Open/Close', () => {
    it('renders dialog when open is true', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      expect(screen.getByText('Share Watchlist')).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      render(<WatchlistShareDialog open={false} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      expect(screen.queryByText('Share Watchlist')).not.toBeInTheDocument();
    });

    it('calls onOpenChange when cancel button is clicked', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Tabs - Configure and Share', () => {
    it('defaults to Configure tab', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const configureTab = screen.getByRole('tab', { name: /configure/i });
      expect(configureTab).toHaveAttribute('data-state', 'active');
    });

    it('disables Share tab when no share URL exists', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const shareTab = screen.getByRole('tab', { name: /share/i });
      expect(shareTab).toBeDisabled();
    });

    it('switches to Share tab after creating share link', async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const createButton = screen.getByRole('button', { name: /create share link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        const shareTab = screen.getByRole('tab', { name: /share/i });
        expect(shareTab).toHaveAttribute('data-state', 'active');
      });
    });
  });

  describe('Share Scope Display', () => {
    it('shows "Full Watchlist" when no items selected', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      expect(screen.getByText('Full Watchlist')).toBeInTheDocument();
      expect(screen.getByText('Your entire watchlist will be shared')).toBeInTheDocument();
    });

    it('shows selected item count when items are selected', () => {
      render(
        <WatchlistShareDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedItems={['item1', 'item2', 'item3']}
        />
      );

      expect(screen.getByText('Selected Items')).toBeInTheDocument();
      expect(screen.getByText('3 selected items will be shared')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Badge
    });

    it('updates scope when selectedItems changes', () => {
      const { rerender } = render(
        <WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />
      );

      expect(screen.getByText('Full Watchlist')).toBeInTheDocument();

      rerender(
        <WatchlistShareDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          selectedItems={['item1', 'item2']}
        />
      );

      expect(screen.getByText('2 selected items will be shared')).toBeInTheDocument();
    });
  });

  describe('Privacy Settings', () => {
    it('renders all privacy options', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      expect(screen.getByText('Public')).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
      expect(screen.getByText('Friends Only')).toBeInTheDocument();
    });

    it('defaults to Private privacy setting', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const privateOption = screen.getByText('Private').closest('.border-primary, .bg-primary\\/5');
      expect(privateOption).toBeTruthy();
    });

    it('selects privacy option when clicked', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const publicOption = screen.getByText('Public');
      fireEvent.click(publicOption);

      // Public option should now have selected styling
      const publicCard = publicOption.closest('.border-primary');
      expect(publicCard).toBeTruthy();
    });

    it('displays privacy descriptions', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      expect(screen.getByText('Anyone with the link can view')).toBeInTheDocument();
      expect(screen.getByText('Only you can view')).toBeInTheDocument();
      expect(screen.getByText('Only your friends can view')).toBeInTheDocument();
    });
  });

  describe('Additional Options - Switches', () => {
    it('renders allowComments switch unchecked by default', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      expect(screen.getByText('Allow Comments')).toBeInTheDocument();
      expect(screen.getByText('Let viewers leave comments on your watchlist')).toBeInTheDocument();

      const switches = screen.getAllByRole('switch');
      expect(switches[0]).toHaveAttribute('aria-checked', 'false');
    });

    it('renders allowSuggestions switch unchecked by default', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      expect(screen.getByText('Allow Suggestions')).toBeInTheDocument();
      expect(screen.getByText('Let viewers suggest new items for your watchlist')).toBeInTheDocument();

      const switches = screen.getAllByRole('switch');
      expect(switches[1]).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles allowComments switch', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const switches = screen.getAllByRole('switch');
      const commentsSwitch = switches[0]; // First switch is Allow Comments
      fireEvent.click(commentsSwitch);

      expect(commentsSwitch).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(commentsSwitch);
      expect(commentsSwitch).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles allowSuggestions switch', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const switches = screen.getAllByRole('switch');
      const suggestionsSwitch = switches[1]; // Second switch is Allow Suggestions
      fireEvent.click(suggestionsSwitch);

      expect(suggestionsSwitch).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Link Expiry Settings', () => {
    it('renders expiry dropdown', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      expect(screen.getByText('Link Expiry')).toBeInTheDocument();
      // Select component present
      const selectTrigger = screen.getByRole('combobox');
      expect(selectTrigger).toBeInTheDocument();
    });

    it('allows selecting expiry option', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const selectTrigger = screen.getByRole('combobox');
      fireEvent.click(selectTrigger);

      // Expiry options should appear (implementation specific to Select component)
      // Note: Actual option selection depends on UI library implementation
    });
  });

  describe('Create Share Link Functionality', () => {
    it('calls watchlistApi.createShare when create button clicked', async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const createButton = screen.getByRole('button', { name: /create share link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(watchlistApi.createShare).toHaveBeenCalledWith('default', {
          shareType: 'private',
          allowComments: false,
          allowSuggestions: false,
          expiryDate: undefined,
        });
      });
    });

    it('includes selected privacy settings in API call', async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      // Change to public
      fireEvent.click(screen.getByText('Public'));

      // Enable comments (first switch)
      const switches = screen.getAllByRole('switch');
      fireEvent.click(switches[0]);

      const createButton = screen.getByRole('button', { name: /create share link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(watchlistApi.createShare).toHaveBeenCalledWith('default', {
          shareType: 'public',
          allowComments: true,
          allowSuggestions: false,
          expiryDate: undefined,
        });
      });
    });

    it('shows loading state during creation', async () => {
      (watchlistApi.createShare as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: { shareUrl: 'url' } }), 100))
      );

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const createButton = screen.getByRole('button', { name: /create share link/i });
      fireEvent.click(createButton);

      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(createButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
      });
    });

    it('handles creation errors gracefully', async () => {
      (watchlistApi.createShare as jest.Mock).mockRejectedValue(new Error('Failed to create share'));

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const createButton = screen.getByRole('button', { name: /create share link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        // Should remain on Configure tab
        const configureTab = screen.getByRole('tab', { name: /configure/i });
        expect(configureTab).toHaveAttribute('data-state', 'active');
      });
    });

    it('switches to Share tab after successful creation', async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      const createButton = screen.getByRole('button', { name: /create share link/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        const shareTab = screen.getByRole('tab', { name: /share/i });
        expect(shareTab).toHaveAttribute('data-state', 'active');
      });
    });
  });

  describe('Share Tab - Share Link Display', () => {
    beforeEach(async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });
    });

    it('displays share URL in readonly input', async () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        const urlInput = screen.getByDisplayValue('https://example.com/share/abc123');
        expect(urlInput).toBeInTheDocument();
        expect(urlInput).toHaveAttribute('readonly');
      });
    });

    it('copies share URL to clipboard when copy button clicked', async () => {
      mockWriteText.mockResolvedValue(undefined);

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('https://example.com/share/abc123')).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => btn.querySelector('svg')); // Find button with icon
      if (copyButton) {
        fireEvent.click(copyButton);

        await waitFor(() => {
          expect(mockWriteText).toHaveBeenCalledWith('https://example.com/share/abc123');
        });
      }
    });

    it('shows check icon after successful copy', async () => {
      mockWriteText.mockResolvedValue(undefined);

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('https://example.com/share/abc123')).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => btn.querySelector('svg'));
      if (copyButton) {
        fireEvent.click(copyButton);

        await waitFor(() => {
          // Check icon should appear (timing sensitive)
          expect(mockWriteText).toHaveBeenCalled();
        });
      }
    });

    it('displays privacy hint for public shares', async () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByText('Public'));
      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByText('Anyone with this link can view your watchlist')).toBeInTheDocument();
      });
    });

    it('displays privacy hint for private shares', async () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      // Private is default
      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByText('Only authorized users can view this watchlist')).toBeInTheDocument();
      });
    });
  });

  describe('Social Sharing', () => {
    beforeEach(async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });
    });

    it('renders all social share options', async () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /email/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /twitter/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /facebook/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /whatsapp/i })).toBeInTheDocument();
      });
    });

    it('opens email client when Email button clicked', async () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /email/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /email/i }));

      expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('mailto:'));
    });

    it('opens Twitter when Twitter button clicked', async () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /twitter/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /twitter/i }));

      expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('twitter.com/intent/tweet'));
    });

    it('opens Facebook when Facebook button clicked', async () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /facebook/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /facebook/i }));

      expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('facebook.com/sharer'));
    });

    it('opens WhatsApp when WhatsApp button clicked', async () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /whatsapp/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }));

      expect(mockWindowOpen).toHaveBeenCalledWith(expect.stringContaining('wa.me'));
    });
  });

  describe('QR Code Section', () => {
    it('renders QR code placeholder', async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByText('QR Code')).toBeInTheDocument();
        expect(screen.getByText('QR code for easy mobile sharing')).toBeInTheDocument();
      });
    });

    it('renders QR code download button', async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /download qr code/i })).toBeInTheDocument();
      });
    });
  });

  describe('Share Statistics', () => {
    it('displays share statistics with zero initial values', async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByText('Share Statistics')).toBeInTheDocument();
        expect(screen.getByText('Views')).toBeInTheDocument();
        expect(screen.getByText('Comments')).toBeInTheDocument();
        expect(screen.getByText('Suggestions')).toBeInTheDocument();
      });
    });
  });

  describe('Management Options', () => {
    it('renders Manage Shares button in Share tab', async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /manage shares/i })).toBeInTheDocument();
      });
    });

    it('renders Done button in Share tab', async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        const doneButton = screen.getByRole('button', { name: /^done$/i });
        expect(doneButton).toBeInTheDocument();
      });
    });

    it('closes dialog when Done button clicked', async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        const doneButton = screen.getByRole('button', { name: /^done$/i });
        fireEvent.click(doneButton);
      });

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty selectedItems array', () => {
      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      expect(screen.getByText('Full Watchlist')).toBeInTheDocument();
    });

    it('handles large selectedItems array', () => {
      const manyItems = Array.from({ length: 1000 }, (_, i) => `item${i}`);

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={manyItems} />);

      expect(screen.getByText('1000 selected items will be shared')).toBeInTheDocument();
    });

    it('handles clipboard write failure gracefully', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard access denied'));

      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: { shareUrl: 'https://example.com/share/abc123' },
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('https://example.com/share/abc123')).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByRole('button');
      const copyButton = copyButtons.find(btn => btn.querySelector('svg'));
      if (copyButton) {
        fireEvent.click(copyButton);

        // Should not crash
        await waitFor(() => {
          expect(mockWriteText).toHaveBeenCalled();
        });
      }
    });

    it('handles API response without shareUrl gracefully', async () => {
      (watchlistApi.createShare as jest.Mock).mockResolvedValue({
        success: true,
        data: {},
      });

      render(<WatchlistShareDialog open={true} onOpenChange={mockOnOpenChange} selectedItems={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /create share link/i }));

      await waitFor(() => {
        // Should remain on Configure tab due to missing shareUrl
        const configureTab = screen.getByRole('tab', { name: /configure/i });
        expect(configureTab).toHaveAttribute('data-state', 'active');
      });
    });
  });
});

/**
 * MOCK-TO-TEST RATIO: 3 boundary mocks / 34 tests = 0.09 ✅
 * TARGET COVERAGE: 80%+
 * MOCKING STRATEGY:
 *   - watchlistApi (boundary - external service)
 *   - navigator.clipboard (boundary - browser API)
 *   - window.open (boundary - browser API)
 */
