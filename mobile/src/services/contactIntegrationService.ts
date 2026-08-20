import { PermissionsAndroid, Platform } from 'react-native';
import { logger } from '../utils/logger';

export interface PhoneNumber {
  label: string;
  number: string;
}

export interface EmailAddress {
  label: string;
  email: string;
}

export interface Contact {
  recordID: string;
  displayName: string;
  givenName: string;
  familyName: string;
  phoneNumbers: PhoneNumber[];
  emailAddresses: EmailAddress[];
  thumbnailPath?: string;
}

export interface ContactSearchOptions {
  searchText: string;
  maxResults?: number;
  includePhoneNumbers?: boolean;
  includeEmailAddresses?: boolean;
}

class ContactIntegrationService {
  private contacts: Contact[] = [];
  private hasPermission: boolean = false;
  private lastCacheTime: number = 0;
  private cacheExpiration = 5 * 60 * 1000; // 5 minutes

  async initialize(): Promise<void> {
    try {
      await this.checkPermission();
      logger.info('[ContactIntegrationService] ContactIntegrationService initialized (simplified version)');
    } catch (error) {
      logger.error('[ContactIntegrationService] Failed to initialize ContactIntegrationService', error);
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // On iOS, assume permission for now
        this.hasPermission = true;
      } else {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
        this.hasPermission = granted;
      }
      return this.hasPermission;
    } catch (error) {
      logger.error('[ContactIntegrationService] Failed to check contacts permission', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS permission would be handled by react-native-contacts
        this.hasPermission = true;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'This app needs access to your contacts for sharing',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        this.hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return this.hasPermission;
    } catch (error) {
      logger.error('[ContactIntegrationService] Failed to request contacts permission', error);
      return false;
    }
  }

  async getAllContacts(): Promise<Contact[]> {
    if (!this.hasPermission) {
      throw new Error('Contacts permission not granted');
    }

    // Check cache
    if (this.contacts.length > 0 && (Date.now() - this.lastCacheTime) < this.cacheExpiration) {
      return this.contacts;
    }

    try {
      // In a real implementation, this would fetch from react-native-contacts
      // For now, return mock contacts
      this.contacts = [
        {
          recordID: '1',
          displayName: 'John Doe',
          givenName: 'John',
          familyName: 'Doe',
          phoneNumbers: [{ label: 'mobile', number: '+1234567890' }],
          emailAddresses: [{ label: 'home', email: 'john@example.com' }],
        },
        {
          recordID: '2',
          displayName: 'Jane Smith',
          givenName: 'Jane',
          familyName: 'Smith',
          phoneNumbers: [{ label: 'mobile', number: '+1234567891' }],
          emailAddresses: [{ label: 'work', email: 'jane@company.com' }],
        },
      ];

      this.lastCacheTime = Date.now();
      return this.contacts;
    } catch (error) {
      logger.error('[ContactIntegrationService] Failed to get all contacts', error);
      throw error;
    }
  }

  async searchContacts(query: string, options: Partial<ContactSearchOptions> = {}): Promise<Contact[]> {
    if (!this.hasPermission) {
      throw new Error('Contacts permission not granted');
    }

    try {
      const allContacts = await this.getAllContacts();
      const filteredContacts = allContacts.filter(contact =>
        contact.displayName.toLowerCase().includes(query.toLowerCase()) ||
        contact.givenName.toLowerCase().includes(query.toLowerCase()) ||
        contact.familyName.toLowerCase().includes(query.toLowerCase()),
      );

      const maxResults = options.maxResults || 50;
      return filteredContacts.slice(0, maxResults);
    } catch (error) {
      logger.error('[ContactIntegrationService] Failed to search contacts', error);
      throw error;
    }
  }

  async selectContactsForSharing(maxContacts: number = 10): Promise<Contact[]> {
    if (!this.hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        throw new Error('Contacts permission required for sharing');
      }
    }

    try {
      // In a real implementation, this would show a contact picker
      // For now, return first few contacts
      const allContacts = await this.getAllContacts();
      return allContacts.slice(0, maxContacts);
    } catch (error) {
      logger.error('[ContactIntegrationService] Failed to select contacts for sharing', error);
      throw error;
    }
  }

  clearCache(): void {
    this.contacts = [];
    this.lastCacheTime = 0;
  }
}

export const contactIntegrationService = new ContactIntegrationService();
export default contactIntegrationService;
