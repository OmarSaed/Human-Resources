import express from 'express';
import { NotificationPreferenceController } from '../controllers/notification-preference.controller';
import { authMiddleware, requirePermission, validatePreferencesUpdate, rateLimit } from '../middleware';

export function createNotificationPreferenceRoutes(preferenceController: NotificationPreferenceController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Apply rate limiting to preference updates
  router.use(rateLimit(50, 60000)); // 50 updates per minute

  // User preference management
  router.get(
    '/me',
    preferenceController.getUserPreferences
  );

  router.put(
    '/me',
    validatePreferencesUpdate,
    preferenceController.updateUserPreferences
  );

  router.post(
    '/me/reset',
    preferenceController.resetUserPreferences
  );

  // Channel preferences
  router.put(
    '/me/channels',
    preferenceController.updateChannelPreferences
  );

  // Type preferences
  router.put(
    '/me/types',
    preferenceController.updateTypePreferences
  );

  // Quiet hours
  router.put(
    '/me/quiet-hours',
    preferenceController.updateQuietHours
  );

  // Default preferences
  router.get(
    '/defaults',
    preferenceController.getDefaultPreferences
  );

  // Import/Export preferences
  router.get(
    '/me/export',
    preferenceController.exportUserPreferences
  );

  router.post(
    '/me/import',
    preferenceController.importUserPreferences
  );

  // Admin operations
  router.post(
    '/bulk-update',
    requirePermission('notification_preference.bulk_update'),
    preferenceController.bulkUpdatePreferences
  );

  return router;
}
