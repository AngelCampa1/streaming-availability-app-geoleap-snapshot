'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export interface PreferenceCategorySectionProps {
  category: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (key: string, value: any) => void;
  onReset: () => void;
  isUpdating?: boolean;
  isResetting?: boolean;
}

export function PreferenceCategorySection({
  category,
  preferences,
  onUpdate,
  onReset,
  isUpdating = false,
  isResetting = false,
}: PreferenceCategorySectionProps) {
  const formatKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderPreferenceControl = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return (
        <div className="flex items-center justify-between">
          <Label htmlFor={`${category}-${key}`} className="font-medium">
            {formatKey(key)}
          </Label>
          <Switch checked={value} onCheckedChange={checked => onUpdate(key, checked)} disabled={isUpdating} />
        </div>
      );
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return (
        <div className="space-y-1">
          <Label htmlFor={`${category}-${key}`} className="font-medium">
            {formatKey(key)}
          </Label>
          <div className="px-3 py-2 bg-muted rounded-md text-sm">{value.toString()}</div>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          <Label className="font-medium">{formatKey(key)}</Label>
          <div className="flex flex-wrap gap-1">
            {value.map((item, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {item.toString()}
              </Badge>
            ))}
          </div>
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <div className="space-y-1">
          <Label className="font-medium">{formatKey(key)}</Label>
          <div className="px-3 py-2 bg-muted rounded-md text-sm">
            <pre className="text-xs overflow-auto">{JSON.stringify(value, null, 2)}</pre>
          </div>
        </div>
      );
    }

    return null;
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      streaming: '🎬',
      notifications: '🔔',
      viewing: '👁️',
      interface: '🎨',
      privacy: '🔒',
      geographic: '🌍',
      search: '🔍',
      general: '⚙️',
      account: '👤',
      security: '🛡️',
    };
    return icons[category.toLowerCase()] || '📋';
  };

  const getCategoryDescription = (category: string): string => {
    const descriptions: Record<string, string> = {
      streaming: 'Streaming service preferences and viewing options',
      notifications: 'Notification settings and delivery preferences',
      viewing: 'Content viewing and discovery preferences',
      interface: 'User interface theme and layout settings',
      privacy: 'Privacy and data sharing preferences',
      geographic: 'Location and regional content settings',
      search: 'Search behavior and result filtering',
      general: 'General application preferences',
      account: 'Account management and profile settings',
      security: 'Security and authentication settings',
    };
    return descriptions[category.toLowerCase()] || 'Category preferences and settings';
  };

  const preferenceEntries = Object.entries(preferences);

  if (preferenceEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{getCategoryIcon(category)}</span>
            {formatKey(category)}
          </CardTitle>
          <CardDescription>{getCategoryDescription(category)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No preferences configured for this category.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>{getCategoryIcon(category)}</span>
              {formatKey(category)}
              {(isUpdating || isResetting) && (
                <Badge variant="secondary" className="text-xs">
                  {isResetting ? 'Resetting...' : 'Updating...'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{getCategoryDescription(category)}</CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isResetting || isUpdating}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset {formatKey(category)} Preferences</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will reset all preferences in the {formatKey(category)} category to their default values.
                  This cannot be undone. Are you sure you want to continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onReset}>Reset Category</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {preferenceEntries.map(([key, value], index) => (
            <div key={key}>
              {renderPreferenceControl(key, value)}
              {index < preferenceEntries.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
