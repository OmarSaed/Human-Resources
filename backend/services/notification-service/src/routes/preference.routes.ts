import express from 'express';
import Joi from 'joi';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('preference-routes');
const router = express.Router();

// Validation schemas
const updatePreferencesSchema = Joi.object({
  emailEnabled: Joi.boolean().optional(),
  smsEnabled: Joi.boolean().optional(),
  pushEnabled: Joi.boolean().optional(),
  employeeUpdates: Joi.boolean().optional(),
  systemAlerts: Joi.boolean().optional(),
  recruitmentUpdates: Joi.boolean().optional(),
  performanceUpdates: Joi.boolean().optional(),
  learningUpdates: Joi.boolean().optional(),
  attendanceAlerts: Joi.boolean().optional(),
  quietHoursStart: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quietHoursEnd: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  timezone: Joi.string().optional(),
});

export function createPreferenceRoutes(prisma: PrismaClient): express.Router {

  /**
   * Get user notification preferences
   */
  router.get('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      let preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      // Create default preferences if they don't exist
      if (!preferences) {
        preferences = await prisma.notificationPreference.create({
          data: {
            userId,
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
          },
        });
      }

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
  });

  /**
   * Update user notification preferences
   */
  router.put('/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { error, value } = updatePreferencesSchema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details,
        });
      }

      const preferences = await prisma.notificationPreference.upsert({
        where: { userId },
        update: {
          ...value,
          updatedAt: new Date(),
        },
        create: {
          userId,
          ...value,
          emailEnabled: value.emailEnabled ?? true,
          smsEnabled: value.smsEnabled ?? false,
          pushEnabled: value.pushEnabled ?? true,
          employeeUpdates: value.employeeUpdates ?? true,
          systemAlerts: value.systemAlerts ?? true,
          recruitmentUpdates: value.recruitmentUpdates ?? true,
          performanceUpdates: value.performanceUpdates ?? true,
          learningUpdates: value.learningUpdates ?? true,
          attendanceAlerts: value.attendanceAlerts ?? true,
          timezone: value.timezone ?? 'UTC',
        },
      });

      res.json({
        success: true,
        preferences,
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update user preferences', error as Error);
      res.status(500).json({
        error: 'Failed to update user preferences',
        message: (error as Error).message,
      });
    }
  });

  return router;
}
