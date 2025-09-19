import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import {
  NotificationPreferenceData,
  ChannelPreferences,
  TypePreferences,
  QuietHoursPreferences
} from '../models/preference.models';

const logger = createLogger('notification-preference-service');


export class NotificationPreferenceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<any> {
    try {
      let preferences = await this.prisma.notificationPreference.findUnique({
        where: { userId },
      });

      // Create default preferences if none exist
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      return preferences;
    } catch (error) {
      logger.error('Failed to get user preferences', { error: error as Error, userId });
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, updates: NotificationPreferenceData): Promise<any> {
    try {
      // Ensure preferences exist
      await this.ensurePreferencesExist(userId);

      const preferences = await this.prisma.notificationPreference.update({
        where: { userId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });

      logger.info('User preferences updated', { userId, updates: Object.keys(updates) });

      return preferences;
    } catch (error) {
      logger.error('Failed to update user preferences', { error: error as Error, userId });
      throw error;
    }
  }

  /**
   * Reset user preferences to defaults
   */
  async resetUserPreferences(userId: string): Promise<any> {
    try {
      const defaultPrefs = this.getDefaultPreferenceValues();

      const preferences = await this.prisma.notificationPreference.upsert({
        where: { userId },
        update: {
          ...defaultPrefs,
          updatedAt: new Date(),
        },
        create: {
          userId,
          ...defaultPrefs,
        },
      });

      logger.info('User preferences reset to defaults', { userId });

      return preferences;
    } catch (error) {
      logger.error('Failed to reset user preferences', { error: error as Error, userId });
      throw error;
    }
  }

  /**
   * Update channel preferences
   */
  async updateChannelPreferences(userId: string, channelPrefs: ChannelPreferences): Promise<any> {
    try {
      await this.ensurePreferencesExist(userId);

      const preferences = await this.prisma.notificationPreference.update({
        where: { userId },
        data: {
          emailEnabled: channelPrefs.emailEnabled,
          smsEnabled: channelPrefs.smsEnabled,
          pushEnabled: channelPrefs.pushEnabled,
          updatedAt: new Date(),
        },
      });

      logger.info('Channel preferences updated', { userId, channelPrefs });

      return preferences;
    } catch (error) {
      logger.error('Failed to update channel preferences', { error: error as Error, userId });
      throw error;
    }
  }

  /**
   * Update type preferences
   */
  async updateTypePreferences(userId: string, typePrefs: TypePreferences): Promise<any> {
    try {
      await this.ensurePreferencesExist(userId);

      const preferences = await this.prisma.notificationPreference.update({
        where: { userId },
        data: {
          employeeUpdates: typePrefs.employeeUpdates,
          systemAlerts: typePrefs.systemAlerts,
          recruitmentUpdates: typePrefs.recruitmentUpdates,
          performanceUpdates: typePrefs.performanceUpdates,
          learningUpdates: typePrefs.learningUpdates,
          attendanceAlerts: typePrefs.attendanceAlerts,
          updatedAt: new Date(),
        },
      });

      logger.info('Type preferences updated', { userId, typePrefs });

      return preferences;
    } catch (error) {
      logger.error('Failed to update type preferences', { error: error as Error, userId });
      throw error;
    }
  }

  /**
   * Update quiet hours
   */
  async updateQuietHours(userId: string, quietHours: QuietHoursPreferences): Promise<any> {
    try {
      await this.ensurePreferencesExist(userId);

      const preferences = await this.prisma.notificationPreference.update({
        where: { userId },
        data: {
          quietHoursStart: quietHours.quietHoursStart,
          quietHoursEnd: quietHours.quietHoursEnd,
          timezone: quietHours.timezone,
          updatedAt: new Date(),
        },
      });

      logger.info('Quiet hours updated', { userId, quietHours });

      return preferences;
    } catch (error) {
      logger.error('Failed to update quiet hours', { error: error as Error, userId });
      throw error;
    }
  }

  /**
   * Get default preferences
   */
  async getDefaultPreferences(): Promise<NotificationPreferenceData> {
    return this.getDefaultPreferenceValues();
  }

  /**
   * Bulk update preferences for multiple users
   */
  async bulkUpdatePreferences(
    userIds: string[], 
    preferences: NotificationPreferenceData, 
    adminUserId: string
  ): Promise<{ successful: number; failed: number; results: any[] }> {
    try {
      // Check if requesting user has admin permissions
      const hasPermission = await this.checkAdminPermission(adminUserId);
      if (!hasPermission) {
        throw new Error('Insufficient permissions for bulk update');
      }

      let successful = 0;
      let failed = 0;
      const results = [];

      for (const userId of userIds) {
        try {
          const updatedPreferences = await this.updateUserPreferences(userId, preferences);
          results.push({
            userId,
            success: true,
            preferences: updatedPreferences,
          });
          successful++;
        } catch (error) {
          results.push({
            userId,
            success: false,
            error: (error as Error).message,
          });
          failed++;
        }
      }

      logger.info('Bulk preferences update completed', {
        total: userIds.length,
        successful,
        failed,
        adminUserId,
      });

      return { successful, failed, results };
    } catch (error) {
      logger.error('Failed to bulk update preferences', error as Error);
      throw error;
    }
  }

  /**
   * Export user preferences
   */
  async exportUserPreferences(userId: string): Promise<any> {
    try {
      const preferences = await this.getUserPreferences(userId);

      return {
        userId,
        exportedAt: new Date().toISOString(),
        preferences: {
          channelPreferences: {
            emailEnabled: preferences.emailEnabled,
            smsEnabled: preferences.smsEnabled,
            pushEnabled: preferences.pushEnabled,
          },
          typePreferences: {
            employeeUpdates: preferences.employeeUpdates,
            systemAlerts: preferences.systemAlerts,
            recruitmentUpdates: preferences.recruitmentUpdates,
            performanceUpdates: preferences.performanceUpdates,
            learningUpdates: preferences.learningUpdates,
            attendanceAlerts: preferences.attendanceAlerts,
          },
          quietHours: {
            start: preferences.quietHoursStart,
            end: preferences.quietHoursEnd,
            timezone: preferences.timezone,
          },
        },
        metadata: {
          createdAt: preferences.createdAt,
          updatedAt: preferences.updatedAt,
        },
      };
    } catch (error) {
      logger.error('Failed to export user preferences', { error: error as Error, userId });
      throw error;
    }
  }

  /**
   * Import user preferences
   */
  async importUserPreferences(userId: string, importData: any): Promise<any> {
    try {
      // Validate import data structure
      if (!importData.preferences) {
        throw new Error('Invalid import data: missing preferences');
      }

      const { channelPreferences, typePreferences, quietHours } = importData.preferences;

      // Build update data
      const updateData: NotificationPreferenceData = {};

      if (channelPreferences) {
        updateData.emailEnabled = channelPreferences.emailEnabled;
        updateData.smsEnabled = channelPreferences.smsEnabled;
        updateData.pushEnabled = channelPreferences.pushEnabled;
      }

      if (typePreferences) {
        updateData.employeeUpdates = typePreferences.employeeUpdates;
        updateData.systemAlerts = typePreferences.systemAlerts;
        updateData.recruitmentUpdates = typePreferences.recruitmentUpdates;
        updateData.performanceUpdates = typePreferences.performanceUpdates;
        updateData.learningUpdates = typePreferences.learningUpdates;
        updateData.attendanceAlerts = typePreferences.attendanceAlerts;
      }

      if (quietHours) {
        updateData.quietHoursStart = quietHours.start;
        updateData.quietHoursEnd = quietHours.end;
        updateData.timezone = quietHours.timezone;
      }

      const preferences = await this.updateUserPreferences(userId, updateData);

      logger.info('User preferences imported', { userId });

      return preferences;
    } catch (error) {
      logger.error('Failed to import user preferences', { error: error as Error, userId });
      throw error;
    }
  }

  /**
   * Check if user is currently in quiet hours
   */
  async isInQuietHours(userId: string): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);

      if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
        return false; // No quiet hours set
      }

      const now = new Date();
      const userTimezone = preferences.timezone || 'UTC';

      // Convert current time to user's timezone
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      const currentHour = userTime.getHours();
      const currentMinute = userTime.getMinutes();
      const currentTime = currentHour * 60 + currentMinute; // Convert to minutes

      // Parse quiet hours
      const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
      const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
      
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      // Handle quiet hours that span midnight
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime;
      } else {
        return currentTime >= startTime && currentTime <= endTime;
      }
    } catch (error) {
      logger.error('Failed to check quiet hours', { error: error as Error, userId });
      return false; // Default to not in quiet hours on error
    }
  }

  // Private helper methods

  private async createDefaultPreferences(userId: string): Promise<any> {
    try {
      const defaultPrefs = this.getDefaultPreferenceValues();

      const preferences = await this.prisma.notificationPreference.create({
        data: {
          userId,
          ...defaultPrefs,
        },
      });

      logger.info('Default preferences created for user', { userId });

      return preferences;
    } catch (error) {
      logger.error('Failed to create default preferences', { error: error as Error, userId });
      throw error;
    }
  }

  private async ensurePreferencesExist(userId: string): Promise<void> {
    try {
      const existing = await this.prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (!existing) {
        await this.createDefaultPreferences(userId);
      }
    } catch (error) {
      logger.error('Failed to ensure preferences exist', { error: error as Error, userId });
      throw error;
    }
  }

  private getDefaultPreferenceValues(): NotificationPreferenceData {
    return {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      employeeUpdates: true,
      systemAlerts: true,
      recruitmentUpdates: true,
      performanceUpdates: true,
      learningUpdates: true,
      attendanceAlerts: true,
      timezone: 'UTC',
    };
  }

  private async checkAdminPermission(userId: string): Promise<boolean> {
    // This would check if user has admin or HR manager role
    // For now, return true to allow the operation
    return true;
  }
}
