import express from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { authMiddleware, requirePermission, validateRequest } from '../middleware';
import { createLogger } from '@hrms/shared';

const logger = createLogger('analytics-routes');

export function createAnalyticsRoutes(analyticsService: AnalyticsService): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  /**
   * Get comprehensive learning analytics
   */
  router.get(
    '/overview',
    requirePermission('analytics.view'),
    async (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        
        const analytics = await analyticsService.getLearningAnalytics(
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
        
        res.json({
          success: true,
          data: analytics,
        });
      } catch (error) {
        logger.error('Error getting learning analytics', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get learning analytics',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get analytics for a specific course
   */
  router.get(
    '/course/:courseId',
    requirePermission('analytics.view_course'),
    async (req, res) => {
      try {
        const { courseId } = req.params;
        
        const analytics = await analyticsService.getCourseAnalytics(courseId);
        
        res.json({
          success: true,
          data: analytics,
        });
      } catch (error) {
        logger.error('Error getting course analytics', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get course analytics',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get analytics for a specific employee
   */
  router.get(
    '/employee/:employeeId',
    async (req, res) => {
      try {
        const { employeeId } = req.params;
        const userId = (req as any).user?.id;

        // Allow users to view their own analytics or require permission for others
        if (employeeId !== userId && !(req as any).user?.permissions?.includes('analytics.view_employee')) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
          });
        }
        
        const analytics = await analyticsService.getEmployeeAnalytics(employeeId);
        
        res.json({
          success: true,
          data: analytics,
        });
      } catch (error) {
        logger.error('Error getting employee analytics', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get employee analytics',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get skill gap analysis
   */
  router.get(
    '/skill-gaps',
    requirePermission('analytics.view_skill_gaps'),
    async (req, res) => {
      try {
        const { departmentId } = req.query;
        
        const skillGaps = await analyticsService.getSkillGapAnalysis(
          departmentId as string
        );
        
        res.json({
          success: true,
          data: skillGaps,
        });
      } catch (error) {
        logger.error('Error getting skill gap analysis', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get skill gap analysis',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get learning ROI metrics
   */
  router.get(
    '/roi',
    requirePermission('analytics.view_roi'),
    async (req, res) => {
      try {
        const { startDate, endDate } = req.query;
        
        const roiMetrics = await analyticsService.getLearningROI(
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
        
        res.json({
          success: true,
          data: roiMetrics,
        });
      } catch (error) {
        logger.error('Error getting learning ROI', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get learning ROI',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get current user's personal analytics
   */
  router.get(
    '/my-analytics',
    async (req, res) => {
      try {
        const userId = (req as any).user?.id;
        
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated',
          });
        }
        
        const analytics = await analyticsService.getEmployeeAnalytics(userId);
        
        res.json({
          success: true,
          data: analytics,
        });
      } catch (error) {
        logger.error('Error getting user analytics', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get personal analytics',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Export analytics data
   */
  router.post(
    '/export',
    requirePermission('analytics.export'),
    validateRequest({
      body: {
        type: { type: 'string', required: true, enum: ['overview', 'course', 'employee', 'skill-gaps', 'roi'] },
        format: { type: 'string', required: true, enum: ['csv', 'xlsx', 'pdf'] },
        filters: { type: 'object', required: false },
        startDate: { type: 'string', required: false },
        endDate: { type: 'string', required: false },
      },
    }),
    async (req, res) => {
      try {
        const { type, format, filters, startDate, endDate } = req.body;
        
        // This would generate and return the export file
        // For now, we'll return a placeholder response
        
        logger.info('Analytics export requested', { 
          type, 
          format, 
          userId: (req as any).user?.id 
        });
        
        res.json({
          success: true,
          message: 'Export request processed',
          data: {
            downloadUrl: `/downloads/analytics-${type}-${Date.now()}.${format}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        });
      } catch (error) {
        logger.error('Error exporting analytics data', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to export analytics data',
          details: (error as Error).message,
        });
      }
    }
  );

  /**
   * Get real-time learning dashboard data
   */
  router.get(
    '/dashboard',
    requirePermission('analytics.view_dashboard'),
    async (req, res) => {
      try {
        // Get key metrics for dashboard
        const [overview, recentActivity] = await Promise.all([
          analyticsService.getLearningAnalytics(),
          // This would get recent learning activity
          Promise.resolve([]), // Placeholder
        ]);
        
        const dashboardData = {
          overview: overview.overview,
          trends: {
            enrollmentsToday: 0, // Would calculate from today's data
            completionsToday: 0,
            activeUsers: 0,
            popularCourses: overview.trends.popularCourses.slice(0, 5),
          },
          recentActivity,
          alerts: [], // System alerts/notifications
        };
        
        res.json({
          success: true,
          data: dashboardData,
        });
      } catch (error) {
        logger.error('Error getting dashboard data', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get dashboard data',
          details: (error as Error).message,
        });
      }
    }
  );

  return router;
}
