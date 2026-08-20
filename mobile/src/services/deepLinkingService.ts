import { Linking } from 'react-native';
import { logger } from '../utils/logger';

export interface DeepLinkRoute {
  type: 'content' | 'profile' | 'settings' | 'search' | 'unknown';
  id?: string;
  url: string;
  source: 'deep-link';
}

export class DeepLinkingService {
  private static instance: DeepLinkingService;
  private deepLinkListeners: ((url: string) => void)[] = [];
  private navigationRef: any = null;
  private urlSubscription: { remove: () => void } | null = null;

  // SECURITY FIX: URL validation constants
  private static readonly VALID_SCHEMES = ['geoleap://', 'https://geoleap.app', 'https://www.geoleap.app'];
  private static readonly MAX_URL_LENGTH = 500;
  private static readonly MAX_ID_LENGTH = 50;

  // SECURITY FIX: Validation patterns for different ID types
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private static readonly NUMERIC_ID_REGEX = /^\d{1,10}$/;
  private static readonly ALPHANUMERIC_ID_REGEX = /^[a-zA-Z0-9_-]{1,50}$/;

  // SECURITY FIX: Dangerous patterns to block
  private static readonly DANGEROUS_PATTERNS = [
    '../',           // Path traversal
    '..\\',          // Windows path traversal
    '<script',       // XSS attempt
    'javascript:',   // JavaScript injection
    'data:',         // Data URL injection
    '%00',           // Null byte injection
    '\x00',          // Null character
    'file://',       // File protocol
    'ftp://',        // FTP protocol
  ];

  static getInstance(): DeepLinkingService {
    if (!DeepLinkingService.instance) {
      DeepLinkingService.instance = new DeepLinkingService();
    }
    return DeepLinkingService.instance;
  }

  // SECURITY FIX: Validate URL scheme and length
  private validateUrl(url: string): { valid: boolean; error?: string } {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL is required' };
    }

    if (url.length > DeepLinkingService.MAX_URL_LENGTH) {
      return { valid: false, error: `URL exceeds maximum length of ${DeepLinkingService.MAX_URL_LENGTH}` };
    }

    // Check for dangerous patterns
    const lowerUrl = url.toLowerCase();
    for (const pattern of DeepLinkingService.DANGEROUS_PATTERNS) {
      if (lowerUrl.includes(pattern.toLowerCase())) {
        logger.warn('Blocked dangerous URL pattern:', { pattern, url: url.substring(0, 50) });
        return { valid: false, error: 'URL contains blocked pattern' };
      }
    }

    // Verify URL starts with valid scheme
    const hasValidScheme = DeepLinkingService.VALID_SCHEMES.some(scheme =>
      url.startsWith(scheme)
    );

    if (!hasValidScheme) {
      return { valid: false, error: 'Invalid URL scheme' };
    }

    return { valid: true };
  }

  // SECURITY FIX: Validate content/resource IDs
  private validateId(id: string, idType: 'uuid' | 'numeric' | 'alphanumeric' = 'alphanumeric'): { valid: boolean; error?: string } {
    if (!id || typeof id !== 'string') {
      return { valid: false, error: 'ID is required' };
    }

    if (id.length > DeepLinkingService.MAX_ID_LENGTH) {
      return { valid: false, error: `ID exceeds maximum length of ${DeepLinkingService.MAX_ID_LENGTH}` };
    }

    // Check for dangerous patterns in ID
    for (const pattern of DeepLinkingService.DANGEROUS_PATTERNS) {
      if (id.includes(pattern)) {
        logger.warn('Blocked dangerous ID pattern:', { pattern });
        return { valid: false, error: 'ID contains blocked pattern' };
      }
    }

    // Validate based on expected ID type
    let isValid = false;
    switch (idType) {
      case 'uuid':
        isValid = DeepLinkingService.UUID_REGEX.test(id);
        break;
      case 'numeric':
        isValid = DeepLinkingService.NUMERIC_ID_REGEX.test(id);
        break;
      case 'alphanumeric':
      default:
        isValid = DeepLinkingService.ALPHANUMERIC_ID_REGEX.test(id);
        break;
    }

    if (!isValid) {
      return { valid: false, error: `Invalid ID format for type: ${idType}` };
    }

    return { valid: true };
  }

  // SECURITY FIX: Sanitize extracted ID
  private sanitizeId(id: string): string {
    // Decode URL encoding and trim whitespace
    let sanitized = decodeURIComponent(id).trim();

    // Remove any null bytes (using String.fromCharCode to avoid control char in regex)
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(new RegExp(String.fromCharCode(0), 'g'), '');

    // Limit length
    if (sanitized.length > DeepLinkingService.MAX_ID_LENGTH) {
      sanitized = sanitized.substring(0, DeepLinkingService.MAX_ID_LENGTH);
    }

    return sanitized;
  }

  async initialize(): Promise<void> {
    try {
      const url = await Linking.getInitialURL();
      if (url) {
        this.handleDeepLink(url);
      }

      // Remove existing listener before adding new one
      this.urlSubscription?.remove();
      this.urlSubscription = Linking.addEventListener('url', (event) => {
        this.handleDeepLink(event.url);
      });
    } catch (error) {
      logger.error('Deep linking initialization error:', error);
    }
  }

  cleanup(): void {
    this.urlSubscription?.remove();
    this.urlSubscription = null;
  }

  handleDeepLink(url: string): void {
    try {
      // SECURITY FIX: Validate URL before processing
      const urlValidation = this.validateUrl(url);
      if (!urlValidation.valid) {
        logger.warn('Deep link rejected:', { error: urlValidation.error, url: url.substring(0, 50) });
        return;
      }

      const parsed = this.parseDeepLink(url);
      if (parsed) {
        this.deepLinkListeners.forEach(listener => listener(url));
        logger.info('Deep link handled:', parsed);
      }
    } catch (error) {
      logger.error('Deep link handling error:', error);
    }
  }

  parseDeepLink(url: string): DeepLinkRoute | null {
    try {
      // SECURITY FIX: Validate URL first
      const urlValidation = this.validateUrl(url);
      if (!urlValidation.valid) {
        logger.warn('parseDeepLink: Invalid URL', { error: urlValidation.error });
        return null;
      }

      if (url.startsWith('geoleap://content/')) {
        const rawId = url.replace('geoleap://content/', '');
        const sanitizedId = this.sanitizeId(rawId);

        // SECURITY FIX: Validate the content ID
        const idValidation = this.validateId(sanitizedId, 'alphanumeric');
        if (!idValidation.valid) {
          logger.warn('parseDeepLink: Invalid content ID', { error: idValidation.error });
          return null;
        }

        return {
          type: 'content',
          id: sanitizedId,
          url,
          source: 'deep-link',
        };
      }

      if (url.startsWith('geoleap://profile/')) {
        const rawId = url.replace('geoleap://profile/', '');
        const sanitizedId = this.sanitizeId(rawId);

        const idValidation = this.validateId(sanitizedId, 'alphanumeric');
        if (!idValidation.valid) {
          logger.warn('parseDeepLink: Invalid profile ID', { error: idValidation.error });
          return null;
        }

        return {
          type: 'profile',
          id: sanitizedId,
          url,
          source: 'deep-link',
        };
      }

      if (url.startsWith('geoleap://settings')) {
        return {
          type: 'settings',
          url,
          source: 'deep-link',
        };
      }

      if (url.startsWith('geoleap://search')) {
        return {
          type: 'search',
          url,
          source: 'deep-link',
        };
      }

      return {
        type: 'unknown',
        url,
        source: 'deep-link',
      };
    } catch (error) {
      logger.error('Deep link parsing error:', error);
      return null;
    }
  }

  static setNavigationRef(ref: any): void {
    const instance = DeepLinkingService.getInstance();
    instance.navigationRef = ref;
  }

  static async initialize(): Promise<void> {
    const instance = DeepLinkingService.getInstance();
    await instance.initialize();
  }

  addDeepLinkListener(listener: (url: string) => void): () => void {
    this.deepLinkListeners.push(listener);
    return () => {
      this.deepLinkListeners = this.deepLinkListeners.filter(l => l !== listener);
    };
  }

  removeDeepLinkListener(listener: (url: string) => void): void {
    this.deepLinkListeners = this.deepLinkListeners.filter(l => l !== listener);
  }

  generateDeepLink(contentId: string): string {
    return `geoleap://content/${contentId}`;
  }

  // Method to match test expectations
  parseUrl(url: string): { screen: string; params?: any } | null {
    try {
      // SECURITY FIX: Validate URL first
      const urlValidation = this.validateUrl(url);
      if (!urlValidation.valid) {
        logger.warn('parseUrl: Invalid URL', { error: urlValidation.error });
        return null;
      }

      if (url.startsWith('geoleap://content/')) {
        const rawId = url.replace('geoleap://content/', '');
        const contentId = this.sanitizeId(rawId);

        // SECURITY FIX: Validate content ID
        const idValidation = this.validateId(contentId, 'alphanumeric');
        if (!idValidation.valid) {
          logger.warn('parseUrl: Invalid content ID', { error: idValidation.error });
          return null;
        }

        return {
          screen: 'ContentDetail',
          params: { contentId },
        };
      }

      if (url.startsWith('geoleap://watchlist/add/')) {
        const rawId = url.replace('geoleap://watchlist/add/', '');
        const contentId = this.sanitizeId(rawId);

        // SECURITY FIX: Validate content ID
        const idValidation = this.validateId(contentId, 'alphanumeric');
        if (!idValidation.valid) {
          logger.warn('parseUrl: Invalid watchlist content ID', { error: idValidation.error });
          return null;
        }

        return {
          screen: 'AddToWatchlist',
          params: { contentId },
        };
      }

      if (url.startsWith('geoleap://subscriptions/')) {
        const urlWithoutScheme = url.replace('geoleap://subscriptions/', '');
        const parts = urlWithoutScheme.split('/');
        const rawSubscriptionId = parts[0];
        const subscriptionId = this.sanitizeId(rawSubscriptionId);

        // SECURITY FIX: Validate subscription ID (typically alphanumeric or UUID)
        const idValidation = this.validateId(subscriptionId, 'alphanumeric');
        if (!idValidation.valid) {
          logger.warn('parseUrl: Invalid subscription ID', { error: idValidation.error });
          return null;
        }

        return {
          screen: 'ManageSubscription',
          params: {
            subscriptionId,
          },
        };
      }

      return null;
    } catch (error) {
      logger.error('Deep link parsing error:', error);
      return null;
    }
  }
}

export default DeepLinkingService;
