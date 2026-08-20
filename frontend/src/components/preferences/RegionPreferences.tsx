'use client';

import React from 'react';

interface RegionPreferences {
  primaryRegion?: string;
  secondaryRegions?: string[];
  timezone?: string;
  currency?: string;
  measurementUnit?: 'metric' | 'imperial';
}

interface RegionPreferencesProps {
  preferences: RegionPreferences;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (key: string, value: any) => void;
  disabled?: boolean;
}

export const RegionPreferences: React.FC<RegionPreferencesProps> = ({ preferences, onUpdate, disabled = false }) => {
  const regions = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IT', name: 'Italy' },
    { code: 'ES', name: 'Spain' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'AT', name: 'Austria' },
    { code: 'SE', name: 'Sweden' },
    { code: 'NO', name: 'Norway' },
    { code: 'DK', name: 'Denmark' },
    { code: 'FI', name: 'Finland' },
    { code: 'IE', name: 'Ireland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' },
    { code: 'AR', name: 'Argentina' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'CN', name: 'China' },
    { code: 'IN', name: 'India' },
    { code: 'SG', name: 'Singapore' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'TH', name: 'Thailand' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'PH', name: 'Philippines' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'EG', name: 'Egypt' },
    { code: 'IL', name: 'Israel' },
    { code: 'TR', name: 'Turkey' },
    { code: 'RU', name: 'Russia' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'PL', name: 'Poland' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'HU', name: 'Hungary' },
    { code: 'RO', name: 'Romania' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'HR', name: 'Croatia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LV', name: 'Latvia' },
    { code: 'EE', name: 'Estonia' },
  ];

  const timezones = [
    'UTC-12:00',
    'UTC-11:00',
    'UTC-10:00',
    'UTC-09:00',
    'UTC-08:00',
    'UTC-07:00',
    'UTC-06:00',
    'UTC-05:00',
    'UTC-04:00',
    'UTC-03:00',
    'UTC-02:00',
    'UTC-01:00',
    'UTC+00:00',
    'UTC+01:00',
    'UTC+02:00',
    'UTC+03:00',
    'UTC+04:00',
    'UTC+05:00',
    'UTC+06:00',
    'UTC+07:00',
    'UTC+08:00',
    'UTC+09:00',
    'UTC+10:00',
    'UTC+11:00',
    'UTC+12:00',
  ];

  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'KRW', name: 'South Korean Won' },
    { code: 'BRL', name: 'Brazilian Real' },
    { code: 'MXN', name: 'Mexican Peso' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'SEK', name: 'Swedish Krona' },
    { code: 'NOK', name: 'Norwegian Krone' },
    { code: 'DKK', name: 'Danish Krone' },
  ];

  return (
    <div data-testid="region-preferences" className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground mb-4">Region & Localization</h3>

        <div className="space-y-4">
          {/* Primary Region */}
          <div>
            <label htmlFor="primary-region" className="block text-sm font-medium text-foreground mb-2">
              Primary Region
            </label>
            <select
              id="primary-region"
              data-testid="primary-region"
              value={preferences.primaryRegion || ''}
              onChange={e => onUpdate('primaryRegion', e.target.value)}
              disabled={disabled}
              className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Region</option>
              {regions.map(region => (
                <option key={region.code} value={region.code}>
                  {region.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Your main region for content availability and pricing</p>
          </div>

          {/* Timezone */}
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-foreground mb-2">
              Timezone
            </label>
            <select
              id="timezone"
              data-testid="timezone"
              value={preferences.timezone || 'UTC+00:00'}
              onChange={e => onUpdate('timezone', e.target.value)}
              disabled={disabled}
              className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-foreground mb-2">
              Preferred Currency
            </label>
            <select
              id="currency"
              data-testid="currency"
              value={preferences.currency || 'USD'}
              onChange={e => onUpdate('currency', e.target.value)}
              disabled={disabled}
              className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currencies.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.name} ({currency.code})
                </option>
              ))}
            </select>
          </div>

          {/* Measurement Unit */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Measurement System</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="metric"
                  data-testid="metric"
                  type="radio"
                  name="measurementUnit"
                  value="metric"
                  checked={preferences.measurementUnit !== 'imperial'}
                  onChange={e => onUpdate('measurementUnit', e.target.value)}
                  disabled={disabled}
                  className="h-4 w-4 text-primary focus:ring-primary border-border disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="metric" className="ml-2 block text-sm text-foreground">
                  Metric (kilometers, celsius, etc.)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="imperial"
                  data-testid="imperial"
                  type="radio"
                  name="measurementUnit"
                  value="imperial"
                  checked={preferences.measurementUnit === 'imperial'}
                  onChange={e => onUpdate('measurementUnit', e.target.value)}
                  disabled={disabled}
                  className="h-4 w-4 text-primary focus:ring-primary border-border disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="imperial" className="ml-2 block text-sm text-foreground">
                  Imperial (miles, fahrenheit, etc.)
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export type { RegionPreferences as RegionPreferencesType };
