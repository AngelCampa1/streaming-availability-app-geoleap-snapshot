import { useState, useEffect } from 'react';

export interface UserCountryData {
  countryCode: string;
  countryName: string;
  isDetected: boolean;
}

const STORAGE_KEY = 'user_country_data';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedCountryData extends UserCountryData {
  timestamp: number;
}

/**
 * Hook to detect user's country via IP geolocation
 * Uses ipapi.co free tier (up to 1,000 requests/day)
 * Caches result in localStorage for 24 hours
 */
export function useUserCountry() {
  const [country, setCountry] = useState<UserCountryData>({
    countryCode: 'us',
    countryName: 'United States',
    isDetected: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const detectUserCountry = async () => {
      try {
        // Check localStorage cache first
        const cachedData = localStorage.getItem(STORAGE_KEY);
        if (cachedData) {
          try {
            const parsed: CachedCountryData = JSON.parse(cachedData);
            const isCacheValid = Date.now() - parsed.timestamp < CACHE_DURATION;

            if (isCacheValid) {
              setCountry({
                countryCode: parsed.countryCode,
                countryName: parsed.countryName,
                isDetected: parsed.isDetected,
              });
              setLoading(false);
              return;
            }
          } catch (parseError) {
            // Corrupted cache - remove it and continue to API fetch
            console.warn('Corrupted country cache, fetching fresh data:', parseError);
            localStorage.removeItem(STORAGE_KEY);
          }
        }

        // Fetch from IP geolocation API
        const response = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (!response.ok) {
          throw new Error('Failed to detect country');
        }

        const data = await response.json();

        const countryData: UserCountryData = {
          countryCode: (data.country_code || 'us').toLowerCase(),
          countryName: data.country_name || 'United States',
          isDetected: true,
        };

        // Cache the result
        const cacheData: CachedCountryData = {
          ...countryData,
          timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));

        setCountry(countryData);
      } catch (err) {
        console.warn('Country detection failed, using default (US):', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));

        // Use fallback country (US)
        const fallbackData: UserCountryData = {
          countryCode: 'us',
          countryName: 'United States',
          isDetected: false,
        };
        setCountry(fallbackData);

        // Cache fallback
        const cacheData: CachedCountryData = {
          ...fallbackData,
          timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
      } finally {
        setLoading(false);
      }
    };

    detectUserCountry();
  }, []);

  const clearCache = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    country,
    loading,
    error,
    clearCache,
  };
}
