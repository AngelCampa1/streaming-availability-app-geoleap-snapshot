'use client';

import Link from'next/link';
import AppLayout from'@/components/layout/AppLayout';

export default function PrivacyPage() {
  return (
    <AppLayout showBreadcrumbs={false} maxWidth="md">
      <div className="container-mobile py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>

        <div className="prose prose-slate  max-w-none">
          <div className="rounded-2xl border border-border bg-surface-muted p-6 mb-8">
            <p className="font-semibold text-foreground mb-2">This is a demo page.</p>
            <p className="text-foreground-muted">
              GeoLeap is a portfolio project. It is not a live service. No company runs it. The text below is a sample policy. It is not a legal agreement. Please do not send real personal details to this app.
            </p>
          </div>

          <p className="text-foreground-muted">Last updated: May 2026</p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">1. Introduction</h2>
          <p className="text-foreground-muted mb-4">
            GeoLeap (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is a streaming discovery app. This page explains what the app would collect and how it would handle your information if it ran as a live service.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">2. Information We Collect</h2>
          <p className="text-foreground-muted mb-4">We collect information that you provide directly to us, including:</p>
          <ul className="list-disc pl-6 text-foreground-muted mb-4">
            <li>Account information (email address, name)</li>
            <li>Search queries and preferences</li>
            <li>Watchlist and favorite content</li>
            <li>Payment information (processed securely by our payment providers)</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">3. How We Use Your Information</h2>
          <p className="text-foreground-muted mb-4">We use the information we collect to:</p>
          <ul className="list-disc pl-6 text-foreground-muted mb-4">
            <li>Provide and maintain our services</li>
            <li>Personalize your experience and recommendations</li>
            <li>Process transactions and send related information</li>
            <li>Send you updates, security alerts, and support messages</li>
            <li>Improve our services and develop new features</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">4. Data Security</h2>
          <p className="text-foreground-muted mb-4">
            We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">5. Data Retention</h2>
          <p className="text-foreground-muted mb-4">
            We retain your personal information only for as long as necessary to fulfill the purposes for which it was collected and to comply with legal obligations.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">6. Your Rights</h2>
          <p className="text-foreground-muted mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 text-foreground-muted mb-4">
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to processing of your data</li>
            <li>Export your data in a portable format</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">7. Cookies</h2>
          <p className="text-foreground-muted mb-4">
            We use cookies and similar tracking technologies to keep the service working, understand aggregate site usage, and measure advertising performance. You can control cookies through your browser settings and manage ad personalization through the controls your advertising partners provide (for example, Google Ads Settings at adssettings.google.com).
          </p>
          <p className="text-foreground-muted mb-4">
            Advertising partners, including Google AdSense when enabled, may use cookies or similar identifiers to serve, limit, and measure ads. You can control how these cookies are used through your browser settings and Google Ads Settings (adssettings.google.com).
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">8. Third-Party Services</h2>
          <p className="text-foreground-muted mb-4">
            We may employ third-party companies and individuals to facilitate our service. These third parties have access to your personal information only to perform tasks on our behalf and are obligated not to disclose or use it for any other purpose.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">9. Changes to This Policy</h2>
          <p className="text-foreground-muted mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">10. Contact Us</h2>
          <p className="text-foreground-muted mb-4">
            If you have any questions about this Privacy Policy, please contact us at{''}
            <a href="mailto:hello@example.com" className="text-primary hover:underline">
              hello@example.com
            </a>
          </p>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4">
            <Link href="/" className="text-primary hover:underline">
              &larr; Back to Home
            </Link>
            <Link href="/terms" className="text-foreground-muted hover:text-foreground hover:underline">
              Terms of Service
            </Link>
            <Link href="/faq" className="text-foreground-muted hover:text-foreground hover:underline">
              FAQ
            </Link>
            <Link href="/support" className="text-foreground-muted hover:text-foreground hover:underline">
              Help Center
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
