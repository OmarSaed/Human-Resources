import { Request, Response } from 'express';
import { PositionService } from '../services/position.service';
import { createLogger } from '@hrms/shared';
import { PaginationParams } from '@hrms/shared';
import { PositionCreateRequest, PositionUpdateRequest, PositionSearchParams } from '../types/employee.types';

const logger = createLogger('position-controller');

export class PositionController {
  private positionService: PositionService;

  constructor(positionService: PositionService) {
    this.positionService = positionService;
  }

  /**
   * Create a new position
   */
  createPosition = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: PositionCreateRequest = req.body;
      const createdBy = (req as any).user?.id || 'system';

      const position = await this.positionService.createPosition(data, createdBy);

      res.status(201).json({
        success: true,
        data: position,
        message: 'Position created successfully',
      });
    } catch (error) {
      logger.error('Failed to create position', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'POSITION_CREATE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Get position by ID
   */
  getPositionById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const position = await this.positionService.getPositionById(id);

      if (!position) {
        res.status(404).json({
          success: false,
          error: {
            code: 'POSITION_NOT_FOUND',
            message: 'Position not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: position,
      });
    } catch (error) {
      logger.error('Failed to get position by ID', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve position',
        },
      });
    }
  };

  /**
   * Get all positions
   */
  getAllPositions = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchParams: PositionSearchParams = {
        query: req.query.query as string,
        departmentId: req.query.departmentId as string,
        level: req.query.level ? parseInt(req.query.level as string) : undefined,
        salaryRange: {
          min: req.query.salaryMin ? parseFloat(req.query.salaryMin as string) : undefined,
          max: req.query.salaryMax ? parseFloat(req.query.salaryMax as string) : undefined,
        },
        isActive: req.query.isActive === 'true',
      };

      const pagination: PaginationParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'title',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
      };

      const result = await this.positionService.searchPositions(searchParams, pagination);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Failed to get positions', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve positions',
        },
      });
    }
  };

  /**
   * Update position
   */
  updatePosition = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data: PositionUpdateRequest = req.body;
      const updatedBy = (req as any).user?.id || 'system';
      const reason = req.body.reason;

      const position = await this.positionService.updatePosition(id, data, updatedBy, reason);

      res.json({
        success: true,
        data: position,
        message: 'Position updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update position', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'POSITION_UPDATE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Delete position
   */
  deletePosition = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deletedBy = (req as any).user?.id || 'system';
      const reason = req.body.reason;

      await this.positionService.deletePosition(id, deletedBy, reason);

      res.json({
        success: true,
        message: 'Position deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete position', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'POSITION_DELETE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Get positions by department
   */
  getPositionsByDepartment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { departmentId } = req.params;
      const positions = await this.positionService.getPositionsByDepartment(departmentId);

      res.json({
        success: true,
        data: positions,
      });
    } catch (error) {
      logger.error('Failed to get positions by department', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve positions',
        },
      });
    }
  };

  /**
   * Get position statistics
   */
  getPositionStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const stats = await this.positionService.getPositionStats(id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get position statistics', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: 'Failed to retrieve position statistics',
        },
      });
    }
  };

  /**
   * Get open positions
   */
  getOpenPositions = async (req: Request, res: Response): Promise<void> => {
    try {
      const departmentId = req.query.departmentId as string;
      const positions = await this.positionService.getOpenPositions(departmentId);

      res.json({
        success: true,
        data: positions,
        metadata: {
          count: positions.length,
          departmentId,
        },
      });
    } catch (error) {
      logger.error('Failed to get open positions', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve open positions',
        },
      });
    }
  };

  /**
   * Get position hierarchy by level
   */
  getPositionHierarchy = async (req: Request, res: Response): Promise<void> => {
    try {
      const departmentId = req.query.departmentId as string;
      const hierarchy = await this.positionService.getPositionHierarchy(departmentId);

      res.json({
        success: true,
        data: hierarchy,
      });
    } catch (error) {
      logger.error('Failed to get position hierarchy', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HIERARCHY_FAILED',
          message: 'Failed to retrieve position hierarchy',
        },
      });
    }
  };
}
