'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  Bell,
  Smartphone,
  Monitor,
  Globe,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppPermissionState {
  notification: NotificationPermission;
  pushManager: boolean;
  serviceWorker: boolean;
  geolocation?: PermissionState;
  camera?: PermissionState;
  microphone?: PermissionState;
}

interface BrowserInfo {
  name: string;
  version: string;
  os: string;
  mobile: boolean;
  supportsNotifications: boolean;
  supportsPush: boolean;
  supportsServiceWorker: boolean;
}

interface PermissionManagerProps {
  className?: string;
  onPermissionChange?: (permission: NotificationPermission) => void;
  showAdvancedInfo?: boolean;
  autoRequest?: boolean;
}

export function NotificationPermissionManager({
  className = '',
  onPermissionChange,
  showAdvancedInfo = true,
  autoRequest = false,
}: PermissionManagerProps) {
  const [permissions, setPermissions] = useState<AppPermissionState>({
    notification: 'default',
    pushManager: false,
    serviceWorker: false,
  });

  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isRequesting, setIsRequesting] = useState(false);

  // Detect browser and capabilities
  useEffect(() => {
    const detectBrowser = () => {
      const userAgent = navigator.userAgent;
      let name = 'Unknown';
      let version = 'Unknown';
      let os = 'Unknown';
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

      // Detect browser
      if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
        name = 'Chrome';
        version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
      } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        name = 'Safari';
        version = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
      } else if (userAgent.includes('Firefox')) {
        name = 'Firefox';
        version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
      } else if (userAgent.includes('Edg')) {
        name = 'Edge';
        version = userAgent.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
      }

      // Detect OS - Check mobile OS first as they may contain desktop OS keywords
      if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
      else if (userAgent.includes('Android')) os = 'Android';
      else if (userAgent.includes('Windows')) os = 'Windows';
      else if (userAgent.includes('Mac')) os = 'macOS';
      else if (userAgent.includes('Linux')) os = 'Linux';

      const supportsNotifications = 'Notification' in window;
      const supportsPush = 'PushManager' in window;
      const supportsServiceWorker = 'serviceWorker' in navigator;

      setBrowserInfo({
        name,
        version,
        os,
        mobile,
        supportsNotifications,
        supportsPush,
        supportsServiceWorker,
      });
    };

    detectBrowser();
  }, []);

  // Check current permissions
  const checkPermissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const notificationPermission = Notification.permission;
      const pushManagerSupported = 'PushManager' in window;
      const serviceWorkerSupported = 'serviceWorker' in navigator;

      const newPermissions: AppPermissionState = {
        notification: notificationPermission,
        pushManager: pushManagerSupported,
        serviceWorker: serviceWorkerSupported,
      };

      // Check additional permissions if supported
      if ('permissions' in navigator) {
        try {
          // Check geolocation permission
          const geoPermission = await navigator.permissions.query({ name: 'geolocation' });
          newPermissions.geolocation = geoPermission.state;

          // Check camera permission (if supported)
          try {
            const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
            newPermissions.camera = cameraPermission.state;
          } catch {
            // Camera permission not supported in some browsers
          }

          // Check microphone permission (if supported)
          try {
            const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            newPermissions.microphone = micPermission.state;
          } catch {
            // Microphone permission not supported in some browsers
          }
        } catch (error) {
          console.warn('Some permission queries not supported:', error);
        }
      }

      setPermissions(newPermissions);
      onPermissionChange?.(notificationPermission);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setError('Failed to check browser permissions');
    } finally {
      setIsLoading(false);
    }
  }, [onPermissionChange]);

  // Initial permission check
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Auto request permission if enabled
  useEffect(() => {
    if (autoRequest && permissions.notification === 'default' && browserInfo?.supportsNotifications) {
      requestNotificationPermission();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest, permissions.notification, browserInfo]);

  const requestNotificationPermission = async () => {
    if (!browserInfo?.supportsNotifications) {
      setError('Notifications are not supported in this browser');
      return;
    }

    if (permissions.notification === 'granted') {
      return;
    }

    setIsRequesting(true);
    setError('');

    try {
      const permission = await Notification.requestPermission();

      setPermissions(prev => ({ ...prev, notification: permission }));
      onPermissionChange?.(permission);

      if (permission === 'denied') {
        setError('Notification permission was denied. Please enable it in your browser settings.');
      } else if (permission === 'granted') {
        // Send a test notification
        setTimeout(() => {
          new Notification('Notifications Enabled!', {
            body: 'You will now receive notifications from GeoLeap.',
            icon: '/favicon.ico',
            tag: 'permission-granted',
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setError('Failed to request notification permission');
    } finally {
      setIsRequesting(false);
    }
  };

  const openBrowserSettings = () => {
    // This varies by browser, but we can provide instructions
    const instructions = getBrowserSettingsInstructions();
    alert(instructions);
  };

  const getBrowserSettingsInstructions = () => {
    switch (browserInfo?.name) {
      case 'Chrome':
        return `To enable notifications in Chrome:
1. Click the lock icon in the address bar
2. Select "Allow" for notifications
3. Or go to Settings > Privacy > Site Settings > Notifications`;
      case 'Firefox':
        return `To enable notifications in Firefox:
1. Click the shield icon in the address bar
2. Select "Allow" for notifications
3. Or go to Preferences > Privacy & Security > Permissions`;
      case 'Safari':
        return `To enable notifications in Safari:
1. Go to Safari > Preferences > Websites
2. Select Notifications from the sidebar
3. Change the setting for this website to "Allow"`;
      case 'Edge':
        return `To enable notifications in Edge:
1. Click the lock icon in the address bar
2. Select "Allow" for notifications
3. Or go to Settings > Cookies and site permissions > Notifications`;
      default:
        return `To enable notifications:
1. Look for a notification icon or lock icon in your address bar
2. Select "Allow" for notifications
3. Check your browser's privacy/security settings`;
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'denied':
        return <AlertTriangle className="w-5 h-5 text-error" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-warning" />;
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'granted':
        return 'text-success';
      case 'denied':
        return 'text-error';
      default:
        return 'text-warning';
    }
  };

  const getCompatibilityScore = () => {
    if (!browserInfo) return 0;

    let score = 0;
    if (browserInfo.supportsNotifications) score += 40;
    if (browserInfo.supportsPush) score += 30;
    if (browserInfo.supportsServiceWorker) score += 30;

    return score;
  };

  const getCompatibilityStatus = () => {
    const score = getCompatibilityScore();
    if (score === 100) return { text: 'Fully Compatible', color: 'text-success' };
    if (score >= 70) return { text: 'Compatible', color: 'text-primary' };
    if (score >= 40) return { text: 'Limited Support', color: 'text-warning' };
    return { text: 'Not Supported', color: 'text-error' };
  };

  const compatibilityStatus = getCompatibilityStatus();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-foreground" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Permission Manager</h2>
            <p className="text-sm text-muted-foreground">Manage browser permissions for notifications</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={checkPermissions}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          <span>Refresh</span>
        </Button>
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
            <Globe className="w-5 h-5" />
            <span>Browser Compatibility</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              {browserInfo?.mobile ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              <div>
                <div className="font-medium">{browserInfo?.name || 'Unknown'}</div>
                <div className="text-sm text-muted-foreground">v{browserInfo?.version}</div>
              </div>
            </div>

            <div>
              <div className="font-medium">{browserInfo?.os}</div>
              <div className="text-sm text-muted-foreground">
                {browserInfo?.mobile ? 'Mobile' : 'Desktop'}
              </div>
            </div>

            <div>
              <Badge variant={getCompatibilityScore() === 100 ? 'default' : 'outline'} className="mb-1">
                {compatibilityStatus.text}
              </Badge>
              <div className="text-xs text-muted-foreground">
                {getCompatibilityScore()}/100 compatibility
              </div>
            </div>

            <div>
              <Progress value={getCompatibilityScore()} className="h-2 mb-1" />
              <div className="text-xs text-muted-foreground">Feature Support</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notification Permission</span>
          </CardTitle>
          <CardDescription>Current status and controls for notification permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getPermissionIcon(permissions.notification)}
              <div>
                <div className={cn('font-medium', getPermissionColor(permissions.notification))}>
                  {permissions.notification === 'granted'
                    ? 'Notifications Enabled'
                    : permissions.notification === 'denied'
                      ? 'Notifications Blocked'
                      : 'Permission Not Requested'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {permissions.notification === 'granted'
                    ? 'You will receive all notifications'
                    : permissions.notification === 'denied'
                      ? 'Notifications are currently blocked'
                      : 'Click to enable notifications'}
                </div>
              </div>
            </div>

            {permissions.notification !== 'granted' && (
              <Button
                onClick={requestNotificationPermission}
                disabled={isRequesting || !browserInfo?.supportsNotifications}
                className="flex items-center space-x-2"
              >
                {isRequesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                <span>{permissions.notification === 'denied' ? 'Request Again' : 'Enable Notifications'}</span>
              </Button>
            )}
          </div>

          {/* Feature Support Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              {browserInfo?.supportsNotifications ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-error" />
              )}
              <div>
                <div className="font-medium text-sm">Basic Notifications</div>
                <div className="text-xs text-muted-foreground">
                  {browserInfo?.supportsNotifications ? 'Supported' : 'Not Supported'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              {permissions.pushManager ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-error" />
              )}
              <div>
                <div className="font-medium text-sm">Push Messages</div>
                <div className="text-xs text-muted-foreground">
                  {permissions.pushManager ? 'Supported' : 'Not Supported'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              {permissions.serviceWorker ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-error" />
              )}
              <div>
                <div className="font-medium text-sm">Background Sync</div>
                <div className="text-xs text-muted-foreground">
                  {permissions.serviceWorker ? 'Supported' : 'Not Supported'}
                </div>
              </div>
            </div>
          </div>

          {/* Permission Denied Help */}
          {permissions.notification === 'denied' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Notifications are currently blocked</p>
                  <p>To enable notifications, you need to change your browser settings:</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openBrowserSettings}
                    className="mt-2 flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>View Instructions</span>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Advanced Information */}
      {showAdvancedInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="w-5 h-5" />
              <span>Advanced Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-medium text-sm mb-2">Browser Features</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Notifications API</span>
                    <Badge variant={browserInfo?.supportsNotifications ? 'default' : 'destructive'}>
                      {browserInfo?.supportsNotifications ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Push Manager</span>
                    <Badge variant={browserInfo?.supportsPush ? 'default' : 'destructive'}>
                      {browserInfo?.supportsPush ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Service Worker</span>
                    <Badge variant={browserInfo?.supportsServiceWorker ? 'default' : 'destructive'}>
                      {browserInfo?.supportsServiceWorker ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <div className="font-medium text-sm mb-2">Permission Status</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Notifications</span>
                    <Badge
                      variant={permissions.notification === 'granted' ? 'default' : 'outline'}
                      className={getPermissionColor(permissions.notification)}
                    >
                      {permissions.notification}
                    </Badge>
                  </div>
                  {permissions.geolocation && (
                    <div className="flex justify-between">
                      <span>Location</span>
                      <Badge
                        variant={permissions.geolocation === 'granted' ? 'default' : 'outline'}
                        className={getPermissionColor(permissions.geolocation)}
                      >
                        {permissions.geolocation}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Browser-Specific Notes:</p>
              {browserInfo?.os === 'iOS' && (
                <p className="mb-2">
                  <strong>iOS Safari:</strong> Push notifications require iOS 16.4+ and may have limited functionality
                  compared to other platforms.
                </p>
              )}
              {browserInfo?.name === 'Safari' && (
                <p className="mb-2">
                  <strong>Safari:</strong> Some notification features may require additional user interaction.
                </p>
              )}
              {browserInfo?.name === 'Firefox' && (
                <p className="mb-2">
                  <strong>Firefox:</strong> May require manual configuration for some advanced notification features.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
