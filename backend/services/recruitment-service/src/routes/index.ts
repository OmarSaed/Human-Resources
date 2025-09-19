import express from 'express';
import { PrismaClient } from '@prisma/client';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../docs/swagger.config';
import { RecruitmentService } from '../services/recruitment.service';
import { CandidateService } from '../services/candidate.service';
import { JobPostingService } from '../services/job-posting.service';
import { ApplicationService } from '../services/application.service';
import { InterviewService } from '../services/interview.service';
import { EvaluationService } from '../services/evaluation.service';
import { JobPostingController } from '../controllers/job-posting.controller';
import { CandidateController } from '../controllers/candidate.controller';
import { ApplicationController } from '../controllers/application.controller';
import { InterviewController } from '../controllers/interview.controller';
import { EvaluationController } from '../controllers/evaluation.controller';
import { OnboardingTaskController } from '../controllers/onboarding-task.controller';
import { createJobPostingRoutes } from './job-posting.routes';
import { createCandidateRoutes } from './candidate.routes';
import { createApplicationRoutes } from './application.routes';
import { createInterviewRoutes } from './interview.routes';
import { createEvaluationRoutes } from './evaluation.routes';
import { createOnboardingTaskRoutes } from './onboarding-task.routes';

export function createRoutes(
  prisma: PrismaClient,
  recruitmentService: RecruitmentService,
  candidateService: CandidateService,
  jobPostingService: JobPostingService,
  applicationService: ApplicationService,
  interviewService: InterviewService,
  evaluationService: EvaluationService,
): express.Router {
  const router = express.Router();

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'recruitment-service',
      version: '2.0.0',
        features: {
          jobPosting: true,
          candidateManagement: true,
          applicationTracking: true,
          interviewScheduling: true,
          candidateEvaluation: true,
          onboardingWorkflows: true,
          onboardingTasks: true,
        },
    });
  });

  // Service info endpoint
  router.get('/info', (req, res) => {
    res.json({
      service: 'Recruitment & Hiring Service',
      version: '2.0.0',
      description: 'Complete ATS with job posting, candidate management, and hiring workflows',
        endpoints: {
          jobPostings: '/api/v1/job-postings',
          candidates: '/api/v1/candidates',
          applications: '/api/v1/applications',
          interviews: '/api/v1/interviews',
          evaluations: '/api/v1/evaluations',
          onboardingTasks: '/api/v1/onboarding-tasks',
          onboarding: '/api/v1/onboarding',
          reports: '/api/v1/reports',
        },
        capabilities: [
          'Job Posting Management',
          'Candidate Database',
          'Application Tracking',
          'Interview Scheduling',
          'Candidate Evaluation & Scoring',
          'Candidate Ranking & Comparison',
          'Onboarding Task Management',
          'Onboarding Progress Tracking',
          'Recruitment Analytics',
          'Multi-channel Job Distribution',
        ],
    });
  });

  // API Documentation
  router.use('/api/docs', swaggerUi.serve);
  router.get('/api/docs', swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'HRMS Recruitment & Onboarding Service API Documentation',
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

  // Initialize controllers
  const jobPostingController = new JobPostingController(jobPostingService);
  const candidateController = new CandidateController(candidateService);
  const applicationController = new ApplicationController(applicationService);
  const interviewController = new InterviewController(interviewService);
  const evaluationController = new EvaluationController(evaluationService);

  // API routes
  router.use('/api/v1/job-postings', createJobPostingRoutes(jobPostingController));
  router.use('/api/v1/candidates', createCandidateRoutes(candidateController));
  router.use('/api/v1/applications', createApplicationRoutes(applicationController));
  router.use('/api/v1/interviews', createInterviewRoutes(interviewController));
  router.use('/api/v1/evaluations', createEvaluationRoutes(evaluationController));

  return router;
}
