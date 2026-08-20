'use client';

import Link from'next/link';
import AppLayout from'@/components/layout/AppLayout';

export default function TermsPage() {
  return (
    <AppLayout showBreadcrumbs={false} maxWidth="md">
      <div className="container-mobile py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Terms of Service</h1>

        <div className="prose prose-slate  max-w-none">
          <div className="rounded-2xl border border-border bg-surface-muted p-6 mb-8">
            <p className="font-semibold text-foreground mb-2">This is a demo page.</p>
            <p className="text-foreground-muted">
              GeoLeap is a portfolio project. It is not a live service and no company runs it. The terms below show what the product was designed to offer. Because nothing is running, they bind no one and no court can enforce them.
            </p>
          </div>

          <p className="text-foreground-muted">Last updated: May 2026</p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">1. Acceptance of Terms</h2>
          <p className="text-foreground-muted mb-4">
            These terms describe the rules GeoLeap (&quot;the Service&quot;) sets for people who use it. GeoLeap is a portfolio project and is not running, so nothing here creates a real agreement with anyone.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">2. Description of Service</h2>
          <p className="text-foreground-muted mb-4">
            GeoLeap is a streaming content discovery platform that helps users find where movies and TV shows are available across different countries and streaming services. We do not host or provide streaming content ourselves.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">3. User Accounts</h2>
          <p className="text-foreground-muted mb-4">
            When you create an account with us, you must provide accurate, complete, and current information. You are responsible for safeguarding the password and for all activities that occur under your account.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">4. Subscriptions and Payments</h2>
          <p className="text-foreground-muted mb-4">
            Premium is sold as a yearly subscription. Billing happens in advance, on a repeating cycle. Premium comes with a 14-day money-back guarantee from the date of first payment. After those 14 days, fees are not refunded unless the law requires it.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">5. Free Trial</h2>
          <p className="text-foreground-muted mb-4">
            Premium starts with a 30-day free trial. When the trial ends, the account is charged, unless you cancel before that date.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">6. Acceptable Use</h2>
          <p className="text-foreground-muted mb-4">You agree not to:</p>
          <ul className="list-disc pl-6 text-foreground-muted mb-4">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to any portion of the Service</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Scrape or collect data from the Service without permission</li>
            <li>Impersonate any person or entity</li>
          </ul>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">7. Intellectual Property</h2>
          <p className="text-foreground-muted mb-4">
            The Service and its original content, features, and functionality are owned by GeoLeap and are protected by international copyright, trademark, and other intellectual property laws.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">8. Third-Party Content</h2>
          <p className="text-foreground-muted mb-4">
            Our Service displays information about content available on third-party streaming platforms. We are not responsible for the availability, accuracy, or content of these third-party services.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">9. Disclaimer of Warranties</h2>
          <p className="text-foreground-muted mb-4">
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, secure, or error-free.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">10. Limitation of Liability</h2>
          <p className="text-foreground-muted mb-4">
            In no event shall GeoLeap be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">11. Termination</h2>
          <p className="text-foreground-muted mb-4">
            We may terminate or suspend your account immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the Service will cease immediately.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">12. Changes to Terms</h2>
          <p className="text-foreground-muted mb-4">
            We reserve the right to modify these terms at any time. We will provide notice of significant changes. Your continued use of the Service after changes constitutes acceptance of the new terms.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">13. Governing Law</h2>
          <p className="text-foreground-muted mb-4">
            A live service would name the law that governs its terms here. GeoLeap is a portfolio project, so no law governs this page and no court can enforce it.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-4 text-foreground">14. Contact Us</h2>
          <p className="text-foreground-muted mb-4">
            If you have any questions about these Terms of Service, please contact us at{''}
            <a href="mailto:hello@example.com" className="text-primary hover:underline">
              hello@example.com
            </a>
          </p>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4">
            <Link href="/" className="text-primary hover:underline">
              &larr; Back to Home
            </Link>
            <Link href="/privacy" className="text-foreground-muted hover:text-foreground hover:underline">
              Privacy Policy
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
