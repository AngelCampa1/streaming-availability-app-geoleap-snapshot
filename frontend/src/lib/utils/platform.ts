/**
 * Platform detection utilities for cross-platform compatibility
 */

export const isReactNative = (): boolean => {
  return typeof global !== 'undefined' && global.ReactNative !== undefined;
};

export const isIOS = (): boolean => {
  if (isReactNative()) {
    return global.ReactNative?.Platform?.OS === 'ios';
  }

  if (typeof navigator === 'undefined') return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

export const isAndroid = (): boolean => {
  if (isReactNative()) {
    return global.ReactNative?.Platform?.OS === 'android';
  }

  if (typeof navigator === 'undefined') return false;

  return /Android/.test(navigator.userAgent);
};

export const isMobile = (): boolean => {
  if (isReactNative()) {
    return true;
  }

  if (typeof navigator === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/.test(navigator.userAgent);
};

export const isTablet = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  return (
    /iPad/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
    (/Android/.test(navigator.userAgent) && !/Mobile/.test(navigator.userAgent))
  );
};

export const isDesktop = (): boolean => {
  return !isMobile() && !isTablet();
};

export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

export const canUseNativeShare = (): boolean => {
  return typeof navigator !== 'undefined' && 'share' in navigator;
};

export const canUseClipboard = (): boolean => {
  return typeof navigator !== 'undefined' && 'clipboard' in navigator && 'writeText' in navigator.clipboard;
};

export const canUseNotifications = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const canUseVibration = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

export const getViewportSize = () => {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export const getScreenSize = () => {
  if (typeof screen === 'undefined') {
    return { width: 1024, height: 768 };
  }

  return {
    width: screen.width,
    height: screen.height,
  };
};

export const getDevicePixelRatio = (): number => {
  if (typeof window === 'undefined') return 1;

  return window.devicePixelRatio || 1;
};

export const isHighDensityDisplay = (): boolean => {
  return getDevicePixelRatio() > 1.5;
};

export const supportsTouch = (): boolean => {
  if (typeof window === 'undefined') return false;

  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const getConnectionType = (): string => {
  if (typeof navigator === 'undefined') return 'unknown';

  const connection =
    (navigator as { connection?: { effectiveType?: string; type?: string } }).connection || (navigator as { mozConnection?: { effectiveType?: string; type?: string } }).mozConnection || (navigator as { webkitConnection?: { effectiveType?: string; type?: string } }).webkitConnection;

  if (!connection) return 'unknown';

  return connection.effectiveType || connection.type || 'unknown';
};

export const isSlowConnection = (): boolean => {
  const connectionType = getConnectionType();
  return ['slow-2g', '2g', '3g'].includes(connectionType);
};

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const getOperatingSystem = (): string => {
  if (typeof navigator === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent;

  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || /iPad|iPhone|iPod/.test(userAgent)) return 'iOS';

  return 'unknown';
};

export const getBrowser = (): string => {
  if (typeof navigator === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent;

  // Check Edge first (Edg/ for Chromium-based Edge)
  if (userAgent.includes('Edg/') || userAgent.includes('Edge/')) return 'Edge';
  // Check Opera (OPR/ for modern Opera)
  if (userAgent.includes('OPR/') || userAgent.includes('Opera')) return 'Opera';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';

  return 'unknown';
};

export const isInAppBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent;

  return (
    userAgent.includes('FBAN') || // Facebook
    userAgent.includes('FBAV') || // Facebook
    userAgent.includes('Instagram') || // Instagram
    userAgent.includes('Twitter') || // Twitter
    userAgent.includes('Line/') || // Line
    userAgent.includes('WhatsApp') || // WhatsApp
    userAgent.includes('Pinterest') // Pinterest
  );
};

// Global type definitions for React Native
declare global {
  var ReactNative:
    | {
        Platform: {
          OS: 'ios' | 'android';
        };
        Share: {
          share: (content: { message?: string; url?: string; title?: string }) => Promise<{ action: string }>;
        };
        Linking: {
          openURL: (url: string) => Promise<void>;
          canOpenURL: (url: string) => Promise<boolean>;
        };
      }
    | undefined;
}
