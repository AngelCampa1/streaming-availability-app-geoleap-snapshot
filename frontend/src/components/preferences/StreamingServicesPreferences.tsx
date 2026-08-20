'use client';

import React from 'react';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export interface StreamingServicesPreferencesProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferences: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (key: string, value: any) => void;
  isUpdating?: boolean;
}

export function StreamingServicesPreferences({
  preferences,
  onUpdate,
  isUpdating = false,
}: StreamingServicesPreferencesProps) {
  const streamingServices = [
    { id: 'netflix', name: 'Netflix', logoPath: '/logos/streaming/netflix.svg', color: '#E50914' },
    { id: 'amazonPrime', name: 'Amazon Prime Video', logoPath: '/logos/streaming/amazon-prime.svg', color: '#00A8E1' },
    { id: 'disney', name: 'Disney+', logoPath: '/logos/streaming/disney-plus.svg', color: '#113CCF' },
    { id: 'hbo', name: 'HBO Max', logoPath: '/logos/streaming/hbo.svg', color: '#5822B4' },
    { id: 'hulu', name: 'Hulu', logoPath: '/logos/streaming/hulu.svg', color: '#1CE783' },
    { id: 'appleTv', name: 'Apple TV+', logoPath: '/logos/streaming/apple-tv.svg', color: '#000000' },
    { id: 'paramount', name: 'Paramount+', logoPath: '/logos/streaming/paramount-plus.svg', color: '#0064FF' },
    { id: 'peacock', name: 'Peacock', logoPath: '/logos/streaming/peacock.svg', color: '#000000' },
    { id: 'youtube', name: 'YouTube Premium', logoPath: '/logos/streaming/youtube-premium.svg', color: '#FF0000' },
    { id: 'crunchyroll', name: 'Crunchyroll', logoPath: '/logos/streaming/crunchyroll.svg', color: '#FF5E00' },
  ];

  const contentTypes = [
    { id: 'movies', name: 'Movies', icon: '🎬' },
    { id: 'tvShows', name: 'TV Shows', icon: '📺' },
    { id: 'documentaries', name: 'Documentaries', icon: '📖' },
    { id: 'anime', name: 'Anime', icon: '🎌' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'kids', name: 'Kids Content', icon: '👶' },
  ];

  return (
    <div className="space-y-6">
      {/* Active Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Subscriptions</CardTitle>
          <CardDescription>Select the streaming services you currently subscribe to</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {streamingServices.map(service => (
              <div
                key={service.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: service.color }}
                  >
                    <Image
                      src={service.logoPath}
                      alt={`${service.name} logo`}
                      width={18}
                      height={18}
                      className="object-contain brightness-0 invert"
                    />
                  </div>
                  <Label id={`service-label-${service.id}`} className="font-medium">
                    {service.name}
                  </Label>
                </div>
                <Switch
                  aria-labelledby={`service-label-${service.id}`}
                  checked={preferences[`${service.id}Enabled`] ?? false}
                  onCheckedChange={checked => onUpdate(`${service.id}Enabled`, checked)}
                  disabled={isUpdating}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Priority Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Priority</CardTitle>
          <CardDescription>Set the order of preference for search results and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-service">Primary Service</Label>
                <Select
                  value={preferences.primaryService ?? ''}
                  onValueChange={value => onUpdate('primaryService', value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary service" />
                  </SelectTrigger>
                  <SelectContent>
                    {streamingServices.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center"
                            style={{ backgroundColor: service.color }}
                          >
                            <Image
                              src={service.logoPath}
                              alt={`${service.name} logo`}
                              width={12}
                              height={12}
                              className="object-contain brightness-0 invert"
                            />
                          </div>
                          <span>{service.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary-service">Secondary Service</Label>
                <Select
                  value={preferences.secondaryService ?? ''}
                  onValueChange={value => onUpdate('secondaryService', value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select secondary service" />
                  </SelectTrigger>
                  <SelectContent>
                    {streamingServices.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center"
                            style={{ backgroundColor: service.color }}
                          >
                            <Image
                              src={service.logoPath}
                              alt={`${service.name} logo`}
                              width={12}
                              height={12}
                              className="object-contain brightness-0 invert"
                            />
                          </div>
                          <span>{service.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label id="prioritize-subscriptions-label">Prioritize My Subscriptions</Label>
                <Switch
                  aria-labelledby="prioritize-subscriptions-label"
                  checked={preferences.prioritizeSubscriptions ?? true}
                  onCheckedChange={checked => onUpdate('prioritizeSubscriptions', checked)}
                  disabled={isUpdating}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Show content from your subscribed services first in search results
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label id="hide-unsubscribed-label">Hide Unsubscribed Content</Label>
                <Switch
                  aria-labelledby="hide-unsubscribed-label"
                  checked={preferences.hideUnsubscribed ?? false}
                  onCheckedChange={checked => onUpdate('hideUnsubscribed', checked)}
                  disabled={isUpdating}
                />
              </div>
              <p className="text-sm text-muted-foreground">Only show content available on your subscribed services</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Content Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content Preferences</CardTitle>
          <CardDescription>Customize what types of content you want to see</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium mb-3 block">Preferred Content Types</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {contentTypes.map(type => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{type.icon}</span>
                      <Label id={`content-label-${type.id}`} className="font-medium">
                        {type.name}
                      </Label>
                    </div>
                    <Switch
                      aria-labelledby={`content-label-${type.id}`}
                      checked={preferences[`${type.id}Enabled`] ?? true}
                      onCheckedChange={checked => onUpdate(`${type.id}Enabled`, checked)}
                      disabled={isUpdating}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content-rating">Maximum Content Rating</Label>
                <Select
                  value={preferences.maxContentRating ?? 'R'}
                  onValueChange={value => onUpdate('maxContentRating', value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="G">G - General Audiences</SelectItem>
                    <SelectItem value="PG">PG - Parental Guidance</SelectItem>
                    <SelectItem value="PG-13">PG-13 - Parents Strongly Cautioned</SelectItem>
                    <SelectItem value="R">R - Restricted</SelectItem>
                    <SelectItem value="NC-17">NC-17 - Adults Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label id="include-free-label">Include Free Content</Label>
                  <Switch
                    aria-labelledby="include-free-label"
                    checked={preferences.includeFreeContent ?? true}
                    onCheckedChange={checked => onUpdate('includeFreeContent', checked)}
                    disabled={isUpdating}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Show free content available on ad-supported platforms</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label id="include-rentals-label">Include Rentals & Purchases</Label>
                  <Switch
                    aria-labelledby="include-rentals-label"
                    checked={preferences.includeRentals ?? true}
                    onCheckedChange={checked => onUpdate('includeRentals', checked)}
                    disabled={isUpdating}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Show content available for rent or purchase</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Quality & Language Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quality & Language</CardTitle>
          <CardDescription>Set your preferred streaming quality and language options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preferred-quality">Preferred Video Quality</Label>
                <Select
                  value={preferences.preferredQuality ?? 'HD'}
                  onValueChange={value => onUpdate('preferredQuality', value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SD">SD - Standard Definition</SelectItem>
                    <SelectItem value="HD">HD - High Definition</SelectItem>
                    <SelectItem value="4K">4K - Ultra High Definition</SelectItem>
                    <SelectItem value="HDR">HDR - High Dynamic Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio-language">Preferred Audio Language</Label>
                <Select
                  value={preferences.audioLanguage ?? 'English'}
                  onValueChange={value => onUpdate('audioLanguage', value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Japanese">Japanese</SelectItem>
                    <SelectItem value="Korean">Korean</SelectItem>
                    <SelectItem value="Portuguese">Portuguese</SelectItem>
                    <SelectItem value="Italian">Italian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subtitle-language">Subtitle Language</Label>
                <Select
                  value={preferences.subtitleLanguage ?? 'English'}
                  onValueChange={value => onUpdate('subtitleLanguage', value)}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Japanese">Japanese</SelectItem>
                    <SelectItem value="Korean">Korean</SelectItem>
                    <SelectItem value="Portuguese">Portuguese</SelectItem>
                    <SelectItem value="Italian">Italian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label id="auto-subtitles-label">Auto-Enable Subtitles</Label>
                  <Switch
                    aria-labelledby="auto-subtitles-label"
                    checked={preferences.autoSubtitles ?? false}
                    onCheckedChange={checked => onUpdate('autoSubtitles', checked)}
                    disabled={isUpdating}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Automatically show subtitles when available</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isUpdating && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
          <span className="text-sm text-muted-foreground">Updating preferences...</span>
        </div>
      )}
    </div>
  );
}
