// Share Dialog for Watchlist

'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import { WatchlistShare } from '@/types/watchlist';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Share2,
  Copy,
  Link,
  Mail,
  MessageCircle,
  Facebook,
  Twitter,
  Globe,
  Lock,
  Users,
  Settings,
  Check,
  QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import watchlistApi from '@/services/watchlistApi';

interface WatchlistShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: string[];
}

export const WatchlistShareDialog: React.FC<WatchlistShareDialogProps> = ({ open, onOpenChange, selectedItems }) => {
  const [shareSettings, setShareSettings] = useState<Partial<WatchlistShare>>({
    shareType: 'private',
    allowComments: false,
    allowSuggestions: false,
    expiryDate: undefined,
  });
  const [shareUrl, setShareUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('create');

  // Handle share setting change
  const handleSettingChange = (key: keyof WatchlistShare, value: any) => {
    setShareSettings(prev => ({ ...prev, [key]: value }));
  };

  // Create share link
  const handleCreateShare = async () => {
    try {
      setIsCreating(true);

      const response = await watchlistApi.createShare('default', shareSettings);
      if (response.success) {
        setShareUrl(response.data.shareUrl);
        setActiveTab('share');
      }
    } catch (error) {
      console.error('Failed to create share:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Social share options
  const socialOptions = [
    {
      name: 'Email',
      icon: Mail,
      action: () => {
        const subject = encodeURIComponent('Check out my watchlist!');
        const body = encodeURIComponent(`I wanted to share my watchlist with you: ${shareUrl}`);
        window.open(`mailto:?subject=${subject}&body=${body}`);
      },
    },
    {
      name: 'Twitter',
      icon: Twitter,
      action: () => {
        const text = encodeURIComponent('Check out my watchlist!');
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`);
      },
    },
    {
      name: 'Facebook',
      icon: Facebook,
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
      },
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      action: () => {
        const text = encodeURIComponent(`Check out my watchlist: ${shareUrl}`);
        window.open(`https://wa.me/?text=${text}`);
      },
    },
  ];

  // Privacy options
  const privacyOptions = [
    {
      value: 'public',
      label: 'Public',
      description: 'Anyone with the link can view',
      icon: Globe,
    },
    {
      value: 'private',
      label: 'Private',
      description: 'Only you can view',
      icon: Lock,
    },
    {
      value: 'friends',
      label: 'Friends Only',
      description: 'Only your friends can view',
      icon: Users,
    },
  ];

  // Get expiry options
  const expiryOptions = [
    { label: 'Never', value: null },
    { label: '1 Day', value: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    { label: '1 Week', value: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { label: '1 Month', value: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    { label: '1 Year', value: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Watchlist
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Configure</TabsTrigger>
            <TabsTrigger value="share" disabled={!shareUrl}>
              Share
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="create" className="space-y-6">
            {/* What to Share */}
            <div>
              <h3 className="text-sm font-semibold mb-3">What to Share</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {selectedItems.length > 0 ? 'Selected Items' : 'Full Watchlist'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedItems.length > 0
                          ? `${selectedItems.length} selected items will be shared`
                          : 'Your entire watchlist will be shared'}
                      </div>
                    </div>
                    <Badge variant="secondary">{selectedItems.length > 0 ? selectedItems.length : 'All'}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Privacy Settings */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Privacy & Access</h3>
              <div className="space-y-3">
                {privacyOptions.map(option => {
                  const Icon = option.icon;
                  const isSelected = shareSettings.shareType === option.value;

                  return (
                    <Card
                      key={option.value}
                      className={cn('cursor-pointer transition-colors', isSelected && 'border-primary bg-primary/5')}
                      onClick={() => handleSettingChange('shareType', option.value)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'p-2 rounded-md',
                              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">{option.description}</div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Additional Options */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Additional Options</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Allow Comments</div>
                    <div className="text-sm text-muted-foreground">Let viewers leave comments on your watchlist</div>
                  </div>
                  <Switch
                    checked={shareSettings.allowComments || false}
                    onCheckedChange={checked => handleSettingChange('allowComments', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Allow Suggestions</div>
                    <div className="text-sm text-muted-foreground">
                      Let viewers suggest new items for your watchlist
                    </div>
                  </div>
                  <Switch
                    checked={shareSettings.allowSuggestions || false}
                    onCheckedChange={checked => handleSettingChange('allowSuggestions', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Expiry Settings */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Link Expiry</h3>
              <Select
                value={shareSettings.expiryDate ? 'custom' : 'never'}
                onValueChange={value => {
                  if (value === 'never') {
                    handleSettingChange('expiryDate', undefined);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expiry" />
                </SelectTrigger>
                <SelectContent>
                  {expiryOptions.map((option, index) => (
                    <SelectItem key={index} value={option.value ? 'custom' : 'never'}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Create Button */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateShare} disabled={isCreating} className="flex-1">
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Create Share Link
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </TabsContent>

          {/* Share Tab */}
          <TabsContent value="share" className="space-y-6">
            {/* Share Link */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Share Link</h3>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="flex-1" />
                <Button variant="outline" onClick={() => handleCopy(shareUrl)} className="flex-shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {shareSettings.shareType === 'public'
                  ? 'Anyone with this link can view your watchlist'
                  : 'Only authorized users can view this watchlist'}
              </div>
            </div>

            {/* Social Sharing */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Share on Social Media</h3>
              <div className="grid grid-cols-2 gap-2">
                {socialOptions.map(social => {
                  const Icon = social.icon;
                  return (
                    <Button key={social.name} variant="outline" onClick={social.action} className="justify-start">
                      <Icon className="h-4 w-4 mr-2" />
                      {social.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* QR Code */}
            <div>
              <h3 className="text-sm font-semibold mb-3">QR Code</h3>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="w-32 h-32 bg-muted mx-auto rounded-lg flex items-center justify-center mb-3">
                    <QrCode className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-sm text-muted-foreground">QR code for easy mobile sharing</div>
                  <Button variant="outline" size="sm" className="mt-2">
                    Download QR Code
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Share Stats */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Share Statistics</h3>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-semibold">0</div>
                    <div className="text-xs text-muted-foreground">Views</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-semibold">0</div>
                    <div className="text-xs text-muted-foreground">Comments</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-lg font-semibold">0</div>
                    <div className="text-xs text-muted-foreground">Suggestions</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Management Options */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Settings className="h-4 w-4 mr-2" />
                Manage Shares
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
