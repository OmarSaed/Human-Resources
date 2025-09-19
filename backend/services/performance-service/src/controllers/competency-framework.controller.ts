import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { CompetencyFrameworkService } from '../services/competency-framework.service';

const logger = createLogger('competency-framework-controller');

export class CompetencyFrameworkController {
  constructor(private competencyFrameworkService: CompetencyFrameworkService) {}

  /**
   * Create a new competency framework
   */
  createFramework = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const frameworkData = req.body;

      const framework = await this.competencyFrameworkService.createFramework({
        ...frameworkData,
        createdBy: userId,
      });

      logger.info('Competency framework created successfully', {
        frameworkId: framework.id,
        name: framework.name,
        type: framework.type,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        framework,
        message: 'Competency framework created successfully',
      });
    } catch (error) {
      logger.error('Failed to create competency framework', error as Error);
      res.status(500).json({
        error: 'Failed to create competency framework',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get competency framework by ID
   */
  getFramework = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const framework = await this.competencyFrameworkService.getFramework(id, userId);

      if (!framework) {
        res.status(404).json({
          error: 'Competency framework not found',
          message: 'The requested competency framework was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        framework,
      });
    } catch (error) {
      logger.error(`Failed to get competency framework ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve competency framework',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update competency framework
   */
  updateFramework = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const framework = await this.competencyFrameworkService.updateFramework(id, updates, userId);

      logger.info('Competency framework updated successfully', {
        frameworkId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        framework,
        message: 'Competency framework updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update competency framework ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update competency framework',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete competency framework
   */
  deleteFramework = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.competencyFrameworkService.deleteFramework(id, userId);

      logger.info('Competency framework deleted successfully', { frameworkId: id, userId });

      res.json({
        success: true,
        message: 'Competency framework deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete competency framework ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete competency framework',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List competency frameworks
   */
  listFrameworks = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        type,
        isActive,
        search,
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc',
      } = req.query;

      const options = {
        type: type as string,
        isActive: isActive ? isActive === 'true' : undefined,
        search: search as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.competencyFrameworkService.listFrameworks(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list competency frameworks', error as Error);
      res.status(500).json({
        error: 'Failed to list competency frameworks',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Create competency within framework
   */
  createCompetency = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const competencyData = req.body;

      const competency = await this.competencyFrameworkService.createCompetency(id, {
        ...competencyData,
        createdBy: userId,
      });

      logger.info('Competency created successfully', {
        frameworkId: id,
        competencyId: competency.id,
        name: competency.name,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        competency,
        message: 'Competency created successfully',
      });
    } catch (error) {
      logger.error(`Failed to create competency ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to create competency',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update competency
   */
  updateCompetency = async (req: Request, res: Response): Promise<void> => {
    try {
      const { competencyId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const competency = await this.competencyFrameworkService.updateCompetency(competencyId, updates, userId);

      logger.info('Competency updated successfully', {
        competencyId,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        competency,
        message: 'Competency updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update competency ${req.params.competencyId}`, error as Error);
      res.status(500).json({
        error: 'Failed to update competency',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete competency
   */
  deleteCompetency = async (req: Request, res: Response): Promise<void> => {
    try {
      const { competencyId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.competencyFrameworkService.deleteCompetency(competencyId, userId);

      logger.info('Competency deleted successfully', { competencyId, userId });

      res.json({
        success: true,
        message: 'Competency deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete competency ${req.params.competencyId}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete competency',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get framework competencies
   */
  getFrameworkCompetencies = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        category,
        level,
        isActive,
        page = 1,
        limit = 50,
        sortBy = 'name',
        sortOrder = 'asc',
      } = req.query;

      const options = {
        category: category as string,
        level: level as string,
        isActive: isActive ? isActive === 'true' : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.competencyFrameworkService.getFrameworkCompetencies(id, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Failed to get framework competencies ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to get framework competencies',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Assign framework to role
   */
  assignFrameworkToRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { roleId, requiredLevel } = req.body;

      const assignment = await this.competencyFrameworkService.assignFrameworkToRole({
        frameworkId: id,
        roleId,
        requiredLevel,
        assignedBy: userId,
      });

      logger.info('Framework assigned to role', {
        frameworkId: id,
        roleId,
        assignedBy: userId,
      });

      res.status(201).json({
        success: true,
        assignment,
        message: 'Framework assigned to role successfully',
      });
    } catch (error) {
      logger.error(`Failed to assign framework to role ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to assign framework to role',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get framework analytics
   */
  getFrameworkAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const analytics = await this.competencyFrameworkService.getFrameworkAnalytics(id, userId);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error(`Failed to get framework analytics ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to get framework analytics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Clone framework
   */
  cloneFramework = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { newName } = req.body;

      const clonedFramework = await this.competencyFrameworkService.cloneFramework(id, newName, userId);

      logger.info('Framework cloned successfully', {
        originalFrameworkId: id,
        clonedFrameworkId: clonedFramework.id,
        newName,
        userId,
      });

      res.status(201).json({
        success: true,
        framework: clonedFramework,
        message: 'Framework cloned successfully',
      });
    } catch (error) {
      logger.error(`Failed to clone framework ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to clone framework',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Export framework
   */
  exportFramework = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { format = 'json' } = req.query;

      const exportData = await this.competencyFrameworkService.exportFramework(id, format as string, userId);

      const filename = `competency-framework-${id}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(exportData, null, 2));
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.send(exportData);
      }
    } catch (error) {
      logger.error(`Failed to export framework ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to export framework',
        message: (error as Error).message,
      });
    }
  };
}
