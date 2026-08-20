'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorPageProps {
  title?: string;
  message?: string;
  errorCode?: string;
  correlationId?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onContactSupport?: () => void;
  className?: string;
  children?: React.ReactNode;
}

// 404 Not Found Page
export function NotFoundPage({
  title = 'Page Not Found',
  message = "Sorry, we couldn't find the page you're looking for.",
  onGoHome = () => (window.location.href = '/'),
  className,
}: ErrorPageProps) {
  return (
    <ErrorPageLayout className={className}>
      <div className="text-center">
        {/* 404 Visual */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-muted-foreground/40 mb-4">404</div>
          <svg
            className="w-24 h-24 mx-auto text-muted-foreground/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-3-8a6 6 0 016 6v1a7 7 0 11-14 0v-1a6 6 0 016-6z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-4">{title}</h1>

        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">{message}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={onGoHome} size="lg">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Go to Homepage
          </Button>

          <Button variant="outline" onClick={() => window.history.back()} size="lg">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </Button>
        </div>

        <div className="mt-12 text-sm text-muted-foreground">
          <p>Looking for something specific?</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <a href="/search" className="hover:text-primary transition-colors">
              Search
            </a>
            <a href="/pricing" className="hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="/dashboard" className="hover:text-primary transition-colors">
              Dashboard
            </a>
            <a href="/settings" className="hover:text-primary transition-colors">
              Settings
            </a>
          </div>
        </div>
      </div>
    </ErrorPageLayout>
  );
}

// 500 Internal Server Error Page
export function InternalServerErrorPage({
  title = 'Something went wrong',
  message = "We're experiencing some technical difficulties. Our team has been notified and is working on a fix.",
  correlationId,
  onRetry = () => window.location.reload(),
  onGoHome = () => (window.location.href = '/'),
  onContactSupport = () =>
    window.open('mailto:hello@example.com?subject=Error Report&body=Error ID: ' + (correlationId || 'Unknown')),
  className,
}: ErrorPageProps) {
  return (
    <ErrorPageLayout className={className}>
      <div className="text-center">
        <div className="mb-8">
          <svg
            className="w-24 h-24 mx-auto text-destructive/60 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-4">{title}</h1>

        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">{message}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={onRetry} size="lg">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </Button>

          <Button variant="outline" onClick={onGoHome} size="lg">
            Go to Homepage
          </Button>

          <Button variant="outline" onClick={onContactSupport} size="lg">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Get Help
          </Button>
        </div>

        {correlationId && (
          <div className="mt-8 p-4 bg-card border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">If you contact support, please provide this error ID:</p>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded text-muted-foreground">{correlationId}</code>
          </div>
        )}
      </div>
    </ErrorPageLayout>
  );
}

// 503 Service Unavailable / Maintenance Page
export function MaintenancePage({
  title = "We'll be back soon!",
  message = "We're performing some scheduled maintenance. We'll be back online shortly.",
  estimatedTime,
  onCheckStatus,
  className,
}: ErrorPageProps & { estimatedTime?: string; onCheckStatus?: () => void }) {
  return (
    <ErrorPageLayout className={className}>
      <div className="text-center">
        <div className="mb-8">
          <svg className="w-24 h-24 mx-auto text-primary/60 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-4">{title}</h1>

        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">{message}</p>

        {estimatedTime && (
          <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-primary/90">
              <strong>Estimated completion time:</strong> {estimatedTime}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onCheckStatus && (
            <Button onClick={onCheckStatus} size="lg">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Check Status
            </Button>
          )}

          <Button variant="outline" onClick={() => window.open('https://status.geoleap.app', '_blank')} size="lg">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Status Page
          </Button>
        </div>

        <div className="mt-12">
          <p className="text-sm text-muted-foreground mb-4">Follow us for updates:</p>
          <div className="flex justify-center gap-4">
            <a
              href="https://twitter.com/geoleapapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </a>
            <a
              href="https://discord.gg/geoleap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </ErrorPageLayout>
  );
}

// Generic Error Page (for other HTTP errors)
export function GenericErrorPage({
  title = 'Unexpected Error',
  message = 'We encountered an unexpected error. Please try again or contact support if the problem persists.',
  errorCode,
  correlationId,
  onRetry = () => window.location.reload(),
  onGoHome = () => (window.location.href = '/'),
  onContactSupport = () => window.open('mailto:hello@example.com'),
  className,
}: ErrorPageProps) {
  return (
    <ErrorPageLayout className={className}>
      <div className="text-center">
        <div className="mb-8">
          <svg
            className="w-24 h-24 mx-auto text-muted-foreground/50 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {errorCode && <div className="text-6xl font-bold text-muted-foreground/40 mb-2">{errorCode}</div>}
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-4">{title}</h1>

        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">{message}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={onRetry} size="lg">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </Button>

          <Button variant="outline" onClick={onGoHome} size="lg">
            Go Home
          </Button>

          <Button variant="outline" onClick={onContactSupport} size="lg">
            Contact Support
          </Button>
        </div>

        {correlationId && (
          <div className="mt-8 p-4 bg-card border border-border rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Error Reference:</p>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded text-muted-foreground">{correlationId}</code>
          </div>
        )}
      </div>
    </ErrorPageLayout>
  );
}

// Layout wrapper for error pages
function ErrorPageLayout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center bg-background',
        'px-4 py-12 sm:px-6 lg:px-8',
        className
      )}
    >
      <div className="max-w-lg w-full">{children}</div>
    </div>
  );
}

// Error page router component
export function ErrorPageRouter({
  statusCode,
  correlationId,
  customMessage,
}: {
  statusCode: number;
  correlationId?: string;
  customMessage?: string;
}) {
  switch (statusCode) {
    case 404:
      return <NotFoundPage />;
    case 500:
      return <InternalServerErrorPage correlationId={correlationId} message={customMessage} />;
    case 503:
      return <MaintenancePage message={customMessage} />;
    default:
      return (
        <GenericErrorPage errorCode={statusCode.toString()} correlationId={correlationId} message={customMessage} />
      );
  }
}
