import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { NotificationPreferenceService } from '../services/notification-preference.service';

const logger = createLogger('notification-preference-controller');

export class NotificationPreferenceController {
  constructor(private preferenceService: NotificationPreferenceService) {}

  /**
   * Get user notification preferences
   */
  getUserPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;

      const preferences = await this.preferenceService.getUserPreferences(userId);

      res.json({
        success: true,
        preferences,
      });
    } catch (error) {
      logger.error('Failed to get user preferences', error as Error);
      res.status(500).json({
        error: 'Failed to get user preferences',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update user notification preferences
   */
  updateUserPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const preferences = await this.preferenceService.updateUserPreferences(userId, updates);

      logger.info('User preferences updated', {
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        preferences,
        message: 'Notification preferences updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update user preferences', error as Error);
      res.status(500).json({
        error: 'Failed to update user preferences',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Reset user preferences to defaults
   */
  resetUserPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;

      const preferences = await this.preferenceService.resetUserPreferences(userId);

      logger.info('User preferences reset to defaults', { userId });

      res.json({
        success: true,
        preferences,
        message: 'Notification preferences reset to defaults',
      });
    } catch (error) {
      logger.error('Failed to reset user preferences', error as Error);
      res.status(500).json({
        error: 'Failed to reset user preferences',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update channel preferences
   */
  updateChannelPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { emailEnabled, smsEnabled, pushEnabled } = req.body;

      const preferences = await this.preferenceService.updateChannelPreferences(userId, {
        emailEnabled,
        smsEnabled,
        pushEnabled,
      });

      logger.info('Channel preferences updated', {
        userId,
        emailEnabled,
        smsEnabled,
        pushEnabled,
      });

      res.json({
        success: true,
        preferences,
        message: 'Channel preferences updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update channel preferences', error as Error);
      res.status(500).json({
        error: 'Failed to update channel preferences',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update type preferences
   */
  updateTypePreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const typePreferences = req.body;

      const preferences = await this.preferenceService.updateTypePreferences(userId, typePreferences);

      logger.info('Type preferences updated', {
        userId,
        typePreferences: Object.keys(typePreferences),
      });

      res.json({
        success: true,
        preferences,
        message: 'Type preferences updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update type preferences', error as Error);
      res.status(500).json({
        error: 'Failed to update type preferences',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update quiet hours
   */
  updateQuietHours = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { quietHoursStart, quietHoursEnd, timezone } = req.body;

      const preferences = await this.preferenceService.updateQuietHours(userId, {
        quietHoursStart,
        quietHoursEnd,
        timezone,
      });

      logger.info('Quiet hours updated', {
        userId,
        quietHoursStart,
        quietHoursEnd,
        timezone,
      });

      res.json({
        success: true,
        preferences,
        message: 'Quiet hours updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update quiet hours', error as Error);
      res.status(500).json({
        error: 'Failed to update quiet hours',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get default preferences
   */
  getDefaultPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const defaults = await this.preferenceService.getDefaultPreferences();

      res.json({
        success: true,
        defaults,
      });
    } catch (error) {
      logger.error('Failed to get default preferences', error as Error);
      res.status(500).json({
        error: 'Failed to get default preferences',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Bulk update preferences for multiple users (admin only)
   */
  bulkUpdatePreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { userIds, preferences } = req.body;

      const result = await this.preferenceService.bulkUpdatePreferences(userIds, preferences, userId);

      logger.info('Bulk preferences update completed', {
        totalUsers: userIds.length,
        successful: result.successful,
        failed: result.failed,
        adminUserId: userId,
      });

      res.json({
        success: true,
        result,
        message: `${result.successful} user preferences updated successfully, ${result.failed} failed`,
      });
    } catch (error) {
      logger.error('Failed to bulk update preferences', error as Error);
      res.status(500).json({
        error: 'Failed to bulk update preferences',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Export user preferences
   */
  exportUserPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;

      const exportData = await this.preferenceService.exportUserPreferences(userId);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="notification-preferences-${userId}.json"`);
      res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
      logger.error('Failed to export user preferences', error as Error);
      res.status(500).json({
        error: 'Failed to export user preferences',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Import user preferences
   */
  importUserPreferences = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { preferences } = req.body;

      const result = await this.preferenceService.importUserPreferences(userId, preferences);

      logger.info('User preferences imported', { userId });

      res.json({
        success: true,
        preferences: result,
        message: 'Notification preferences imported successfully',
      });
    } catch (error) {
      logger.error('Failed to import user preferences', error as Error);
      res.status(500).json({
        error: 'Failed to import user preferences',
        message: (error as Error).message,
      });
    }
  };
}
