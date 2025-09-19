import express from 'express';
import { LearningService } from '../services/learning.service';
import { authMiddleware, requirePermission } from '../middleware';
import { createLogger } from '@hrms/shared';

const logger = createLogger('dashboard-routes');

export function createDashboardRoutes(learningService: LearningService): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  /**
   * Get personalized learning dashboard for current user
   */
  router.get(
    '/my-dashboard',
    async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        // This would be implemented in the LearningService
        const dashboard = await learningService.getPersonalizedDashboard(userId);
        
        res.json({
          success: true,
          data: dashboard,
        });
      } catch (error) {
        logger.error('Error getting personal dashboard', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get personal dashboard',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get admin learning dashboard
   */
  router.get(
    '/admin',
    requirePermission('dashboard.view_admin'),
    async (req, res) => {
      try {
        const dashboard = await learningService.getAdminDashboard();
        
        res.json({
          success: true,
          data: dashboard,
        });
      } catch (error) {
        logger.error('Error getting admin dashboard', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get admin dashboard',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get manager dashboard for team overview
   */
  router.get(
    '/manager',
    requirePermission('dashboard.view_manager'),
    async (req, res) => {
      try {
        const managerId = (req as any).user?.id;
        const { teamId, departmentId } = req.query;
        
        const dashboard = await learningService.getManagerDashboard(managerId);
        
        res.json({
          success: true,
          data: dashboard,
        });
      } catch (error) {
        logger.error('Error getting manager dashboard', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get manager dashboard',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get learning recommendations for current user
   */
  router.get(
    '/recommendations',
    async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        const { limit = 10, type } = req.query;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        const recommendations = await learningService.getPersonalizedRecommendations(
          userId,
          parseInt(limit as string)
        );
        
        res.json({
          success: true,
          data: recommendations,
        });
      } catch (error) {
        logger.error('Error getting recommendations', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get recommendations',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get quick stats for dashboard widgets
   */
  router.get(
    '/quick-stats',
    async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        const stats = await learningService.getQuickStats(userId);
        
        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        logger.error('Error getting quick stats', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get quick stats',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get recent learning activity
   */
  router.get(
    '/recent-activity',
    async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        const { limit = 20 } = req.query;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        const activity = await learningService.getRecentActivity(
          userId,
          parseInt(limit as string)
        );
        
        res.json({
          success: true,
          data: activity,
        });
      } catch (error) {
        logger.error('Error getting recent activity', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get recent activity',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get upcoming learning deadlines
   */
  router.get(
    '/upcoming-deadlines',
    async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        const { days = 30 } = req.query;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        const deadlines = await learningService.getUpcomingDeadlines(
          userId,
          parseInt(days as string)
        );
        
        res.json({
          success: true,
          data: deadlines,
        });
      } catch (error) {
        logger.error('Error getting upcoming deadlines', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get upcoming deadlines',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get learning goals progress
   */
  router.get(
    '/goals-progress',
    async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        const goalsProgress = await learningService.getLearningGoalsProgress(userId);
        
        res.json({
          success: true,
          data: goalsProgress,
        });
      } catch (error) {
        logger.error('Error getting goals progress', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get goals progress',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get skill progress overview
   */
  router.get(
    '/skill-progress',
    async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        const skillProgress = await learningService.getSkillProgress(userId);
        
        res.json({
          success: true,
          data: skillProgress,
        });
      } catch (error) {
        logger.error('Error getting skill progress', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get skill progress',
          details: (error as Error).message,
        });
      }
    }
  );

  return router;
}
