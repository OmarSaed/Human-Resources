import express from 'express';
import { ProgressService } from '../services/progress.service';
import { authMiddleware, requirePermission, validateRequest } from '../middleware';
import { createLogger } from '@hrms/shared';

const logger = createLogger('progress-routes');

export function createProgressRoutes(progressService: ProgressService): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  /**
   * Get learning progress for a specific enrollment
   */
  router.get(
    '/enrollment/:enrollmentId',
    async (req, res) => {
      try {
        const { enrollmentId } = req.params;
        
        const progress = await progressService.getLearningProgress(enrollmentId);
        
        if (!progress) {
          return res.status(404).json({
            success: false,
            error: 'Learning progress not found',
          });
        }

        res.json({
          success: true,
          data: progress,
        });
      } catch (error) {
        logger.error('Error getting learning progress', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get learning progress',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Update learning progress
   */
  router.put(
    '/enrollment/:enrollmentId',
    validateRequest({
      body: {
        progressPercentage: { type: 'number', required: false, min: 0, max: 100 },
        timeSpent: { type: 'number', required: false, min: 0 },
        currentChapter: { type: 'string', required: false },
        currentLesson: { type: 'string', required: false },
      },
    }),
    async (req, res) => {
      try {
        const { enrollmentId } = req.params;
        const progressData = req.body;
        
        const updatedProgress = await progressService.updateProgress(enrollmentId, progressData);
        
        res.json({
          success: true,
          data: updatedProgress,
          message: 'Progress updated successfully',
        });
      } catch (error) {
        logger.error('Error updating learning progress', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to update learning progress',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get progress summary for an employee
   */
  router.get(
    '/employee/:employeeId/summary',
    async (req, res) => {
      try {
        const { employeeId } = req.params;
        const userId = (req as any).user?.id;

        // Allow users to view their own progress or require permission for others
        if (employeeId !== userId && !(req as any).user?.permissions?.includes('progress.view_all')) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
          });
        }
        
        const summary = await progressService.getProgressSummary(employeeId);
        
        res.json({
          success: true,
          data: summary,
        });
      } catch (error) {
        logger.error('Error getting progress summary', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get progress summary',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get progress analytics for an employee
   */
  router.get(
    '/employee/:employeeId/analytics',
    async (req, res) => {
      try {
        const { employeeId } = req.params;
        const { startDate, endDate } = req.query;
        const userId = (req as any).user?.id;

        // Allow users to view their own analytics or require permission for others
        if (employeeId !== userId && !(req as any).user?.permissions?.includes('progress.view_analytics')) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
          });
        }
        
        const analytics = await progressService.getProgressAnalytics(
          employeeId,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
        
        res.json({
          success: true,
          data: analytics,
        });
      } catch (error) {
        logger.error('Error getting progress analytics', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get progress analytics',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Track learning session
   */
  router.post(
    '/session/:enrollmentId',
    validateRequest({
      body: {
        timeSpent: { type: 'number', required: true, min: 0 },
        progressGained: { type: 'number', required: true, min: 0, max: 100 },
        chaptersCompleted: { type: 'array', required: false },
        lessonsCompleted: { type: 'array', required: false },
      },
    }),
    async (req, res) => {
      try {
        const { enrollmentId } = req.params;
        const sessionData = req.body;
        
        await progressService.trackSession(enrollmentId, sessionData);
        
        res.json({
          success: true,
          message: 'Learning session tracked successfully',
        });
      } catch (error) {
        logger.error('Error tracking learning session', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to track learning session',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get learning streaks for an employee
   */
  router.get(
    '/employee/:employeeId/streaks',
    async (req, res) => {
      try {
        const { employeeId } = req.params;
        const userId = (req as any).user?.id;

        // Allow users to view their own streaks or require permission for others
        if (employeeId !== userId && !(req as any).user?.permissions?.includes('progress.view_all')) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
          });
        }
        
        const streaks = await progressService.getLearningStreaks(employeeId);
        
        res.json({
          success: true,
          data: streaks,
        });
      } catch (error) {
        logger.error('Error getting learning streaks', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get learning streaks',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get current user's progress summary
   */
  router.get(
    '/my-summary',
    async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        const summary = await progressService.getProgressSummary(userId);
        
        res.json({
          success: true,
          data: summary,
        });
      } catch (error) {
        logger.error('Error getting user progress summary', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get progress summary',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get current user's analytics
   */
  router.get(
    '/my-analytics',
    async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        const { startDate, endDate } = req.query;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        const analytics = await progressService.getProgressAnalytics(
          userId,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
        
        res.json({
          success: true,
          data: analytics,
        });
      } catch (error) {
        logger.error('Error getting user analytics', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get analytics',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get current user's learning streaks
   */
  router.get(
    '/my-streaks',
    async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        const streaks = await progressService.getLearningStreaks(userId);
        
        res.json({
          success: true,
          data: streaks,
        });
      } catch (error) {
        logger.error('Error getting user streaks', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get learning streaks',
          details: (error as Error).message,
        });
      }
    }
  );

  return router;
}
