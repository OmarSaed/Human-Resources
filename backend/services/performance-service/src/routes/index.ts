import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PerformanceReviewController } from '../controllers/performance-review.controller';
import { GoalController } from '../controllers/goal.controller';
import { DevelopmentPlanController } from '../controllers/development-plan.controller';
import { CompetencyFrameworkController } from '../controllers/competency-framework.controller';
import { CompetencyAssessmentController } from '../controllers/competency-assessment.controller';
import { PerformanceMetricController } from '../controllers/performance-metric.controller';
import { ReviewFeedbackController } from '../controllers/review-feedback.controller';
import { PerformanceReviewService } from '../services/performance-review.service';
import { GoalService } from '../services/goal.service';
import { DevelopmentPlanService } from '../services/development-plan.service';
import { CompetencyFrameworkService } from '../services/competency-framework.service';
import { CompetencyAssessmentService } from '../services/competency-assessment.service';
import { PerformanceMetricService } from '../services/performance-metric.service';
import { ReviewFeedbackService } from '../services/review-feedback.service';
import { AuditService, NotificationService } from '@hrms/shared';
import { ExternalService } from '../services/external.service';
import { createPerformanceReviewRoutes } from './performance-review.routes';
import { createGoalRoutes } from './goal.routes';
import { createDevelopmentPlanRoutes } from './development-plan.routes';
import { createCompetencyFrameworkRoutes } from './competency-framework.routes';
import { createCompetencyAssessmentRoutes } from './competency-assessment.routes';
import { createPerformanceMetricRoutes } from './performance-metric.routes';
import { createReviewFeedbackRoutes } from './review-feedback.routes';

export function createRoutes(prismaClient: PrismaClient, externalService: ExternalService): Router {
  const router = Router();

  // Initialize services
  const auditService = new AuditService('performance-service');
  const notificationService = new NotificationService('performance-service');
  
  const performanceReviewService = new PerformanceReviewService(
    prismaClient, 
    auditService, 
    notificationService,
    externalService
  );
  
  const goalService = new GoalService(prismaClient);
  const developmentPlanService = new DevelopmentPlanService(prismaClient);
  const competencyFrameworkService = new CompetencyFrameworkService(prismaClient);
  const competencyAssessmentService = new CompetencyAssessmentService(prismaClient);
  const performanceMetricService = new PerformanceMetricService(prismaClient);
  const reviewFeedbackService = new ReviewFeedbackService(prismaClient);

  // Initialize controllers
  const performanceReviewController = new PerformanceReviewController(performanceReviewService);
  const goalController = new GoalController(goalService);
  const developmentPlanController = new DevelopmentPlanController(developmentPlanService);
  const competencyFrameworkController = new CompetencyFrameworkController(competencyFrameworkService);
  const competencyAssessmentController = new CompetencyAssessmentController(competencyAssessmentService);
  const performanceMetricController = new PerformanceMetricController(performanceMetricService);
  const reviewFeedbackController = new ReviewFeedbackController(reviewFeedbackService);

  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    (res as any).json({
      status: 'healthy',
      service: 'performance-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'connected',
        modules: ['performance-reviews', 'goals', 'development-plans', 'competency-frameworks', 'competency-assessments', 'performance-metrics', 'review-feedback'],
    });
  });

  // Service info endpoint
  router.get('/info', (req: Request, res: Response) => {
    (res as any).json({
      service: 'Performance Management Service',
      version: '1.0.0',
      description: 'Handles performance reviews, goals, development plans, and competency assessments',
        endpoints: {
          performanceReviews: '/api/v1/performance-reviews',
          goals: '/api/v1/goals',
          developmentPlans: '/api/v1/development-plans',
          competencyFrameworks: '/api/v1/competency-frameworks',
          competencyAssessments: '/api/v1/competency-assessments',
          performanceMetrics: '/api/v1/performance-metrics',
          reviewFeedback: '/api/v1/review-feedback',
        },
      status: 'operational',
        features: [
          'Performance Reviews',
          'Goal Management',
          'Development Plans',
          'Competency Frameworks',
          'Competency Assessments',
          'Performance Metrics',
          '360-Degree Feedback',
          'Analytics & Reporting',
          'Real-time Notifications',
          'Audit Logging',
        ],
    });
  });

  // API v1 routes
  router.use('/api/v1/performance-reviews', createPerformanceReviewRoutes(performanceReviewController));
  router.use('/api/v1/goals', createGoalRoutes(goalController));
  router.use('/api/v1/development-plans', createDevelopmentPlanRoutes(developmentPlanController));
  router.use('/api/v1/competency-frameworks', createCompetencyFrameworkRoutes(competencyFrameworkController));
  router.use('/api/v1/competency-assessments', createCompetencyAssessmentRoutes(competencyAssessmentController));
  router.use('/api/v1/performance-metrics', createPerformanceMetricRoutes(performanceMetricController));
  router.use('/api/v1/review-feedback', createReviewFeedbackRoutes(reviewFeedbackController));

  // Legacy endpoints for backwards compatibility
  router.get('/reviews', (req: Request, res: Response) => {
    (res as any).redirect(301, '/api/v1/performance-reviews');
  });

  router.get('/goals', (req: Request, res: Response) => {
    (res as any).redirect(301, '/api/v1/goals');
  });

  // API documentation endpoint
  router.get('/api/docs', (req: Request, res: Response) => {
    (res as any).json({
      title: 'Performance Management Service API',
      version: '1.0.0',
      description: 'RESTful API for performance management operations',
      baseUrl: '/api/v1',
      endpoints: {
        performanceReviews: {
          base: '/performance-reviews',
          operations: [
            'GET /performance-reviews/search - Search reviews',
            'POST /performance-reviews - Create review',
            'GET /performance-reviews/:id - Get review details',
            'PUT /performance-reviews/:id - Update review',
            'DELETE /performance-reviews/:id - Delete review',
            'POST /performance-reviews/:id/submit - Submit review',
            'POST /performance-reviews/:id/approve - Approve review',
            'GET /performance-reviews/due-soon - Get reviews due soon',
            'GET /performance-reviews/overdue - Get overdue reviews',
            'GET /performance-reviews/statistics - Get review statistics',
            'GET /performance-reviews/employee/:id - Get employee reviews',
            'GET /performance-reviews/reviewer/:id - Get reviewer reviews',
          ],
        },
        goals: {
          base: '/goals',
          operations: [
            'Coming soon...',
          ],
        },
        developmentPlans: {
          base: '/development-plans',
          operations: [
            'Coming soon...',
          ],
        },
        competencies: {
          base: '/competencies',
          operations: [
            'Coming soon...',
          ],
        },
      },
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization: Bearer <token>',
        permissions: [
          'performance.reviews.read',
          'performance.reviews.create',
          'performance.reviews.update',
          'performance.reviews.delete',
          'performance.reviews.submit',
          'performance.reviews.approve',
          'performance.reviews.analytics',
        ],
      },
    });
  });

  return router;
}
