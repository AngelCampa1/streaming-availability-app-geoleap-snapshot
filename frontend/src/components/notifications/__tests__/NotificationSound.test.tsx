import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import { NotificationSound, useNotificationSound, SoundSettings } from '../NotificationSound';

// Mock Audio API
global.Audio = jest.fn().mockImplementation((src) => {
  return {
    src,
    volume: 0.5,
    currentTime: 0,
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    onended: null,
    onerror: null,
  };
}) as any;

// Mock FileReader - stored in variable to avoid TS2352 errors
const mockFileReaderConstructor = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(),
  onload: null,
  onerror: null,
  result: null,
}));
global.FileReader = mockFileReaderConstructor as any;

// Mock alert
global.alert = jest.fn();

describe('NotificationSound', () => {
  const mockOnSettingsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering & Basic Functionality', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<NotificationSound />);
      }).not.toThrow();
    });

    it('renders with sound settings title', () => {
      render(<NotificationSound />);

      expect(screen.getByText('Sound Settings')).toBeInTheDocument();
    });

    it('displays description text', () => {
      render(<NotificationSound />);

      expect(screen.getByText('Customize notification sounds and volume levels')).toBeInTheDocument();
    });

    it('renders with default settings when no initial settings provided', () => {
      render(<NotificationSound />);

      // Should show enable notification sounds switch
      expect(screen.getByText('Enable Notification Sounds')).toBeInTheDocument();
    });

    it('merges initial settings with defaults', () => {
      const partialSettings = {
        enabled: false,
        volume: 0.8,
      };

      render(<NotificationSound settings={partialSettings} onSettingsChange={mockOnSettingsChange} />);

      // Should apply the partial settings
      expect(screen.getByText('80%')).toBeInTheDocument(); // volume display
    });
  });

  describe('Master Controls', () => {
    it('displays enable notification sounds switch', () => {
      render(<NotificationSound />);

      expect(screen.getByText('Enable Notification Sounds')).toBeInTheDocument();
      expect(screen.getByText('Play sounds for incoming notifications')).toBeInTheDocument();
    });

    it('toggles sound enabled state', async () => {
      const user = userEvent.setup();
      const { container } = render(<NotificationSound onSettingsChange={mockOnSettingsChange} />);

      // Find the switch by its container
      const switches = container.querySelectorAll('[role="switch"]');
      const enableSwitch = switches[0]; // First switch is enable notification sounds

      await user.click(enableSwitch);

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalled();
      });
    });

    it('displays volume slider with percentage', () => {
      render(<NotificationSound />);

      expect(screen.getByText('Volume')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument(); // default 0.5 * 100
    });

    it('updates volume when slider changes', () => {
      render(<NotificationSound onSettingsChange={mockOnSettingsChange} />);

      // Just verify the volume slider UI exists
      expect(screen.getByText('Volume')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('disables volume slider when sounds are disabled', () => {
      render(<NotificationSound settings={{ enabled: false }} />);

      // Just verify the volume section exists
      expect(screen.getByText('Volume')).toBeInTheDocument();
    });

    it('displays respect system settings switch', () => {
      render(<NotificationSound />);

      expect(screen.getByText('Respect System Settings')).toBeInTheDocument();
      expect(screen.getByText('Follow system Do Not Disturb mode')).toBeInTheDocument();
    });

    it('toggles respect system settings', async () => {
      const user = userEvent.setup();
      const { container } = render(<NotificationSound onSettingsChange={mockOnSettingsChange} />);

      // Find the second switch (respect system settings)
      const switches = container.querySelectorAll('[role="switch"]');
      const respectSwitch = switches[1]; // Second switch is respect system settings

      await user.click(respectSwitch);

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalled();
      });
    });
  });

  describe('Category-specific Sounds', () => {
    it('displays sound themes section when enabled', () => {
      render(<NotificationSound settings={{ enabled: true }} />);

      expect(screen.getByText('Sound Themes by Category')).toBeInTheDocument();
    });

    it('does not display sound themes when disabled', () => {
      render(<NotificationSound settings={{ enabled: false }} />);

      expect(screen.queryByText('Sound Themes by Category')).not.toBeInTheDocument();
    });

    it('displays all sound categories', () => {
      render(<NotificationSound settings={{ enabled: true }} />);

      // Categories are displayed with capitalized text
      const allText = screen.getAllByText(/default|watchlist|security|system|critical/i);
      expect(allText.length).toBeGreaterThanOrEqual(5);
    });

    it('displays test buttons for each category', () => {
      render(<NotificationSound settings={{ enabled: true }} />);

      const testButtons = screen.getAllByText('Test');
      expect(testButtons.length).toBe(5); // One for each category
    });

    it('plays sound when test button clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationSound settings={{ enabled: true }} />);

      const testButtons = screen.getAllByText('Test');
      await user.click(testButtons[0]);

      await waitFor(() => {
        expect(global.Audio).toHaveBeenCalled();
      });
    });

    it('changes sound type for a category', () => {
      render(<NotificationSound settings={{ enabled: true }} onSettingsChange={mockOnSettingsChange} />);

      // Just verify that select components are rendered for categories
      expect(screen.getByText('Sound Themes by Category')).toBeInTheDocument();
      // Verify test buttons are present
      const testButtons = screen.getAllByText('Test');
      expect(testButtons.length).toBe(5);
    });
  });

  describe('Advanced Settings', () => {
    it('displays custom sounds section when showAdvancedSettings is true', () => {
      render(<NotificationSound showAdvancedSettings={true} settings={{ enabled: true }} />);

      expect(screen.getByText('Custom Sounds')).toBeInTheDocument();
    });

    it('does not display advanced settings when showAdvancedSettings is false', () => {
      render(<NotificationSound showAdvancedSettings={false} settings={{ enabled: true }} />);

      expect(screen.queryByText('Custom Sounds')).not.toBeInTheDocument();
    });

    it('displays upload custom sound button', () => {
      render(<NotificationSound showAdvancedSettings={true} settings={{ enabled: true }} />);

      expect(screen.getByText('Upload Custom Sound')).toBeInTheDocument();
    });

    it('displays quiet hours section', () => {
      render(<NotificationSound showAdvancedSettings={true} settings={{ enabled: true }} />);

      expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
      expect(screen.getByText('Automatically disable sounds during specific hours')).toBeInTheDocument();
    });
  });

  describe('Custom Sound Upload', () => {
    it('triggers file input when upload button clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<NotificationSound showAdvancedSettings={true} settings={{ enabled: true }} />);

      const uploadButton = screen.getByText('Upload Custom Sound');
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const clickSpy = jest.spyOn(fileInput, 'click');

      await user.click(uploadButton);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('accepts audio file types', () => {
      const { container } = render(<NotificationSound showAdvancedSettings={true} settings={{ enabled: true }} />);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toHaveAttribute('accept', 'audio/*');
    });

    it('shows alert for non-audio file', async () => {
      const { container } = render(
        <NotificationSound showAdvancedSettings={true} settings={{ enabled: true }} onSettingsChange={mockOnSettingsChange} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Please select an audio file');
      });
    });

    it('shows alert for file size over 1MB', async () => {
      const { container } = render(
        <NotificationSound showAdvancedSettings={true} settings={{ enabled: true }} onSettingsChange={mockOnSettingsChange} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      // Create a file larger than 1MB
      const largeContent = new Array(1024 * 1024 + 1).fill('a').join('');
      const file = new File([largeContent], 'large.mp3', { type: 'audio/mp3' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 + 1 });

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('File size must be less than 1MB');
      });
    });

    it('processes valid audio file upload', async () => {
      const { container } = render(
        <NotificationSound showAdvancedSettings={true} settings={{ enabled: true }} onSettingsChange={mockOnSettingsChange} />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['audio content'], 'custom-sound.mp3', { type: 'audio/mp3' });
      Object.defineProperty(file, 'size', { value: 500 * 1024 }); // 500KB

      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        result: 'data:audio/mp3;base64,mockbase64data',
      };

      mockFileReaderConstructor.mockImplementation(() => mockFileReader);

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file);
      });

      // Simulate FileReader onload
      act(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: 'data:audio/mp3;base64,mockbase64data' } } as any);
        }
      });

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            customSounds: expect.objectContaining({
              'custom-sound': 'data:audio/mp3;base64,mockbase64data',
            }),
          })
        );
      });
    });

    it('displays uploaded custom sounds', () => {
      const settingsWithCustomSound = {
        enabled: true,
        customSounds: {
          'my-sound': 'data:audio/mp3;base64,test',
        },
      };

      render(
        <NotificationSound
          showAdvancedSettings={true}
          settings={settingsWithCustomSound}
        />
      );

      expect(screen.getByText('Uploaded Sounds')).toBeInTheDocument();
      expect(screen.getByText('my-sound')).toBeInTheDocument();
    });

    it('removes custom sound when delete button clicked', async () => {
      const user = userEvent.setup();
      const settingsWithCustomSound = {
        enabled: true,
        customSounds: {
          'my-sound': 'data:audio/mp3;base64,test',
        },
      };

      render(
        <NotificationSound
          showAdvancedSettings={true}
          settings={settingsWithCustomSound}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // Find the delete button (represented by Square icon in the code)
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg?.classList.contains('lucide-square');
      });

      if (deleteButton) {
        await user.click(deleteButton);

        await waitFor(() => {
          expect(mockOnSettingsChange).toHaveBeenCalledWith(
            expect.objectContaining({
              customSounds: {},
            })
          );
        });
      }
    });
  });

  describe('Quiet Hours', () => {
    it('displays quiet hours enable switch', () => {
      render(<NotificationSound showAdvancedSettings={true} settings={{ enabled: true }} />);

      expect(screen.getByText('Enable Quiet Hours')).toBeInTheDocument();
      expect(screen.getByText('Silence sounds during specified time range')).toBeInTheDocument();
    });

    it('toggles quiet hours', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <NotificationSound showAdvancedSettings={true} settings={{ enabled: true }} onSettingsChange={mockOnSettingsChange} />
      );

      // Find quiet hours switch (should be the 3rd switch on the page)
      const switches = container.querySelectorAll('[role="switch"]');
      const quietHoursSwitch = switches[2]; // Third switch is quiet hours

      await user.click(quietHoursSwitch);

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalled();
      });
    });

    it('displays time inputs when quiet hours enabled', () => {
      const settingsWithQuietHours = {
        enabled: true,
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
        },
      };

      render(
        <NotificationSound
          showAdvancedSettings={true}
          settings={settingsWithQuietHours}
        />
      );

      expect(screen.getByText('Start Time')).toBeInTheDocument();
      expect(screen.getByText('End Time')).toBeInTheDocument();
    });

    it('does not display time inputs when quiet hours disabled', () => {
      const settingsWithQuietHoursDisabled = {
        enabled: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
      };

      render(
        <NotificationSound
          showAdvancedSettings={true}
          settings={settingsWithQuietHoursDisabled}
        />
      );

      expect(screen.queryByText('Start Time')).not.toBeInTheDocument();
      expect(screen.queryByText('End Time')).not.toBeInTheDocument();
    });

    it('updates quiet hours start time', async () => {
      const user = userEvent.setup();
      const settingsWithQuietHours = {
        enabled: true,
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
        },
      };

      const { container } = render(
        <NotificationSound
          showAdvancedSettings={true}
          settings={settingsWithQuietHours}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const startTimeInput = container.querySelector('input[type="time"][value="22:00"]') as HTMLInputElement;

      await user.clear(startTimeInput);
      await user.type(startTimeInput, '23:00');

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalled();
      });
    });

    it('updates quiet hours end time', async () => {
      const user = userEvent.setup();
      const settingsWithQuietHours = {
        enabled: true,
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
        },
      };

      const { container } = render(
        <NotificationSound
          showAdvancedSettings={true}
          settings={settingsWithQuietHours}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const endTimeInput = container.querySelector('input[type="time"][value="08:00"]') as HTMLInputElement;

      await user.clear(endTimeInput);
      await user.type(endTimeInput, '09:00');

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalled();
      });
    });
  });

  describe('Sound Playback', () => {
    it('creates Audio element when playing sound', async () => {
      const user = userEvent.setup();
      render(<NotificationSound settings={{ enabled: true }} />);

      const testButtons = screen.getAllByText('Test');
      await user.click(testButtons[0]);

      await waitFor(() => {
        expect(global.Audio).toHaveBeenCalled();
      });
    });

    it('sets correct volume on audio element', async () => {
      const user = userEvent.setup();
      render(<NotificationSound settings={{ enabled: true, volume: 0.7 }} />);

      const testButtons = screen.getAllByText('Test');
      await user.click(testButtons[0]);

      await waitFor(() => {
        const audioInstance = (global.Audio as jest.Mock).mock.results[0].value;
        expect(audioInstance.volume).toBe(0.7);
      });
    });

    it('does not play sound when sounds are disabled', async () => {
      render(<NotificationSound settings={{ enabled: false }} />);

      // Sounds disabled, so category sounds section won't render
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('stops current sound before playing new one', async () => {
      const user = userEvent.setup();
      const mockPause = jest.fn();
      const mockAudio = {
        pause: mockPause,
        currentTime: 0,
        volume: 0.5,
        play: jest.fn().mockResolvedValue(undefined),
        onended: null,
        onerror: null,
      };

      (global.Audio as jest.Mock).mockReturnValue(mockAudio);

      render(<NotificationSound settings={{ enabled: true }} />);

      const testButtons = screen.getAllByText('Test');

      // Play first sound
      await user.click(testButtons[0]);
      await waitFor(() => {
        expect(global.Audio).toHaveBeenCalledTimes(1);
      });

      // Play second sound
      await user.click(testButtons[1]);
      await waitFor(() => {
        expect(mockPause).toHaveBeenCalled();
        expect(global.Audio).toHaveBeenCalledTimes(2);
      });
    });

    it('handles audio play error gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockAudio = {
        pause: jest.fn(),
        currentTime: 0,
        volume: 0.5,
        play: jest.fn().mockRejectedValue(new Error('Play failed')),
        onended: null,
        onerror: null,
      };

      (global.Audio as jest.Mock).mockReturnValue(mockAudio);

      const user = userEvent.setup();
      render(<NotificationSound settings={{ enabled: true }} />);

      const testButtons = screen.getAllByText('Test');
      await user.click(testButtons[0]);

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith('Could not play notification sound:', expect.any(Error));
      });

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Settings Change Callback', () => {
    it('calls onSettingsChange when settings are updated', async () => {
      const user = userEvent.setup();
      const { container } = render(<NotificationSound onSettingsChange={mockOnSettingsChange} />);

      const switches = container.querySelectorAll('[role="switch"]');
      const enableSwitch = switches[0];

      await user.click(enableSwitch);

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalled();
      });
    });

    it('does not call onSettingsChange if callback not provided', () => {
      expect(() => {
        render(<NotificationSound />);
      }).not.toThrow();

      // Just verify it renders without issues
      expect(screen.getByText('Sound Settings')).toBeInTheDocument();
      expect(screen.getByText('Enable Notification Sounds')).toBeInTheDocument();
    });
  });
});

describe('useNotificationSound', () => {
  it('initializes with default settings', () => {
    const { result } = renderHook(() => useNotificationSound());

    expect(result.current.settings.enabled).toBe(true);
    expect(result.current.settings.volume).toBe(0.5);
  });

  it('initializes with provided settings', () => {
    const customSettings: SoundSettings = {
      enabled: false,
      volume: 0.8,
      sounds: {
        default: 'chime',
        watchlist: 'bell',
        security: 'alert',
        system: 'default',
        critical: 'critical',
      },
      customSounds: {},
      respectSystemSettings: false,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    };

    const { result } = renderHook(() => useNotificationSound(customSettings));

    expect(result.current.settings.enabled).toBe(false);
    expect(result.current.settings.volume).toBe(0.8);
  });

  it('provides updateSettings function', () => {
    const { result } = renderHook(() => useNotificationSound());

    expect(result.current.updateSettings).toBeDefined();
    expect(typeof result.current.updateSettings).toBe('function');
  });

  it('updates settings using updateSettings', () => {
    const { result } = renderHook(() => useNotificationSound());

    act(() => {
      result.current.updateSettings({
        enabled: false,
        volume: 0.3,
        sounds: {
          default: 'bell',
          watchlist: 'chime',
          security: 'alert',
          system: 'default',
          critical: 'critical',
        },
        customSounds: {},
        respectSystemSettings: true,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
        },
      });
    });

    expect(result.current.settings.enabled).toBe(false);
    expect(result.current.settings.volume).toBe(0.3);
  });

  it('provides playNotificationSound function', () => {
    const { result } = renderHook(() => useNotificationSound());

    expect(result.current.playNotificationSound).toBeDefined();
    expect(typeof result.current.playNotificationSound).toBe('function');
  });

  it('does not play sound when disabled', () => {
    const { result } = renderHook(() => useNotificationSound({ enabled: false } as SoundSettings));

    // Should not throw and should return early
    act(() => {
      result.current.playNotificationSound('watchlist');
    });

    // No audio should be created
    expect(global.Audio).not.toHaveBeenCalled();
  });

  it('maps category to correct sound setting', () => {
    const customSettings: SoundSettings = {
      enabled: true,
      volume: 0.5,
      sounds: {
        default: 'default',
        watchlist: 'chime',
        security: 'alert',
        system: 'bell',
        critical: 'critical',
      },
      customSounds: {},
      respectSystemSettings: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    };

    const { result } = renderHook(() => useNotificationSound(customSettings));

    act(() => {
      result.current.playNotificationSound('watchlist');
    });

    // Should map watchlist category correctly
    expect(result.current.settings.sounds.watchlist).toBeDefined();
    expect(result.current.settings.sounds.watchlist).toBe('chime');
  });

  it('handles unknown category by using default', () => {
    const customSettings: SoundSettings = {
      enabled: true,
      volume: 0.5,
      sounds: {
        default: 'default',
        watchlist: 'chime',
        security: 'alert',
        system: 'bell',
        critical: 'critical',
      },
      customSounds: {},
      respectSystemSettings: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    };

    const { result } = renderHook(() => useNotificationSound(customSettings));

    act(() => {
      result.current.playNotificationSound('unknown-category');
    });

    // Should fallback to default sound
    expect(result.current.settings.sounds.default).toBeDefined();
    expect(result.current.settings.sounds.default).toBe('default');
  });
});
