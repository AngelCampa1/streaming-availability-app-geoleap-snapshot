import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid,  Alert, Platform } from 'react-native';
import { logger } from '../utils/logger';

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
  recurrence?: string;
  alarm?: number;
  url?: string;
}

export interface CalendarReminder {
  id: string;
  contentId: string;
  contentTitle: string;
  reminderDate: Date;
  reminderType: 'watch' | 'release' | 'update' | 'custom';
  isActive: boolean;
  calendarEventId?: string;
}

class CalendarIntegrationService {
  private reminders: CalendarReminder[] = [];
  private hasPermission: boolean = false;
  private config = {
    defaultReminderTime: 30, // minutes before
    enableNotifications: true,
    autoSync: true,
  };

  async initialize(): Promise<void> {
    try {
      await this.loadReminders();
      logger.info('[CalendarIntegrationService] CalendarIntegrationService initialized (simplified version)');
    } catch (error) {
      logger.error('[CalendarIntegrationService] Failed to initialize CalendarIntegrationService', error);
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // On iOS, assume permission granted for now
        this.hasPermission = true;
      } else {
        // On Android, check calendar permission
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR);
        this.hasPermission = granted;
      }
      return this.hasPermission;
    } catch (error) {
      logger.error('[CalendarIntegrationService] Failed to check calendar permissions', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS calendar permission would be handled by react-native-calendar-events
        this.hasPermission = true;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_CALENDAR,
          {
            title: 'Calendar Permission',
            message: 'This app needs access to your calendar to create reminders',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        this.hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return this.hasPermission;
    } catch (error) {
      logger.error('[CalendarIntegrationService] Failed to request calendar permissions', error);
      return false;
    }
  }

  async createContentReminder(
    contentId: string,
    contentTitle: string,
    reminderDate: Date,
    reminderType: 'watch' | 'release' | 'update' | 'custom',
    _customMessage?: string,
  ): Promise<string> {
    if (!this.hasPermission) {
      throw new Error('Calendar permission not granted');
    }

    const reminderId = `${contentId}_${Date.now()}`;
    const reminder: CalendarReminder = {
      id: reminderId,
      contentId,
      contentTitle,
      reminderDate,
      reminderType,
      isActive: true,
    };

    try {
      // In a real implementation, this would create an actual calendar event
      // For now, we just store the reminder locally
      this.reminders.push(reminder);
      await this.saveReminders();

      Alert.alert('Reminder Created', `Reminder set for ${contentTitle}`);
      return reminderId;
    } catch (error) {
      logger.error('[CalendarIntegrationService] Failed to create calendar reminder', error);
      throw error;
    }
  }

  async updateContentReminder(contentId: string, newDate: Date): Promise<void> {
    const reminder = this.reminders.find(r => r.contentId === contentId && r.isActive);
    if (reminder) {
      reminder.reminderDate = newDate;
      await this.saveReminders();
    }
  }

  async cancelContentReminder(contentId: string): Promise<void> {
    const reminder = this.reminders.find(r => r.contentId === contentId && r.isActive);
    if (reminder) {
      reminder.isActive = false;
      await this.saveReminders();
    }
  }

  getActiveReminders(): CalendarReminder[] {
    return this.reminders.filter(r => r.isActive);
  }

  private async loadReminders(): Promise<void> {
    try {
      const remindersJson = await AsyncStorage.getItem('calendarReminders');
      if (remindersJson) {
        const loadedReminders = JSON.parse(remindersJson);
        this.reminders = loadedReminders.map((r: any) => ({
          ...r,
          reminderDate: new Date(r.reminderDate),
        }));
      }
    } catch (error) {
      logger.error('[CalendarIntegrationService] Failed to load reminders', error);
    }
  }

  private async saveReminders(): Promise<void> {
    try {
      await AsyncStorage.setItem('calendarReminders', JSON.stringify(this.reminders));
    } catch (error) {
      logger.error('[CalendarIntegrationService] Failed to save reminders', error);
    }
  }
}

export const calendarIntegrationService = new CalendarIntegrationService();
export default calendarIntegrationService;
