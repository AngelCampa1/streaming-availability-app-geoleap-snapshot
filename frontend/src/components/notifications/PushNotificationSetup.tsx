'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Smartphone,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
  Bell,
  Globe,
  Monitor,
  Zap,
} from 'lucide-react';

interface PushNotificationState {
  permission: NotificationPermission;
  supported: boolean;
  enabled: boolean;
  subscribed: boolean;
  subscription: PushSubscription | null;
  swRegistered: boolean;
  vapidKey?: string;
}

interface DeviceInfo {
  browser: string;
  os: string;
  mobile: boolean;
  version: string;
}

interface PushNotificationSetupProps {
  className?: string;
  onSubscriptionChange?: (subscription: PushSubscription | null) => void;
  onPermissionChange?: (permission: NotificationPermission) => void;
  vapidPublicKey?: string;
  serviceWorkerPath?: string;
}

export function PushNotificationSetup({
  className = '',
  onSubscriptionChange,
  onPermissionChange,
  vapidPublicKey = 'your-vapid-public-key',
  serviceWorkerPath = '/sw.js',
}: PushNotificationSetupProps) {
  const [state, setState] = useState<PushNotificationState>({
    permission: 'default',
    supported: false,
    enabled: false,
    subscribed: false,
    subscription: null,
    swRegistered: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  // Detect device and browser info
  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent;
      let browser = 'Unknown';
      let os = 'Unknown';
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

      // Detect browser
      if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
      else if (userAgent.includes('Firefox')) browser = 'Firefox';
      else if (userAgent.includes('Edg')) browser = 'Edge';

      // Detect OS
      if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Mac')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

      const version = browser === 'Chrome' ? userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown' : 'Unknown';

      setDeviceInfo({ browser, os, mobile, version });
    };

    detectDevice();
  }, []);

  // Initialize push notification state
  useEffect(() => {
    const initializePushState = async () => {
      try {
        // Check if notifications are supported
        const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

        if (!supported) {
          setState(prev => ({ ...prev, supported: false }));
          return;
        }

        // Get current permission
        const permission = Notification.permission;

        // Check if service worker is registered
        const registration = await navigator.serviceWorker.getRegistration();
        const swRegistered = !!registration;

        let subscription: PushSubscription | null = null;
        let subscribed = false;

        if (registration && permission === 'granted') {
          subscription = await registration.pushManager.getSubscription();
          subscribed = !!subscription;
        }

        setState(prev => ({
          ...prev,
          supported,
          permission,
          swRegistered,
          subscription,
          subscribed,
          enabled: permission === 'granted' && subscribed,
        }));

        onPermissionChange?.(permission);
        onSubscriptionChange?.(subscription);
      } catch (error) {
        console.error('Error initializing push notifications:', error);
        setError('Failed to initialize push notifications');
      }
    };

    initializePushState();
  }, [onPermissionChange, onSubscriptionChange]);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const registration = await navigator.serviceWorker.register(serviceWorkerPath, {
        scope: '/',
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      setState(prev => ({ ...prev, swRegistered: true }));
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      setError('Failed to register service worker');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [serviceWorkerPath]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const permission = await Notification.requestPermission();

      setState(prev => ({ ...prev, permission }));
      onPermissionChange?.(permission);

      if (permission === 'denied') {
        setError('Notification permission was denied. Please enable it in your browser settings.');
      }

      return permission;
    } catch (error) {
      console.error('Error requesting permission:', error);
      setError('Failed to request notification permission');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [onPermissionChange]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      let registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        registration = await registerServiceWorker();
      }

      if (state.permission !== 'granted') {
        const permission = await requestPermission();
        if (permission !== 'granted') {
          return;
        }
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      setState(prev => ({
        ...prev,
        subscription,
        subscribed: true,
        enabled: true,
      }));

      onSubscriptionChange?.(subscription);

      // Send subscription to server (in real app)
      logger.info('[PushNotificationSetup] Push subscription created', { subscription });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setError('Failed to subscribe to push notifications');
    } finally {
      setIsLoading(false);
    }
  }, [state.permission, requestPermission, registerServiceWorker, vapidPublicKey, onSubscriptionChange]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      if (state.subscription) {
        await state.subscription.unsubscribe();
      }

      setState(prev => ({
        ...prev,
        subscription: null,
        subscribed: false,
        enabled: false,
      }));

      onSubscriptionChange?.(null);
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setError('Failed to unsubscribe from push notifications');
    } finally {
      setIsLoading(false);
    }
  }, [state.subscription, onSubscriptionChange]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    try {
      if (state.permission !== 'granted') return;

      // Create a local test notification
      new Notification('GeoLeap Test Notification', {
        body: 'Push notifications are working correctly!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-notification',
        requireInteraction: false,
      });

      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 3000);
    } catch (error) {
      console.error('Error sending test notification:', error);
      setError('Failed to send test notification');
    }
  }, [state.permission]);

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const getBrowserIcon = () => {
    switch (deviceInfo?.browser) {
      case 'Chrome':
        return <Monitor className="w-5 h-5" />;
      case 'Safari':
        return <Monitor className="w-5 h-5" />;
      case 'Firefox':
        return <Monitor className="w-5 h-5" />;
      default:
        return <Globe className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    if (state.enabled) return 'text-success';
    if (state.permission === 'denied') return 'text-destructive';
    return 'text-warning';
  };

  const getStatusIcon = () => {
    if (state.enabled) return <CheckCircle className="w-5 h-5 text-success" />;
    if (state.permission === 'denied') return <AlertTriangle className="w-5 h-5 text-destructive" />;
    return <AlertTriangle className="w-5 h-5 text-warning" />;
  };

  const getSetupProgress = () => {
    let progress = 0;
    if (state.supported) progress += 25;
    if (state.swRegistered) progress += 25;
    if (state.permission === 'granted') progress += 25;
    if (state.subscribed) progress += 25;
    return progress;
  };

  const getCompatibilityStatus = () => {
    if (!state.supported) return 'Not Supported';
    if (deviceInfo?.os === 'iOS' && deviceInfo?.browser === 'Safari') {
      return 'Limited Support (iOS Safari)';
    }
    if (deviceInfo?.browser === 'Chrome' || deviceInfo?.browser === 'Firefox') {
      return 'Fully Supported';
    }
    return 'Partial Support';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Smartphone className="w-6 h-6 text-foreground" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Push Notifications</h2>
            <p className="text-sm text-muted-foreground">Receive instant notifications on your device</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {state.enabled ? 'Active' : state.permission === 'denied' ? 'Blocked' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Browser Compatibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Browser Compatibility</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              {getBrowserIcon()}
              <div>
                <div className="font-medium">{deviceInfo?.browser || 'Unknown'}</div>
                <div className="text-sm text-muted-foreground">{deviceInfo?.version}</div>
              </div>
            </div>

            <div>
              <div className="font-medium">{deviceInfo?.os}</div>
              <div className="text-sm text-muted-foreground">{deviceInfo?.mobile ? 'Mobile' : 'Desktop'}</div>
            </div>

            <div>
              <Badge variant={state.supported ? 'default' : 'destructive'} className="mb-1">
                {getCompatibilityStatus()}
              </Badge>
              <div className="text-xs text-muted-foreground">{state.supported ? 'Ready to use' : 'Not available'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Setup Progress</span>
          </CardTitle>
          <CardDescription>Complete these steps to enable push notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Setup Progress</span>
              <span>{getSetupProgress()}%</span>
            </div>
            <Progress value={getSetupProgress()} className="h-2" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              {state.supported ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              )}
              <span className="text-sm">Browser Support: {state.supported ? 'Available' : 'Not Supported'}</span>
            </div>

            <div className="flex items-center space-x-3">
              {state.swRegistered ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning" />
              )}
              <span className="text-sm">Service Worker: {state.swRegistered ? 'Registered' : 'Not Registered'}</span>
              {!state.swRegistered && state.supported && (
                <Button variant="outline" size="sm" onClick={registerServiceWorker} disabled={isLoading}>
                  Register
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {state.permission === 'granted' ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : state.permission === 'denied' ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning" />
              )}
              <span className="text-sm">
                Permission:{' '}
                {state.permission === 'granted'
                  ? 'Granted'
                  : state.permission === 'denied'
                    ? 'Denied'
                    : 'Not Requested'}
              </span>
              {state.permission === 'default' && (
                <Button variant="outline" size="sm" onClick={requestPermission} disabled={isLoading}>
                  Request
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {state.subscribed ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning" />
              )}
              <span className="text-sm">Subscription: {state.subscribed ? 'Active' : 'Inactive'}</span>
              {!state.subscribed && state.permission === 'granted' && (
                <Button variant="outline" size="sm" onClick={subscribe} disabled={isLoading}>
                  Subscribe
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Controls */}
      {state.supported && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notification Controls</span>
            </CardTitle>
            <CardDescription>Manage your push notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable Push Notifications</div>
                <div className="text-sm text-muted-foreground">Receive notifications even when the app is closed</div>
              </div>
              <Switch
                checked={state.enabled}
                onCheckedChange={state.enabled ? unsubscribe : subscribe}
                disabled={isLoading || !state.supported}
              />
            </div>

            {state.enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Subscription Status</div>
                    <div className="text-sm text-muted-foreground">
                      {state.subscribed ? 'Successfully subscribed' : 'Not subscribed'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Last Updated</div>
                    <div className="text-sm text-muted-foreground">{new Date().toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendTestNotification}
                    disabled={!state.enabled}
                    className="flex items-center space-x-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Send Test Notification</span>
                  </Button>

                  {testNotificationSent && (
                    <Badge
                      variant="default"
                      className="bg-success/10 border-success/20 text-success"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Test Sent
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permission Denied Help */}
      {state.permission === 'denied' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Notifications are currently blocked</p>
              <p>To enable notifications:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Click the lock icon in your browser&apos;s address bar</li>
                <li>Select &quot;Allow&quot; for notifications</li>
                <li>Refresh this page and try again</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Troubleshooting */}
      {state.supported && !state.enabled && state.permission !== 'denied' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="w-5 h-5" />
              <span>Troubleshooting</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-1">Common Issues:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Make sure you&apos;re using HTTPS</li>
                  <li>Check if notifications are blocked in browser settings</li>
                  <li>Disable ad blockers that might interfere</li>
                  <li>Try refreshing the page</li>
                </ul>
              </div>

              {deviceInfo?.os === 'iOS' && (
                <div>
                  <p className="font-medium mb-1 text-warning">iOS Note:</p>
                  <p className="text-muted-foreground">
                    Push notifications on iOS Safari require iOS 16.4+ and may have limited functionality.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
