import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { PrismaClient } from '@prisma/client';
import { LearningService } from '../services/learning.service';
import { CourseService } from '../services/course.service';
import { ProgressService } from '../services/progress.service';
import { CertificateService } from '../services/certificate.service';
import { SkillService } from '../services/skill.service';
import { LearningPathService } from '../services/learning-path.service';
import { AssessmentService } from '../services/assessment.service';
import { AnalyticsService } from '../services/analytics.service';
import { createCourseRoutes } from './course.routes';
import { createAssessmentRoutes } from './assessment.routes';
import { createCertificateRoutes } from './certificate.routes';
import { createProgressRoutes } from './progress.routes';
import { createSkillRoutes } from './skill.routes';
import { createLearningPathRoutes } from './learning-path.routes';
import { createAnalyticsRoutes } from './analytics.routes';
import { createDashboardRoutes } from './dashboard.routes';
import { swaggerSpec } from '../docs/swagger.config';

export function createRoutes(
  prisma: PrismaClient,
  learningService: LearningService,
  courseService: CourseService,
  progressService: ProgressService,
  certificateService?: CertificateService,
  skillService?: SkillService,
  learningPathService?: LearningPathService,
  assessmentService?: AssessmentService,
  analyticsService?: AnalyticsService
): express.Router {
  const router = express.Router();

  // API Documentation
  router.use('/api/docs', swaggerUi.serve);
  router.get('/api/docs', swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'HRMS Learning Service API Documentation',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestHeaders: true,
    },
  }));

  // API Documentation JSON
  router.get('/api/docs/json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'learning-service',
      version: '2.0.0',
      features: {
        courseManagement: true,
        progressTracking: true,
        assessments: !!assessmentService,
        certificates: !!certificateService,
        skillTracking: !!skillService,
        learningPaths: !!learningPathService,
        analytics: !!analyticsService,
      },
    });
  });

  // Service info endpoint
  router.get('/info', (req, res) => {
    res.json({
      service: 'Learning & Development Service',
      version: '2.0.0',
      description: 'Comprehensive learning management with courses, progress tracking, and skill development',
      endpoints: {
        courses: '/api/v1/courses',
        progress: '/api/v1/progress',
        assessments: '/api/v1/assessments',
        certificates: '/api/v1/certificates',
        skills: '/api/v1/skills',
        learningPaths: '/api/v1/learning-paths',
        analytics: '/api/v1/analytics',
        dashboard: '/api/v1/dashboard',
      },
      capabilities: [
            'Course Management',
            'Progress Tracking',
            'Assessment & Quizzes',
            'Certificate Generation',
            'Skill Development',
        'Learning Path Creation',
        'Personalized Learning Paths',
        'Learning Analytics',
        'Personalized Recommendations',
        'Interactive Content',
      ],
    });
  });

  // Initialize controllers
  const courseController = require('./controllers/course.controller').CourseController;
  const courseControllerInstance = new courseController(courseService);

  // API routes
  router.use('/api/v1/courses', createCourseRoutes(courseControllerInstance));
  router.use('/api/v1/progress', createProgressRoutes(progressService));
  router.use('/api/v1/dashboard', createDashboardRoutes(learningService));

  // Optional feature routes
  if (assessmentService) {
    const assessmentController = require('../controllers/assessment.controller').AssessmentController;
    const controller = new assessmentController(assessmentService);
    router.use('/api/v1/assessments', createAssessmentRoutes(controller));
  }

  if (certificateService) {
    const certificateController = require('../controllers/certificate.controller').CertificateController;
    const controller = new certificateController(certificateService);
    router.use('/api/v1/certificates', createCertificateRoutes(controller));
  }

  if (skillService) {
    const skillController = require('../controllers/skill.controller').SkillController;
    const controller = new skillController(skillService);
    router.use('/api/v1/skills', createSkillRoutes(controller));
  }

  if (learningPathService) {
    const learningPathController = require('../controllers/learning-path.controller').LearningPathController;
    const controller = new learningPathController(learningPathService);
    router.use('/api/v1/learning-paths', createLearningPathRoutes(controller));
  }

  if (analyticsService) {
    router.use('/api/v1/analytics', createAnalyticsRoutes(analyticsService));
  }

  return router;
}
