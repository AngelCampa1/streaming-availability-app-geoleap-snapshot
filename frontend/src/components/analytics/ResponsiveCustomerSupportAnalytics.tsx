'use client';

import React, { useState, useEffect } from 'react';
import CustomerSupportAnalytics from './CustomerSupportAnalytics';
import CustomerSupportAnalyticsMobile from './CustomerSupportAnalyticsMobile';

/**
 * Responsive wrapper for Customer Support Analytics
 * Automatically switches between desktop and mobile views based on screen size
 */
const ResponsiveCustomerSupportAnalytics: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    // Check on initial load
    checkIsMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);

    // Cleanup event listener
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Force mobile view for very small screens
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 640) {
        // sm breakpoint
        setIsMobile(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Render appropriate component based on screen size
  return <div className="w-full">{isMobile ? <CustomerSupportAnalyticsMobile /> : <CustomerSupportAnalytics />}</div>;
};

export default ResponsiveCustomerSupportAnalytics;
