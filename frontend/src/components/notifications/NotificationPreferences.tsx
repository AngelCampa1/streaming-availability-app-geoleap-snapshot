'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Mail,
  Smartphone,
  Settings,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Save,
  RefreshCw,
  Shield,
  Zap,
  Star,
  AlertTriangle,
  CheckCircle,
  Info,
  Plus,
  Trash2,
} from 'lucide-react';

export interface NotificationPreference {
  id: string;
  category: string;
  name: string;
  description: string;
  channels: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    sms?: boolean;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly' | 'never';
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
  conditions?: string[];
}

export interface NotificationSettings {
  globalEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  emailDigest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'never';
    time: string;
  };
  preferences: NotificationPreference[];
  customRules: Array<{
    id: string;
    name: string;
    conditions: string;
    actions: string[];
    enabled: boolean;
  }>;
}

interface NotificationPreferencesProps {
  className?: string;
  onSettingsChange?: (settings: Partial<NotificationSettings>) => void;
  initialSettings?: Partial<NotificationSettings>;
}

const defaultPreferences: NotificationPreference[] = [
  {
    id: 'watchlist-available',
    category: 'Watchlist',
    name: 'Content Available',
    description: 'When content from your watchlist becomes available',
    channels: { email: true, push: true, inApp: true },
    priority: 'high',
    frequency: 'instant',
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
  },
  {
    id: 'watchlist-expiring',
    category: 'Watchlist',
    name: 'Content Expiring',
    description: 'When content from your watchlist is about to expire',
    channels: { email: true, push: true, inApp: true },
    priority: 'medium',
    frequency: 'daily',
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
  },
  {
    id: 'new-seasons',
    category: 'Content Updates',
    name: 'New Seasons/Episodes',
    description: 'When new seasons or episodes are released',
    channels: { email: true, push: false, inApp: true },
    priority: 'medium',
    frequency: 'instant',
    quietHours: { enabled: true, start: '22:00', end: '08:00' },
  },
  {
    id: 'price-drops',
    category: 'Pricing',
    name: 'Price Drops',
    description: 'When content pricing decreases',
    channels: { email: true, push: false, inApp: true },
    priority: 'low',
    frequency: 'daily',
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
  },
  {
    id: 'security-alerts',
    category: 'Security',
    name: 'Security Alerts',
    description: 'Account security and login notifications',
    channels: { email: true, push: true, inApp: true, sms: true },
    priority: 'critical',
    frequency: 'instant',
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
  },
  {
    id: 'system-maintenance',
    category: 'System',
    name: 'System Maintenance',
    description: 'Scheduled maintenance and downtime notifications',
    channels: { email: true, push: false, inApp: true },
    priority: 'medium',
    frequency: 'instant',
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
  },
];

export function NotificationPreferences({
  className = '',
  onSettingsChange,
  initialSettings,
}: NotificationPreferencesProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    globalEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    emailDigest: {
      enabled: true,
      frequency: 'daily',
      time: '09:00',
    },
    preferences: defaultPreferences,
    customRules: [],
    ...initialSettings,
  });

  const [activeTab, setActiveTab] = useState('general');
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [_importFile, setImportFile] = useState<File | null>(null);
  const [newCustomRule, setNewCustomRule] = useState({
    name: '',
    conditions: '',
    actions: [] as string[],
    enabled: true,
  });

  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  const updateSettings = (updates: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const updatePreference = (id: string, updates: Partial<NotificationPreference>) => {
    setSettings(prev => ({
      ...prev,
      preferences: prev.preferences.map(pref => (pref.id === id ? { ...pref, ...updates } : pref)),
    }));
  };

  const toggleChannel = (prefId: string, channel: keyof NotificationPreference['channels']) => {
    setSettings(prev => ({
      ...prev,
      preferences: prev.preferences.map(pref =>
        pref.id === prefId ? { ...pref, channels: { ...pref.channels, [channel]: !pref.channels[channel] } } : pref
      ),
    }));
  };

  const exportSettings = async () => {
    setIsExporting(true);
    try {
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notification-preferences-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const importSettings = async (file: File) => {
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text) as NotificationSettings;

      // Validate imported settings
      if (importedSettings.preferences && Array.isArray(importedSettings.preferences)) {
        setSettings(importedSettings);
      } else {
        throw new Error('Invalid settings format');
      }
    } catch (error) {
      console.error('Error importing settings:', error);
      // In a real app, show error notification
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // In a real app, save to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      logger.info('[NotificationPreferences] Settings saved', { settings });
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomRule = () => {
    if (newCustomRule.name && newCustomRule.conditions) {
      const rule = {
        id: `custom-${Date.now()}`,
        ...newCustomRule,
      };
      setSettings(prev => ({
        ...prev,
        customRules: [...prev.customRules, rule],
      }));
      setNewCustomRule({
        name: '',
        conditions: '',
        actions: [],
        enabled: true,
      });
    }
  };

  const removeCustomRule = (id: string) => {
    setSettings(prev => ({
      ...prev,
      customRules: prev.customRules.filter(rule => rule.id !== id),
    }));
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-error" />;
      case 'high':
        return <Zap className="w-4 h-4 text-warning" />;
      case 'medium':
        return <Info className="w-4 h-4 text-primary" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-success" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'watchlist':
        return <Star className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
      case 'system':
        return <Settings className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const groupedPreferences = settings.preferences.reduce(
    (acc, pref) => {
      if (!acc[pref.category]) acc[pref.category] = [];
      acc[pref.category].push(pref);
      return acc;
    },
    {} as Record<string, NotificationPreference[]>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notification Preferences</h2>
          <p className="text-muted-foreground">Manage how and when you receive notifications</p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportSettings}
            disabled={isExporting}
            className="flex items-center space-x-2"
          >
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Export</span>
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setImportFile(file);
                  importSettings(file);
                }
              }}
            />
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </Button>
          </div>

          <Button onClick={saveSettings} disabled={isSaving} className="flex items-center space-x-2">
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Changes</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="rules">Custom Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Global Settings</span>
              </CardTitle>
              <CardDescription>Master controls for all notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">Turn all notifications on or off</p>
                </div>
                <Switch
                  checked={settings.globalEnabled}
                  onCheckedChange={checked => updateSettings({ globalEnabled: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Sound Notifications</Label>
                  <p className="text-sm text-muted-foreground">Play sound for new notifications</p>
                </div>
                <div className="flex items-center space-x-2">
                  {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <Switch
                    checked={settings.soundEnabled}
                    onCheckedChange={checked => updateSettings({ soundEnabled: checked })}
                    disabled={!settings.globalEnabled}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Vibration (Mobile)</Label>
                  <p className="text-sm text-muted-foreground">Vibrate device for notifications</p>
                </div>
                <Switch
                  checked={settings.vibrationEnabled}
                  onCheckedChange={checked => updateSettings({ vibrationEnabled: checked })}
                  disabled={!settings.globalEnabled}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">Email Digest</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.emailDigest.enabled}
                      onCheckedChange={checked =>
                        updateSettings({
                          emailDigest: { ...settings.emailDigest, enabled: checked },
                        })
                      }
                      disabled={!settings.globalEnabled}
                    />
                    <Label>Enable Email Digest</Label>
                  </div>

                  <Select
                    value={settings.emailDigest.frequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'never') =>
                      updateSettings({
                        emailDigest: { ...settings.emailDigest, frequency: value },
                      })
                    }
                    disabled={!settings.globalEnabled || !settings.emailDigest.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="time"
                    value={settings.emailDigest.time}
                    onChange={e =>
                      updateSettings({
                        emailDigest: { ...settings.emailDigest, time: e.target.value },
                      })
                    }
                    disabled={
                      !settings.globalEnabled ||
                      !settings.emailDigest.enabled ||
                      settings.emailDigest.frequency === 'never'
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          {Object.entries(groupedPreferences).map(([category, preferences]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getCategoryIcon(category)}
                  <span>{category}</span>
                  <Badge variant="outline">{preferences.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {preferences.map(preference => (
                    <div key={preference.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{preference.name}</h4>
                            {getPriorityIcon(preference.priority)}
                            <Badge variant="outline" className="text-xs">
                              {preference.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{preference.description}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Frequency</Label>
                          <Select
                            value={preference.frequency}
                            onValueChange={(value: typeof preference.frequency) =>
                              updatePreference(preference.id, { frequency: value })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="instant">Instant</SelectItem>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="never">Never</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">Priority</Label>
                          <Select
                            value={preference.priority}
                            onValueChange={(value: typeof preference.priority) =>
                              updatePreference(preference.id, { priority: value })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium mb-2 block">Quiet Hours</Label>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={preference.quietHours?.enabled || false}
                              onCheckedChange={checked =>
                                updatePreference(preference.id, {
                                  quietHours: {
                                    ...preference.quietHours,
                                    enabled: checked,
                                    start: preference.quietHours?.start || '22:00',
                                    end: preference.quietHours?.end || '08:00',
                                  },
                                })
                              }
                            />
                            {preference.quietHours?.enabled && (
                              <>
                                <Input
                                  type="time"
                                  value={preference.quietHours.start}
                                  onChange={e =>
                                    updatePreference(preference.id, {
                                      quietHours: {
                                        ...preference.quietHours!,
                                        start: e.target.value,
                                      },
                                    })
                                  }
                                  className="h-8 w-20"
                                />
                                <span className="text-sm text-muted-foreground">to</span>
                                <Input
                                  type="time"
                                  value={preference.quietHours.end}
                                  onChange={e =>
                                    updatePreference(preference.id, {
                                      quietHours: {
                                        ...preference.quietHours!,
                                        end: e.target.value,
                                      },
                                    })
                                  }
                                  className="h-8 w-20"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Choose how you want to receive different types of notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Notification Type</th>
                      <th className="text-center p-2">
                        <div className="flex items-center justify-center space-x-1">
                          <Mail className="w-4 h-4" />
                          <span>Email</span>
                        </div>
                      </th>
                      <th className="text-center p-2">
                        <div className="flex items-center justify-center space-x-1">
                          <Smartphone className="w-4 h-4" />
                          <span>Push</span>
                        </div>
                      </th>
                      <th className="text-center p-2">
                        <div className="flex items-center justify-center space-x-1">
                          <Bell className="w-4 h-4" />
                          <span>In-App</span>
                        </div>
                      </th>
                      <th className="text-center p-2">
                        <div className="flex items-center justify-center space-x-1">
                          <span>SMS</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.preferences.map(preference => (
                      <tr key={preference.id} className="border-b">
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(preference.category)}
                            <div>
                              <div className="font-medium">{preference.name}</div>
                              <div className="text-sm text-muted-foreground">{preference.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <Switch
                            checked={preference.channels.email}
                            onCheckedChange={() => toggleChannel(preference.id, 'email')}
                          />
                        </td>
                        <td className="text-center p-2">
                          <Switch
                            checked={preference.channels.push}
                            onCheckedChange={() => toggleChannel(preference.id, 'push')}
                          />
                        </td>
                        <td className="text-center p-2">
                          <Switch
                            checked={preference.channels.inApp}
                            onCheckedChange={() => toggleChannel(preference.id, 'inApp')}
                          />
                        </td>
                        <td className="text-center p-2">
                          <Switch
                            checked={preference.channels.sms || false}
                            onCheckedChange={() => toggleChannel(preference.id, 'sms')}
                            disabled={preference.category !== 'Security'}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Notification Rules</CardTitle>
              <CardDescription>Create advanced rules for specific notification scenarios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Add New Rule</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Rule Name</Label>
                    <Input
                      value={newCustomRule.name}
                      onChange={e => setNewCustomRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Weekend Movie Alerts"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Conditions</Label>
                    <Textarea
                      value={newCustomRule.conditions}
                      onChange={e => setNewCustomRule(prev => ({ ...prev, conditions: e.target.value }))}
                      placeholder="e.g., genre:action AND rating:>8.0 AND day:weekend"
                      className="h-20"
                    />
                  </div>
                </div>
                <Button
                  onClick={addCustomRule}
                  disabled={!newCustomRule.name || !newCustomRule.conditions}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Rule</span>
                </Button>
              </div>

              {settings.customRules.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Active Rules</h4>
                  {settings.customRules.map(rule => (
                    <div key={rule.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="font-medium">{rule.name}</h5>
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={checked => {
                                setSettings(prev => ({
                                  ...prev,
                                  customRules: prev.customRules.map(r =>
                                    r.id === rule.id ? { ...r, enabled: checked } : r
                                  ),
                                }));
                              }}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                            {rule.conditions}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomRule(rule.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
