'use client';

import * as React from 'react';
import Script from 'next/script';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  FeedbackCategory,
  FeedbackCategoryLabels,
  submitFeedback,
} from '@/lib/feedback';
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [category, setCategory] = React.useState<FeedbackCategory>(FeedbackCategory.General);
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = React.useState(STATIC_TURNSTILE_SITE_KEY ?? '');
  const [turnstileToken, setTurnstileToken] = React.useState('');
  const turnstileWidgetId = React.useRef<string | null>(null);
  const turnstileId = React.useId().replace(/:/g, '');

  const characterCount = message.length;
  const maxCharacters = 2000;
  const minCharacters = 10;
  const isMessageValid = characterCount >= minCharacters && characterCount <= maxCharacters;

  const resetForm = () => {
    setSubject('');
    setMessage('');
    setCategory(FeedbackCategory.General);
    setEmail('');
    setTurnstileToken('');
    setSubmitStatus('idle');
    setErrorMessage('');
  };

  React.useEffect(() => {
    if (STATIC_TURNSTILE_SITE_KEY || !open) {
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
  }, [open]);

  React.useEffect(() => {
    if (!open || !turnstileSiteKey || turnstileWidgetId.current || !window.turnstile) {
      return;
    }

    const widgetId = window.turnstile.render(`#feedback-turnstile-${turnstileId}`, {
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
  }, [open, turnstileId, turnstileSiteKey]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isMessageValid) {
      setErrorMessage(`Message must be between ${minCharacters} and ${maxCharacters} characters.`);
      setSubmitStatus('error');
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      return;
    }

    const form = e.currentTarget || (e.target as HTMLFormElement);
    const companyWebsite = (form.elements.namedItem('companyWebsite') as HTMLInputElement | null)?.value ?? '';

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await submitFeedback({
        message,
        subject: subject || undefined,
        category,
        email: email || undefined,
        platform: 'Web',
        turnstileToken,
        companyWebsite,
      });

      if (response.success) {
        setSubmitStatus('success');
        // Close dialog after showing success briefly
        setTimeout(() => {
          onOpenChange(false);
          resetForm();
        }, 2000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(response.message);
      }
    } catch {
      setSubmitStatus('error');
      setErrorMessage('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {turnstileSiteKey && (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            onLoad={() => {
              if (open && !turnstileWidgetId.current && window.turnstile) {
                const widgetId = window.turnstile.render(`#feedback-turnstile-${turnstileId}`, {
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
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            We value your feedback! Let us know how we can improve.
          </DialogDescription>
        </DialogHeader>

        {submitStatus === 'success' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-success mb-4" />
            <h3 className="text-lg font-semibold">Thank you!</h3>
            <p className="text-muted-foreground">Your feedback has been submitted successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(parseInt(e.target.value) as FeedbackCategory)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {Object.entries(FeedbackCategoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject (optional) */}
            <div className="space-y-2">
              <label htmlFor="subject" className="text-sm font-medium">
                Subject <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your feedback"
                maxLength={100}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                Message <span className="text-destructive">*</span>
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                rows={5}
                maxLength={maxCharacters}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {characterCount < minCharacters && (
                    <span className="text-amber-500">
                      {minCharacters - characterCount} more characters needed
                    </span>
                  )}
                </span>
                <span className={characterCount > maxCharacters ? 'text-destructive' : ''}>
                  {characterCount}/{maxCharacters}
                </span>
              </div>
            </div>

            {/* Email (optional) */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-muted-foreground">(optional, for follow-up)</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <input
              type="text"
              name="companyWebsite"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-10000px] h-px w-px opacity-0"
            />

            {turnstileSiteKey && <div id={`feedback-turnstile-${turnstileId}`} />}

            {/* Error message */}
            {submitStatus === 'error' && errorMessage && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errorMessage}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isMessageValid || Boolean(turnstileSiteKey && !turnstileToken)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Feedback
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
