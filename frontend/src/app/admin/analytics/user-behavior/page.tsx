'use client';

import React from 'react';
import UserBehaviorAnalyticsDashboard from '@/components/admin/UserBehaviorAnalyticsDashboard';
import UserBehaviorTracker from '@/components/analytics/UserBehaviorTracker';

const UserBehaviorAnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Track user behavior on this page */}
      <UserBehaviorTracker
        trackPageViews={true}
        trackClicks={true}
        trackScrolling={true}
        trackTimeOnPage={true}
        respectConsent={true}
      />

      <div className="container mx-auto px-4 py-6">
        <UserBehaviorAnalyticsDashboard className="max-w-7xl mx-auto" showRealTime={true} refreshInterval={30000} />
      </div>
    </div>
  );
};

export default UserBehaviorAnalyticsPage;
