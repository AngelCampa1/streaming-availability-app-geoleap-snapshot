import React from 'react';
import { Metadata } from 'next';
import ResponsiveCustomerSupportAnalytics from '@/components/analytics/ResponsiveCustomerSupportAnalytics';

export const metadata: Metadata = {
  title: 'Customer Support Analytics | GeoLeap Admin',
  description:
    'Comprehensive customer support analytics dashboard with real-time metrics, agent performance, and satisfaction tracking',
  keywords: 'support analytics, customer service metrics, agent performance, satisfaction tracking, SLA monitoring',
};

/**
 * Customer Support Analytics page for admin dashboard
 *
 * Features:
 * - Real-time support metrics
 * - Agent performance analytics
 * - Customer satisfaction tracking
 * - SLA compliance monitoring
 * - Ticket trend analysis
 * - Category and channel breakdown
 * - Export capabilities
 */
const SupportAnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="md:flex md:items-center md:justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold leading-7 text-foreground sm:text-3xl sm:truncate">
                  Customer Support Analytics
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Monitor and analyze customer support performance, agent metrics, and satisfaction trends
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <ResponsiveCustomerSupportAnalytics />
      </div>
    </div>
  );
};

export default SupportAnalyticsPage;
