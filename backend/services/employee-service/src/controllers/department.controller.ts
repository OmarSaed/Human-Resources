import { Request, Response } from 'express';
import { DepartmentService } from '../services/department.service';
import { createLogger } from '@hrms/shared';
import { PaginationParams } from '@hrms/shared';
import { DepartmentCreateRequest, DepartmentUpdateRequest, DepartmentSearchParams } from '../types/employee.types';

const logger = createLogger('department-controller');

export class DepartmentController {
  private departmentService: DepartmentService;

  constructor(departmentService: DepartmentService) {
    this.departmentService = departmentService;
  }

  /**
   * Create a new department
   */
  createDepartment = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: DepartmentCreateRequest = req.body;
      const createdBy = (req as any).user?.id || 'system';

      const department = await this.departmentService.createDepartment(data, createdBy);

      res.status(201).json({
        success: true,
        data: department,
        message: 'Department created successfully',
      });
    } catch (error) {
      logger.error('Failed to create department', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DEPARTMENT_CREATE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Get department by ID
   */
  getDepartmentById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const department = await this.departmentService.getDepartmentById(id);

      if (!department) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DEPARTMENT_NOT_FOUND',
            message: 'Department not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: department,
      });
    } catch (error) {
      logger.error('Failed to get department by ID', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve department',
        },
      });
    }
  };

  /**
   * Get all departments
   */
  getAllDepartments = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchParams: DepartmentSearchParams = {
        query: req.query.query as string,
        managerId: req.query.managerId as string,
        isActive: req.query.isActive === 'true',
      };

      const pagination: PaginationParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'name',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
      };

      const result = await this.departmentService.searchDepartments(searchParams, pagination);

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
      logger.error('Failed to get departments', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve departments',
        },
      });
    }
  };

  /**
   * Update department
   */
  updateDepartment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data: DepartmentUpdateRequest = req.body;
      const updatedBy = (req as any).user?.id || 'system';
      const reason = req.body.reason;

      const department = await this.departmentService.updateDepartment(id, data, updatedBy, reason);

      res.json({
        success: true,
        data: department,
        message: 'Department updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update department', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DEPARTMENT_UPDATE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Delete department
   */
  deleteDepartment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deletedBy = (req as any).user?.id || 'system';
      const reason = req.body.reason;

      await this.departmentService.deleteDepartment(id, deletedBy, reason);

      res.json({
        success: true,
        message: 'Department deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete department', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'DEPARTMENT_DELETE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Get department statistics
   */
  getDepartmentStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const stats = await this.departmentService.getDepartmentStats(id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get department statistics', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: 'Failed to retrieve department statistics',
        },
      });
    }
  };

  /**
   * Get department hierarchy
   */
  getDepartmentHierarchy = async (req: Request, res: Response): Promise<void> => {
    try {
      const hierarchy = await this.departmentService.getDepartmentHierarchy();

      res.json({
        success: true,
        data: hierarchy,
      });
    } catch (error) {
      logger.error('Failed to get department hierarchy', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HIERARCHY_FAILED',
          message: 'Failed to retrieve department hierarchy',
        },
      });
    }
  };
}
