'use client';

import Script from 'next/script';
import { useState, useEffect, useId, useRef } from 'react';
import { Mail, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const DISMISS_KEY = 'email_capture_dismissed';
const EMAIL_KEY = 'email_capture_email';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STATIC_TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function EmailCapture() {
  const { user, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(STATIC_TURNSTILE_SITE_KEY ?? '');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileId = useId().replace(/:/g, '');

  useEffect(() => {
    if (isAuthenticated || user) {
      setShouldShow(false);
      return;
    }

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < DISMISS_DURATION_MS) {
        setShouldShow(false);
        return;
      }
    }

    const alreadyCaptured = localStorage.getItem(EMAIL_KEY);
    if (alreadyCaptured) {
      setShouldShow(false);
      return;
    }

    setShouldShow(true);
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (STATIC_TURNSTILE_SITE_KEY || !shouldShow) {
      return;
    }

    let cancelled = false;

    fetch('/api/public-config', { cache: 'no-store' })
      .then(response => (response.ok ? response.json() : null))
      .then((config: { turnstileSiteKey?: string } | null) => {
        if (!cancelled && config?.turnstileSiteKey) {
          setTurnstileSiteKey(config.turnstileSiteKey);
        }
      })
      .catch(() => {
        // Production remains protected by the backend fail-closed verifier.
      });

    return () => {
      cancelled = true;
    };
  }, [shouldShow]);

  useEffect(() => {
    if (!shouldShow || !turnstileSiteKey || turnstileWidgetId.current || !window.turnstile) {
      return;
    }

    const widgetId = window.turnstile.render(`#turnstile-${turnstileId}`, {
      sitekey: turnstileSiteKey,
      callback: setTurnstileToken,
      'expired-callback': () => setTurnstileToken(''),
      'error-callback': () => setTurnstileToken(''),
    });
    turnstileWidgetId.current = widgetId;

    return () => {
      if (turnstileWidgetId.current) {
        window.turnstile?.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, [shouldShow, turnstileId, turnstileSiteKey]);

  if (!shouldShow || dismissed) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    if (turnstileSiteKey && !turnstileToken) return;
    const form = e.currentTarget || (e.target as HTMLFormElement);
    const companyWebsite = (form.elements.namedItem('companyWebsite') as HTMLInputElement | null)?.value ?? '';

    try {
      await fetch('/api/leads/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'email_capture',
          turnstileToken,
          companyWebsite,
        }),
      });
    } catch {
      // Backend unavailable - localStorage still records the capture.
    }

    localStorage.setItem(EMAIL_KEY, email);
    setSubmitted(true);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-success/20 bg-success/5 px-4 py-3 my-8">
        <div className="flex items-center justify-center gap-2 text-success">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Thanks! We&apos;ll keep you updated.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card px-4 py-4 my-8">
      {turnstileSiteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => {
            if (!turnstileWidgetId.current && window.turnstile) {
              const widgetId = window.turnstile.render(`#turnstile-${turnstileId}`, {
                sitekey: turnstileSiteKey,
                callback: setTurnstileToken,
                'expired-callback': () => setTurnstileToken(''),
                'error-callback': () => setTurnstileToken(''),
              });
              turnstileWidgetId.current = widgetId;
            }
          }}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <Mail className="h-4 w-4 shrink-0 text-primary" />
          <span>Get weekly streaming updates - new platforms, price changes, and availability alerts.</span>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1 text-foreground-muted hover:text-foreground transition-colors"
          aria-label="Dismiss email capture"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <label className="sr-only" htmlFor={`lead-email-${turnstileId}`}>
          Email address
        </label>
        <input
          id={`lead-email-${turnstileId}`}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Your email address"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          required
        />
        <input
          type="text"
          name="companyWebsite"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-10000px] h-px w-px opacity-0"
        />
        <div className="flex flex-col gap-2 sm:items-end">
          {turnstileSiteKey && <div id={`turnstile-${turnstileId}`} />}
          <Button
            type="submit"
            size="sm"
            className="whitespace-nowrap"
            disabled={Boolean(turnstileSiteKey && !turnstileToken)}
          >
            Get Updates
          </Button>
        </div>
      </form>
    </div>
  );
}

export default EmailCapture;
