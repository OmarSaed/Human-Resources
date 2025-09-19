import express from 'express';
import { SkillController } from '../controllers/skill.controller';
import { authMiddleware, requirePermission } from '../middleware';

export function createSkillRoutes(skillController: SkillController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Skill CRUD operations
  router.post(
    '/',
    requirePermission('skill.create'),
    skillController.createSkill
  );

  router.get(
    '/',
    skillController.listSkills
  );

  router.get(
    '/categories',
    skillController.getSkillCategories
  );

  router.get(
    '/search',
    skillController.searchSkills
  );

  router.get(
    '/:id',
    skillController.getSkill
  );

  router.put(
    '/:id',
    requirePermission('skill.update'),
    skillController.updateSkill
  );

  router.delete(
    '/:id',
    requirePermission('skill.delete'),
    skillController.deleteSkill
  );

  // Skill analytics
  router.get(
    '/:id/analytics',
    requirePermission('skill.analytics'),
    skillController.getSkillAnalytics
  );

  // User skill management
  router.post(
    '/:id/assign',
    requirePermission('skill.assign'),
    skillController.assignSkillToUser
  );

  router.put(
    '/:id/user-skills/:userSkillId',
    skillController.updateUserSkill
  );

  router.delete(
    '/:id/user-skills/:userSkillId',
    skillController.removeSkillFromUser
  );

  // User skill queries
  router.get(
    '/users/:targetUserId/skills',
    skillController.getUserSkills
  );

  router.get(
    '/users/:targetUserId/gap-analysis',
    requirePermission('skill.gap_analysis'),
    skillController.getSkillGapAnalysis
  );

  // Skill endorsements
  router.post(
    '/user-skills/:userSkillId/endorse',
    skillController.endorseUserSkill
  );

  router.get(
    '/user-skills/:userSkillId/endorsements',
    skillController.getSkillEndorsements
  );

  return router;
}
