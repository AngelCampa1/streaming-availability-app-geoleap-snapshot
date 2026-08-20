'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { RegionPreference } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

// Popular VPN server locations and streaming regions
const POPULAR_REGIONS = [
  { code: 'US', name: 'United States', flag: '🇺🇸', isPopularVPN: true },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', isPopularVPN: true },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', isPopularVPN: true },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', isPopularVPN: true },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', isPopularVPN: true },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', isPopularVPN: true },
  { code: 'FR', name: 'France', flag: '🇫🇷', isPopularVPN: true },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', isPopularVPN: true },
];

const OTHER_REGIONS = [
  { code: 'ES', name: 'Spain', flag: '🇪🇸', isPopularVPN: false },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', isPopularVPN: false },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', isPopularVPN: false },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', isPopularVPN: false },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', isPopularVPN: false },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', isPopularVPN: false },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', isPopularVPN: false },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', isPopularVPN: false },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', isPopularVPN: false },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', isPopularVPN: false },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', isPopularVPN: false },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', isPopularVPN: false },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', isPopularVPN: false },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', isPopularVPN: false },
  { code: 'IN', name: 'India', flag: '🇮🇳', isPopularVPN: false },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', isPopularVPN: false },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', isPopularVPN: false },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', isPopularVPN: false },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', isPopularVPN: false },
];

export function RegionPreferencesStep() {
  const { status, updateStep, addRegionPreferences, trackAnalyticsEvent, isLoading } = useOnboarding();

  const [selectedRegions, setSelectedRegions] = useState<RegionPreference[]>([]);
  const [primaryRegion, setPrimaryRegion] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    // Initialize with existing preferences if any
    if (status?.regionPreferences) {
      setSelectedRegions(status.regionPreferences);
      const primary = status.regionPreferences.find(pref => pref.isPrimary);
      if (primary) {
        setPrimaryRegion(primary.countryCode);
      }
    }
  }, [status?.regionPreferences]);

  const allRegions = [...POPULAR_REGIONS, ...OTHER_REGIONS];

  const filteredRegions = allRegions.filter(
    region =>
      region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      region.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedRegions = showAll
    ? filteredRegions
    : POPULAR_REGIONS.filter(
        region =>
          region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          region.code.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const toggleRegion = (countryCode: string) => {
    setSelectedRegions(prev => {
      const existing = prev.find(pref => pref.countryCode === countryCode);
      if (existing) {
        return prev.filter(pref => pref.countryCode !== countryCode);
      } else {
        return [
          ...prev,
          {
            countryCode,
            isPrimary: false,
            priority: prev.length + 1,
          },
        ];
      }
    });
  };

  const setPrimary = (countryCode: string) => {
    setPrimaryRegion(countryCode);
    setSelectedRegions(prev =>
      prev.map(pref => ({
        ...pref,
        isPrimary: pref.countryCode === countryCode,
      }))
    );

    // Add to selection if not already selected
    if (!selectedRegions.some(pref => pref.countryCode === countryCode)) {
      setSelectedRegions(prev => [
        ...prev,
        {
          countryCode,
          isPrimary: true,
          priority: 1,
        },
      ]);
    }
  };

  const handleContinue = async () => {
    if (selectedRegions.length > 0) {
      await addRegionPreferences(selectedRegions);
    }
    await trackAnalyticsEvent('step_completed', 3, {
      regions_selected: selectedRegions.length,
      primary_region: primaryRegion,
      regions: selectedRegions.map(r => r.countryCode),
    });
    await updateStep(4);
  };

  const handleSkipStep = async () => {
    await trackAnalyticsEvent('step_skipped', 3);
    await updateStep(4);
  };

  const RegionButton = ({
    region,
    isPopularVPN = false,
  }: {
    region: (typeof POPULAR_REGIONS)[0];
    isPopularVPN?: boolean;
  }) => {
    const isSelected = selectedRegions.some(pref => pref.countryCode === region.code);
    const isPrimary = primaryRegion === region.code;

    return (
      <button
        onClick={() => toggleRegion(region.code)}
        className={cn(
          'relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 min-h-[100px] text-sm font-medium',
          isSelected
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-muted text-foreground'
        )}
      >
        <div className="text-3xl mb-2">{region.flag}</div>
        <div className="text-center">
          <div className="font-medium">{region.name}</div>
          <div className="text-xs text-foreground-muted">{region.code}</div>
          {isPopularVPN && (
            <Badge variant="secondary" className="mt-1 text-xs">
              Popular VPN
            </Badge>
          )}
        </div>

        {isSelected && (
          <>
            <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {!isPrimary && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setPrimary(region.code);
                }}
                className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full"
              >
                Set Primary
              </button>
            )}
            {isPrimary && (
              <Badge className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs">Primary</Badge>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Choose Your Regions</CardTitle>
        <CardDescription>
          Select countries where you frequently access streaming content. Set one as your primary location.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search */}
        <div>
          <Input
            placeholder="Search countries..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Popular VPN Locations */}
        {!searchTerm && !showAll && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Popular VPN Locations</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {POPULAR_REGIONS.map(region => (
                <RegionButton key={region.code} region={region} isPopularVPN={region.isPopularVPN} />
              ))}
            </div>
          </div>
        )}

        {/* All Regions */}
        {(searchTerm || showAll) && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {searchTerm ? 'Search Results' : 'All Regions'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayedRegions.map(region => (
                <RegionButton key={region.code} region={region} isPopularVPN={region.isPopularVPN} />
              ))}
            </div>
          </div>
        )}

        {/* Show More Button */}
        {!searchTerm && !showAll && (
          <div className="text-center">
            <Button variant="outline" onClick={() => setShowAll(true)}>
              Show all regions
            </Button>
          </div>
        )}

        {/* Selection Summary */}
        {selectedRegions.length > 0 && (
          <div className="bg-surface-muted p-4 rounded-lg">
            <p className="text-sm text-foreground-muted mb-2">Selected regions ({selectedRegions.length}):</p>
            <div className="flex flex-wrap gap-2">
              {selectedRegions.map(pref => {
                const region = allRegions.find(r => r.code === pref.countryCode);
                return (
                  <Badge key={pref.countryCode} variant={pref.isPrimary ? 'default' : 'secondary'}>
                    {region?.flag} {region?.name} {pref.isPrimary && '(Primary)'}
                  </Badge>
                );
              })}
            </div>
            {selectedRegions.length > 0 && !primaryRegion && (
              <p className="text-sm text-warning mt-2">
                Tip: Set one region as primary for better personalized results
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <Button variant="ghost" onClick={handleSkipStep} disabled={isLoading} className="order-2 sm:order-1">
            Skip this step
          </Button>
          <div className="flex-1"></div>
          <Button onClick={handleContinue} disabled={isLoading} className="order-1 sm:order-2">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              `Continue${selectedRegions.length > 0 ? ` with ${selectedRegions.length} region${selectedRegions.length !== 1 ? 's' : ''}` : ''}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
