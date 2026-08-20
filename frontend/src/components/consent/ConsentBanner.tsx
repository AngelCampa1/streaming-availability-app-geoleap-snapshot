'use client';

/**
 * ConsentBanner - GDPR Cookie Consent UI
 *
 * Displays banner on first visit with consent options:
 * - Accept All (analytics, marketing, functional)
 * - Reject All (only necessary cookies)
 * - Customize (granular consent modal)
 *
 * Persists consent preferences to localStorage
 * Auto-hides after user interaction
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ConsentManager } from '@/lib/analytics/consent-manager';
import { applyGoogleConsentMode } from '@/lib/analytics/google-consent';
import { ConsentState, CONSENT_VERSION } from '@/types/analytics';
import { Button } from '@/components/ui/button';

export function ConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [customConsent, setCustomConsent] = useState<ConsentState>({
    analytics: false,
    marketing: false,
    functional: true, // Functional cookies are essential
    timestamp: new Date(),
    version: CONSENT_VERSION,
  });

  const consentManager = ConsentManager.getInstance();

  useEffect(() => {
    // Check if user has already provided consent
    const consent = consentManager.getConsent();

    // If no current consent decision is stored, show banner.
    if (!consentManager.hasStoredConsent()) {
      setIsVisible(true);
    } else {
      applyGoogleConsentMode(consent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcceptAll = () => {
    consentManager.acceptAll();
    setIsVisible(false);
    setShowCustomize(false);

    applyGoogleConsentMode({ analytics: true, marketing: true });
  };

  const handleRejectAll = () => {
    consentManager.rejectAll();
    setIsVisible(false);
    setShowCustomize(false);

    applyGoogleConsentMode({ analytics: false, marketing: false });
  };

  const handleCustomize = () => {
    setShowCustomize(true);
  };

  const handleSaveCustom = () => {
    consentManager.updateConsent(customConsent);
    setIsVisible(false);
    setShowCustomize(false);

    applyGoogleConsentMode(customConsent);
  };

  const toggleCustomConsent = (category: keyof ConsentState) => {
    if (category === 'timestamp' || category === 'version') return;

    setCustomConsent((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  if (!isVisible) return null;

  return (
    <>
      {showCustomize && <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" aria-hidden="true" />}

      {/* Banner Container */}
      <div
        className={`fixed bottom-0 left-0 right-0 p-4 md:p-6 ${showCustomize ? 'z-50' : 'z-30'}`}
        role={showCustomize ? 'dialog' : 'region'}
        aria-modal={showCustomize ? 'true' : undefined}
        aria-label={showCustomize ? 'Customize cookie preferences' : 'Cookie consent'}
      >
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-border bg-card p-6 shadow-2xl">
            {!showCustomize ? (
              // Main Banner
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    We value your privacy
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We use cookies and similar technologies to improve your experience, analyze site traffic, show ads,
                    and personalize content. By clicking &quot;Accept All&quot;, you consent to our use of cookies.{' '}
                    <a
                      href="/privacy"
                      className="text-primary underline hover:text-primary-hover"
                    >
                      Learn more
                    </a>
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRejectAll}
                    className="min-h-[44px]"
                  >
                    Reject All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCustomize}
                    className="min-h-[44px]"
                  >
                    Customize
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAcceptAll}
                    className="min-h-[44px]"
                  >
                    Accept All
                  </Button>
                </div>
              </div>
            ) : (
              // Customize Modal
              <div className="max-h-[80vh] overflow-y-auto">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Customize Cookie Preferences</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCustomize(false)}
                    className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
                    aria-label="Close cookie preferences"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Analytics Cookies */}
                  <div className="rounded-md border border-border p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customConsent.analytics}
                        onChange={() => toggleCustomConsent('analytics')}
                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">Analytics Cookies</div>
                        <div className="text-sm text-muted-foreground">
                          Help us understand how visitors interact with our website by collecting and reporting
                          information anonymously.
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="rounded-md border border-border p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customConsent.marketing}
                        onChange={() => toggleCustomConsent('marketing')}
                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">Marketing Cookies</div>
                        <div className="text-sm text-muted-foreground">
                          Used by GeoLeap and advertising partners to measure ads, prevent abuse, and display ads that
                          may be personalized based on your activity.
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Functional Cookies (Always On) */}
                  <div className="rounded-md border border-border bg-muted p-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="mt-1 h-4 w-4 rounded border-border text-primary opacity-50"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-foreground">
                          Essential Cookies <span className="text-xs text-muted-foreground">(Always Active)</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Necessary for the website to function properly. These cookies enable core functionality such
                          as security and network management.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCustomize(false)}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveCustom}
                    className="min-h-[44px]"
                  >
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
