import express from 'express';
import { CandidateController } from '../controllers/candidate.controller';
import { authMiddleware, requirePermission, validateCandidateCreate, validateCandidateUpdate } from '../middleware';

export function createCandidateRoutes(candidateController: CandidateController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Candidate CRUD operations
  router.post(
    '/',
    requirePermission('candidate.create'),
    validateCandidateCreate,
    candidateController.createCandidate
  );

  router.get(
    '/search',
    candidateController.searchCandidates
  );

  router.get(
    '/analytics',
    requirePermission('candidate.analytics'),
    candidateController.getCandidateAnalytics
  );

  router.get(
    '/',
    candidateController.listCandidates
  );

  router.get(
    '/:id',
    candidateController.getCandidate
  );

  router.put(
    '/:id',
    requirePermission('candidate.update'),
    validateCandidateUpdate,
    candidateController.updateCandidate
  );

  router.delete(
    '/:id',
    requirePermission('candidate.delete'),
    candidateController.deleteCandidate
  );

  // Resume management
  router.post(
    '/:id/resume',
    requirePermission('candidate.update'),
    candidateController.uploadResume
  );

  router.post(
    '/:id/parse-resume',
    requirePermission('candidate.update'),
    candidateController.parseResume
  );

  // Candidate status management
  router.post(
    '/:id/blacklist',
    requirePermission('candidate.blacklist'),
    candidateController.blacklistCandidate
  );

  router.delete(
    '/:id/blacklist',
    requirePermission('candidate.blacklist'),
    candidateController.removeFromBlacklist
  );

  // Candidate applications
  router.get(
    '/:id/applications',
    candidateController.getCandidateApplications
  );

  // Candidate operations
  router.post(
    '/:primaryId/merge/:duplicateId',
    requirePermission('candidate.merge'),
    candidateController.mergeCandidates
  );

  return router;
}
