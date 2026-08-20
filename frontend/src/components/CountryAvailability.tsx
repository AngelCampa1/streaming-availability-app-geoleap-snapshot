'use client';

import { ShowStreamingDetails, CountryStreamingInfo } from '@/types/streaming';
import { getCountryName } from '@/lib/utils/countryNames';

interface CountryAvailabilityProps {
  details: ShowStreamingDetails;
  userCountry?: string;
}

export function CountryAvailability({ details, userCountry }: CountryAvailabilityProps) {
  const countries = Object.entries(details.availabilityByCountry);

  // Separate countries with and without user subscriptions
  const countriesWithSubs = countries.filter(([_, country]) => country.hasUserSubscriptions);
  const countriesWithoutSubs = countries.filter(([_, country]) => !country.hasUserSubscriptions);

  const renderCountryCard = ([countryCode, country]: [string, CountryStreamingInfo]) => {
    const isUserCountry = countryCode.toLowerCase() === userCountry?.toLowerCase();

    return (
      <div
        key={countryCode}
        className={`border rounded-lg p-4 transition-all ${
          country.hasUserSubscriptions
            ? 'border-success/30 bg-success/10'
            : 'border-border bg-background hover:border-border/80'
        }`}
      >
        {/* Country Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getCountryFlag(countryCode)}</span>
            <div>
              <h3 className="font-semibold text-foreground">{getCountryName(countryCode, country.countryName)}</h3>
              {isUserCountry && <span className="text-xs text-primary font-medium">Your Location</span>}
            </div>
          </div>
          {country.hasUserSubscriptions && (
            <div className="bg-success text-success-foreground text-xs px-2 py-1 rounded-full font-medium">
              ✓ Your Service{country.userServicesCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Services */}
        <div className="space-y-2">
          {country.services.map((service, idx) => (
            <div
              key={idx}
              className={`p-2 rounded ${
                service.isUserSubscription ? 'bg-background border border-success/30' : 'bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={service.isUserSubscription ? 'font-semibold text-foreground' : 'text-foreground'}>{service.serviceName}</span>
                  {service.isUserSubscription && <span className="text-success text-sm">★</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground capitalize">{service.type}</span>
                  {service.quality && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{service.quality}</span>}
                </div>
              </div>
              {/* Language Information */}
              {(service.audioLanguages?.length > 0 || service.subtitleLanguages?.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {service.audioLanguages?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">🔊</span>
                      <span className="text-foreground">{service.audioLanguages.slice(0, 3).join(', ')}</span>
                      {service.audioLanguages.length > 3 && (
                        <span className="text-muted-foreground">+{service.audioLanguages.length - 3}</span>
                      )}
                    </div>
                  )}
                  {service.subtitleLanguages?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">📝</span>
                      <span className="text-foreground">{service.subtitleLanguages.slice(0, 3).join(', ')}</span>
                      {service.subtitleLanguages.length > 3 && (
                        <span className="text-muted-foreground">+{service.subtitleLanguages.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Watch Now Link */}
        {country.services.length > 0 && country.services[0].url && (
          <a
            href={country.services[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-center text-sm text-primary hover:text-primary/80 font-medium"
          >
            View on {country.services[0].serviceName} →
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/20 rounded-lg p-6 border border-primary/30">
        <h2 className="text-2xl font-bold text-foreground mb-4">{details.title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{details.totalCountries}</div>
            <div className="text-sm text-muted-foreground">Countries Available</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-success">{details.countriesWithUserSubscriptions}</div>
            <div className="text-sm text-muted-foreground">With Your Services</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{details.userServicesWithContent.length}</div>
            <div className="text-sm text-muted-foreground">Your Services Have It</div>
          </div>
        </div>

        {details.userServicesWithContent.length > 0 && (
          <div className="mt-4 p-3 bg-background rounded-lg border border-success/30">
            <p className="text-sm text-foreground">
              <span className="font-semibold text-success">Available on your services:</span>{' '}
              {details.userServicesWithContent.join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Countries with User Subscriptions */}
      {countriesWithSubs.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="text-success">★</span>
            Available with Your Subscriptions ({countriesWithSubs.length})
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your VPN to these countries to watch with your existing subscriptions:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {countriesWithSubs.map(renderCountryCard)}
          </div>
        </div>
      )}

      {/* Countries without User Subscriptions */}
      {countriesWithoutSubs.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4">Other Countries ({countriesWithoutSubs.length})</h3>
          <p className="text-sm text-muted-foreground mb-4">Available in these countries (requires subscription or rental):</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {countriesWithoutSubs.map(renderCountryCard)}
          </div>
        </div>
      )}

      {/* No Availability */}
      {countries.length === 0 && (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground">No streaming availability information found for this title.</p>
        </div>
      )}
    </div>
  );
}

// Helper function to get country flag emoji
function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
