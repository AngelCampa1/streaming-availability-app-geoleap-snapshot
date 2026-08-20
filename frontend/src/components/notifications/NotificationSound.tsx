'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Settings,
  Music,
  Bell,
  AlertTriangle,
  CheckCircle,
  Upload,
} from 'lucide-react';

export type NotificationSoundType =
  | 'default'
  | 'chime'
  | 'bell'
  | 'ping'
  | 'notification'
  | 'alert'
  | 'critical'
  | 'success'
  | 'warning'
  | 'error'
  | 'custom';

export interface SoundSettings {
  enabled: boolean;
  volume: number;
  sounds: {
    default: NotificationSoundType;
    watchlist: NotificationSoundType;
    security: NotificationSoundType;
    system: NotificationSoundType;
    critical: NotificationSoundType;
  };
  customSounds: {
    [key: string]: string; // URL or base64 data
  };
  respectSystemSettings: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationSoundProps {
  settings?: Partial<SoundSettings>;
  onSettingsChange?: (settings: SoundSettings) => void;
  showAdvancedSettings?: boolean;
}

const defaultSettings: SoundSettings = {
  enabled: true,
  volume: 0.5,
  sounds: {
    default: 'default',
    watchlist: 'chime',
    security: 'alert',
    system: 'bell',
    critical: 'alert',
  },
  customSounds: {},
  respectSystemSettings: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

const builtInSounds = {
  default: '/sounds/notification.mp3',
  chime: '/sounds/chime.mp3',
  bell: '/sounds/bell.mp3',
  ping: '/sounds/ping.mp3',
  notification: '/sounds/notification-simple.mp3',
  alert: '/sounds/alert.mp3',
  critical: '/sounds/critical.mp3',
  success: '/sounds/success.mp3',
  warning: '/sounds/warning.mp3',
  error: '/sounds/error.mp3',
};

export function NotificationSound({
  settings: initialSettings,
  onSettingsChange,
  showAdvancedSettings = true,
}: NotificationSoundProps) {
  const [settings, setSettings] = useState<SoundSettings>({
    ...defaultSettings,
    ...initialSettings,
  });
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [_customSoundFile, setCustomSoundFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  const updateSettings = (updates: Partial<SoundSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const isInQuietHours = useCallback(() => {
    if (!settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }, [settings.quietHours]);

  const playSound = useCallback(
    async (category: keyof SoundSettings['sounds'] | 'test', priority?: 'low' | 'medium' | 'high' | 'critical') => {
      if (!settings.enabled) return;
      if (settings.respectSystemSettings && isInQuietHours()) return;

      let soundType: NotificationSoundType;

      if (category === 'test') {
        soundType = 'default';
      } else if (priority === 'critical') {
        soundType = settings.sounds.critical;
      } else {
        soundType = settings.sounds[category];
      }

      let audioUrl: string;

      if (soundType === 'custom') {
        const customSound = Object.values(settings.customSounds)[0];
        if (!customSound) {
          soundType = 'default';
          audioUrl = builtInSounds.default;
        } else {
          audioUrl = customSound;
        }
      } else {
        audioUrl = builtInSounds[soundType];
      }

      try {
        // Stop any currently playing sound
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        const audio = new Audio(audioUrl);
        audio.volume = settings.volume;
        audioRef.current = audio;

        setIsPlaying(`${category}-${soundType}`);

        audio.onended = () => {
          setIsPlaying(null);
        };

        audio.onerror = () => {
          console.warn(`Failed to play notification sound: ${audioUrl}`);
          setIsPlaying(null);
        };

        await audio.play();
      } catch (error) {
        console.warn('Could not play notification sound:', error);
        setIsPlaying(null);
      }
    },
    [settings, isInQuietHours]
  );

  const stopSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(null);
  };

  const handleCustomSoundUpload = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file');
      return;
    }

    if (file.size > 1024 * 1024) {
      // 1MB limit
      alert('File size must be less than 1MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result as string;
        const fileName = file.name.replace(/\.[^/.]+$/, '');

        updateSettings({
          customSounds: {
            ...settings.customSounds,
            [fileName]: result,
          },
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading custom sound:', error);
      alert('Failed to upload custom sound');
    }
  };

  const removeCustomSound = (name: string) => {
    const newCustomSounds = { ...settings.customSounds };
    delete newCustomSounds[name];
    updateSettings({ customSounds: newCustomSounds });
  };

  const getSoundIcon = (soundType: NotificationSoundType) => {
    switch (soundType) {
      case 'alert':
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      case 'chime':
      case 'bell':
        return <Bell className="w-4 h-4" />;
      case 'custom':
        return <Music className="w-4 h-4" />;
      default:
        return <Volume2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Volume2 className="w-5 h-5" />
            <span>Sound Settings</span>
          </CardTitle>
          <CardDescription>Customize notification sounds and volume levels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable Notification Sounds</div>
                <div className="text-sm text-muted-foreground">Play sounds for incoming notifications</div>
              </div>
              <Switch checked={settings.enabled} onCheckedChange={checked => updateSettings({ enabled: checked })} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">Volume</div>
                <div className="text-sm text-muted-foreground">{Math.round(settings.volume * 100)}%</div>
              </div>
              <Slider
                value={[settings.volume]}
                onValueChange={value => updateSettings({ volume: value[0] })}
                max={1}
                min={0}
                step={0.1}
                disabled={!settings.enabled}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Respect System Settings</div>
                <div className="text-sm text-muted-foreground">Follow system Do Not Disturb mode</div>
              </div>
              <Switch
                checked={settings.respectSystemSettings}
                onCheckedChange={checked => updateSettings({ respectSystemSettings: checked })}
                disabled={!settings.enabled}
              />
            </div>
          </div>

          {/* Category-specific sounds */}
          {settings.enabled && (
            <div className="space-y-4">
              <div className="font-medium">Sound Themes by Category</div>

              {Object.entries(settings.sounds).map(([category, soundType]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getSoundIcon(soundType)}
                    <span className="capitalize text-sm">{category}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Select
                      value={soundType}
                      onValueChange={(value: NotificationSoundType) =>
                        updateSettings({
                          sounds: {
                            ...settings.sounds,
                            [category]: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(builtInSounds).map(sound => (
                          <SelectItem key={sound} value={sound}>
                            <div className="flex items-center space-x-2">
                              {getSoundIcon(sound as NotificationSoundType)}
                              <span className="capitalize">{sound}</span>
                            </div>
                          </SelectItem>
                        ))}
                        {Object.keys(settings.customSounds).length > 0 && (
                          <SelectItem value="custom">
                            <div className="flex items-center space-x-2">
                              <Music className="w-4 h-4" />
                              <span>Custom</span>
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playSound(category as keyof SoundSettings['sounds'])}
                      disabled={isPlaying === `${category}-${soundType}`}
                      className="flex items-center space-x-1"
                    >
                      {isPlaying === `${category}-${soundType}` ? (
                        <Square
                          className="w-3 h-3"
                          onClick={e => {
                            e.stopPropagation();
                            stopSound();
                          }}
                        />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      <span>Test</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      {showAdvancedSettings && settings.enabled && (
        <>
          {/* Custom Sounds */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Music className="w-5 h-5" />
                <span>Custom Sounds</span>
              </CardTitle>
              <CardDescription>Upload your own notification sounds (MP3, WAV, OGG - Max 1MB)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCustomSoundFile(file);
                      handleCustomSoundUpload(file);
                    }
                  }}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Custom Sound</span>
                </Button>
              </div>

              {Object.keys(settings.customSounds).length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium text-sm">Uploaded Sounds</div>
                  {Object.entries(settings.customSounds).map(([name, url]) => (
                    <div key={name} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <Music className="w-4 h-4" />
                        <span className="text-sm">{name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const audio = new Audio(url);
                            audio.volume = settings.volume;
                            audio.play().catch(console.warn);
                          }}
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomSound(name)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Square className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Quiet Hours</span>
              </CardTitle>
              <CardDescription>Automatically disable sounds during specific hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Enable Quiet Hours</div>
                  <div className="text-sm text-muted-foreground">
                    Silence sounds during specified time range
                  </div>
                </div>
                <Switch
                  checked={settings.quietHours.enabled}
                  onCheckedChange={checked =>
                    updateSettings({
                      quietHours: { ...settings.quietHours, enabled: checked },
                    })
                  }
                />
              </div>

              {settings.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Time</label>
                    <input
                      type="time"
                      value={settings.quietHours.start}
                      onChange={e =>
                        updateSettings({
                          quietHours: {
                            ...settings.quietHours,
                            start: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Time</label>
                    <input
                      type="time"
                      value={settings.quietHours.end}
                      onChange={e =>
                        updateSettings({
                          quietHours: {
                            ...settings.quietHours,
                            end: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
              )}

              {settings.quietHours.enabled && isInQuietHours() && (
                <Badge variant="outline" className="text-warning border-warning">
                  <VolumeX className="w-3 h-3 mr-1" />
                  Currently in quiet hours
                </Badge>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Hook for playing notification sounds
export function useNotificationSound(settings?: SoundSettings) {
  const [currentSettings, setCurrentSettings] = useState<SoundSettings>(settings || defaultSettings);

  const soundRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(
    (category: string, _priority?: 'low' | 'medium' | 'high' | 'critical') => {
      if (!currentSettings.enabled) return;

      // Map category to sound settings key
      const categoryMap: Record<string, keyof SoundSettings['sounds']> = {
        watchlist: 'watchlist',
        security: 'security',
        system: 'system',
        billing: 'default',
        social: 'default',
        content: 'watchlist',
      };

      const _soundCategory = categoryMap[category] || 'default';

      // Use the NotificationSound's playSound method if available
      if (soundRef.current) {
        // Access the playSound method through ref
      }
    },
    [currentSettings]
  );

  return {
    playNotificationSound,
    settings: currentSettings,
    updateSettings: setCurrentSettings,
  };
}
