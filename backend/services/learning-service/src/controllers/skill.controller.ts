import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { SkillService } from '../services/skill.service';

const logger = createLogger('skill-controller');

export class SkillController {
  constructor(private skillService: SkillService) {}

  /**
   * Create a new skill
   */
  createSkill = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const skillData = req.body;

      const skill = await this.skillService.createSkill({
        ...skillData,
        createdBy: userId,
      });

      logger.info('Skill created successfully', {
        skillId: skill.id,
        name: skill.name,
        category: skill.category,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        skill,
        message: 'Skill created successfully',
      });
    } catch (error) {
      logger.error('Failed to create skill', error as Error);
      res.status(500).json({
        error: 'Failed to create skill',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get skill by ID
   */
  getSkill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const skill = await this.skillService.getSkill(id);

      if (!skill) {
        res.status(404).json({
          error: 'Skill not found',
          message: 'The requested skill was not found',
        });
        return;
      }

      res.json({
        success: true,
        skill,
      });
    } catch (error) {
      logger.error('Failed to get skill', error as Error);
      res.status(500).json({
        error: 'Failed to retrieve skill',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update skill
   */
  updateSkill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const skill = await this.skillService.updateSkill(id, updates, userId);

      logger.info('Skill updated successfully', {
        skillId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        skill,
        message: 'Skill updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update skill', error as Error);
      res.status(500).json({
        error: 'Failed to update skill',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete skill
   */
  deleteSkill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.skillService.deleteSkill(id, userId);

      logger.info('Skill deleted successfully', { skillId: id, userId });

      res.json({
        success: true,
        message: 'Skill deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete skill', error as Error);
      res.status(500).json({
        error: 'Failed to delete skill',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List skills
   */
  listSkills = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        category,
        type,
        isActive,
        search,
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc',
      } = req.query;

      const options = {
        category: category as string,
        type: type as string,
        isActive: isActive ? isActive === 'true' : undefined,
        search: search as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.skillService.listSkills(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list skills', error as Error);
      res.status(500).json({
        error: 'Failed to list skills',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get skill categories
   */
  getSkillCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const categories = await this.skillService.getSkillCategories();

      res.json({
        success: true,
        categories,
      });
    } catch (error) {
      logger.error('Failed to get skill categories', error as Error);
      res.status(500).json({
        error: 'Failed to get skill categories',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Assign skill to user
   */
  assignSkillToUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { targetUserId, level, proficiency, endorsedBy } = req.body;

      const userSkill = await this.skillService.assignSkillToUser({
        skillId: id,
        userId: targetUserId || userId,
        level,
        proficiency,
        endorsedBy,
        assignedBy: userId,
      });

      logger.info('Skill assigned to user', {
        skillId: id,
        targetUserId: targetUserId || userId,
        level,
        assignedBy: userId,
      });

      res.status(201).json({
        success: true,
        userSkill,
        message: 'Skill assigned to user successfully',
      });
    } catch (error) {
      logger.error('Failed to assign skill to user', error as Error);
      res.status(500).json({
        error: 'Failed to assign skill to user',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update user skill
   */
  updateUserSkill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, userSkillId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const userSkill = await this.skillService.updateUserSkill(userSkillId, updates, userId);

      logger.info('User skill updated', {
        skillId: id,
        userSkillId,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        userSkill,
        message: 'User skill updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update user skill', error as Error);
      res.status(500).json({
        error: 'Failed to update user skill',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Remove skill from user
   */
  removeSkillFromUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, userSkillId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.skillService.removeSkillFromUser(userSkillId, userId);

      logger.info('Skill removed from user', {
        skillId: id,
        userSkillId,
        userId,
      });

      res.json({
        success: true,
        message: 'Skill removed from user successfully',
      });
    } catch (error) {
      logger.error('Failed to remove skill from user', error as Error);
      res.status(500).json({
        error: 'Failed to remove skill from user',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get user skills
   */
  getUserSkills = async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetUserId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        category,
        level,
        proficiency,
        page = 1,
        limit = 50,
        sortBy = 'proficiency',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        category: category as string,
        level: level as string,
        proficiency: proficiency ? parseInt(proficiency as string) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.skillService.getUserSkills(targetUserId, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to get user skills', error as Error);
      res.status(500).json({
        error: 'Failed to get user skills',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Search skills by name or description
   */
  searchSkills = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, category, type, limit = 10 } = req.query;

      if (!query) {
        res.status(400).json({
          error: 'Search query is required',
          message: 'Please provide a search query',
        });
        return;
      }

      const results = await this.skillService.searchSkills({
        query: query as string,
        category: category as string,
        type: type as string,
        limit: Math.min(parseInt(limit as string), 50),
      });

      res.json({
        success: true,
        skills: results,
        total: results.length,
      });
    } catch (error) {
      logger.error('Failed to search skills', error as Error);
      res.status(500).json({
        error: 'Failed to search skills',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get skill analytics
   */
  getSkillAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const analytics = await this.skillService.getSkillAnalytics(id, userId);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error('Failed to get skill analytics', error as Error);
      res.status(500).json({
        error: 'Failed to get skill analytics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get skill gap analysis
   */
  getSkillGapAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetUserId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { roleId, departmentId } = req.query;

      const analysis = await this.skillService.getSkillGapAnalysis({
        userId: targetUserId,
        roleId: roleId as string,
        departmentId: departmentId as string,
        requestingUserId: userId,
      });

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      logger.error('Failed to get skill gap analysis', error as Error);
      res.status(500).json({
        error: 'Failed to get skill gap analysis',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Endorse user skill
   */
  endorseUserSkill = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userSkillId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { comment, rating } = req.body;

      const endorsement = await this.skillService.endorseUserSkill({
        userSkillId,
        endorsedBy: userId,
        comment,
        rating,
      });

      logger.info('User skill endorsed', {
        userSkillId,
        endorsedBy: userId,
        rating,
      });

      res.status(201).json({
        success: true,
        endorsement,
        message: 'Skill endorsed successfully',
      });
    } catch (error) {
      logger.error('Failed to endorse user skill', error as Error);
      res.status(500).json({
        error: 'Failed to endorse user skill',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get skill endorsements
   */
  getSkillEndorsements = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userSkillId } = req.params;
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await this.skillService.getSkillEndorsements(userSkillId, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to get skill endorsements', error as Error);
      res.status(500).json({
        error: 'Failed to get skill endorsements',
        message: (error as Error).message,
      });
    }
  };
}
