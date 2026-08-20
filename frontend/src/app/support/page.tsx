'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SupportDashboard } from '../../components/support/SupportDashboard';
import { SupportUser } from '../../lib/types/support';
import { Card, CardContent } from '../../components/ui/card';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Loader2, Shield, AlertTriangle, RefreshCw, Lock, Mail, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const SupportPageContent: React.FC = () => {
  const _searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentUser, setCurrentUser] = useState<SupportUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show public support info for unauthenticated users (no redirect)

  useEffect(() => {
    // Only load support user if authenticated
    if (!authLoading && isAuthenticated) {
      loadCurrentUser();
    }
  }, [authLoading, isAuthenticated]);

  const loadCurrentUser = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Real API call to get support user data
      const response = await fetch('/api/support/auth/current-user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied. You do not have permission to access the support dashboard.');
        } else if (response.status === 401) {
          setError('Authentication required. Please log in again.');
        } else {
          setError('Failed to load support user data. Please try again.');
        }
        return;
      }

      const userData = await response.json();

      // Validate that user has support role
      if (!userData.role || userData.role.name !== 'Customer Support Representative') {
        setError('Access denied. Support role required to access this dashboard.');
        return;
      }

      setCurrentUser(userData);
    } catch (error) {
      console.error('Failed to load current user:', error);
      setError('Failed to authenticate support user. Please try logging in again.');
    } finally {
      setIsLoading(false);
    }
  };

  // BUG FIX: Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Checking Authentication</h2>
            <p className="text-muted-foreground">Verifying your access credentials...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show public support contact page for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Contact Support</h1>
            <p className="text-muted-foreground mb-6">
              Need help with GeoLeap? We are here to assist you.
            </p>
            <div className="space-y-4 text-left mb-6">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-foreground">Email Us</p>
                  <a href="mailto:hello@example.com" className="text-sm text-primary hover:underline">hello@example.com</a>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-foreground">Browse FAQs</p>
                  <p className="text-sm text-muted-foreground">Find answers to common questions in our <a href="/faq" className="text-primary hover:underline">FAQ section</a> or <a href="/help" className="text-primary hover:underline">Help Center</a>.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => router.push('/faq')} variant="outline" className="flex-1">
                View FAQs
              </Button>
              <Button onClick={() => router.push('/auth/login?returnUrl=/support')} className="flex-1">
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state for support user data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Loading Support Dashboard</h2>
            <p className="text-muted-foreground">Authenticating and initializing your support environment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !currentUser) {
    // Show access denied message for permission errors
    const isAccessDenied = error && error.includes('Access denied');

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            {isAccessDenied ? (
              <Shield className="w-12 h-12 text-warning mx-auto mb-4" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            )}
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {isAccessDenied ? 'Access Denied' : 'Authentication Error'}
            </h2>
            <Alert variant={isAccessDenied ? 'default' : 'destructive'} className="mb-4">
              <div>
                <p className="text-sm">{error || 'Unable to authenticate support user session.'}</p>
              </div>
            </Alert>
            <div className="space-y-3">
              {!isAccessDenied && (
                <Button onClick={loadCurrentUser} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Authentication
                </Button>
              )}
              <Button
                variant={isAccessDenied ? 'default' : 'outline'}
                onClick={() => router.push('/')}
                className="w-full"
              >
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Permission check
  const hasRequiredPermissions = currentUser.role.permissions.some(
    permission => permission.category === 'billing' || permission.category === 'account'
  );

  if (!hasRequiredPermissions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Insufficient Permissions</h2>
            <Alert className="mb-4 bg-warning/10 border-warning/20 text-warning-foreground">
              <div>
                <p className="text-sm">
                  Your account does not have the required permissions to access the customer support dashboard. Please
                  contact your administrator for access.
                </p>
              </div>
            </Alert>
            <div className="text-left">
              <p className="text-sm text-muted-foreground mb-2">Your current role:</p>
              <p className="font-medium text-foreground">{currentUser.role.name}</p>
              <p className="text-xs text-muted-foreground mt-1">Required: Billing or Account management permissions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render the main support dashboard
  return (
    <div className="min-h-screen bg-background">
      <SupportDashboard currentUser={currentUser} isMobile={isMobile} />
    </div>
  );
};

const SupportPage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading support dashboard...</p>
          </div>
        </div>
      }
    >
      <SupportPageContent />
    </Suspense>
  );
};

export default SupportPage;
