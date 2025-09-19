import { Request, Response } from 'express';
import { EmployeeService } from '../services/employee.service';
import { createLogger } from '@hrms/shared';
import { PaginationParams } from '@hrms/shared';
import { EmployeeCreateRequest, EmployeeUpdateRequest, EmployeeSearchParams } from '../types/employee.types';

const logger = createLogger('employee-controller');

export class EmployeeController {
  private employeeService: EmployeeService;

  constructor(employeeService: EmployeeService) {
    this.employeeService = employeeService;
  }

  /**
   * Create a new employee
   */
  createEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: EmployeeCreateRequest = req.body;
      const createdBy = (req as any).user?.id || 'system';

      const employee = await this.employeeService.createEmployee(data, createdBy);

      res.status(201).json({
        success: true,
        data: employee,
        message: 'Employee created successfully',
      });
    } catch (error) {
      logger.error('Failed to create employee', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'EMPLOYEE_CREATE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Get employee by ID
   */
  getEmployeeById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const employee = await this.employeeService.getEmployeeById(id);

      if (!employee) {
        res.status(404).json({
          success: false,
          error: {
            code: 'EMPLOYEE_NOT_FOUND',
            message: 'Employee not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      logger.error('Failed to get employee by ID', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve employee',
        },
      });
    }
  };

  /**
   * Get employee by employee number
   */
  getEmployeeByNumber = async (req: Request, res: Response): Promise<void> => {
    try {
      const { employeeNumber } = req.params;
      const employee = await this.employeeService.getEmployeeByNumber(employeeNumber);

      if (!employee) {
        res.status(404).json({
          success: false,
          error: {
            code: 'EMPLOYEE_NOT_FOUND',
            message: 'Employee not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      logger.error('Failed to get employee by number', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve employee',
        },
      });
    }
  };

  /**
   * Update employee
   */
  updateEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data: EmployeeUpdateRequest = req.body;
      const updatedBy = (req as any).user?.id || 'system';
      const reason = req.body.reason;

      const employee = await this.employeeService.updateEmployee(id, data, updatedBy, reason);

      res.json({
        success: true,
        data: employee,
        message: 'Employee updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update employee', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'EMPLOYEE_UPDATE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Delete employee
   */
  deleteEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deletedBy = (req as any).user?.id || 'system';
      const reason = req.body.reason;

      await this.employeeService.deleteEmployee(id, deletedBy, reason);

      res.json({
        success: true,
        message: 'Employee deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete employee', error as Error);
      res.status(400).json({
        success: false,
        error: {
          code: 'EMPLOYEE_DELETE_FAILED',
          message: (error as Error).message,
        },
      });
    }
  };

  /**
   * Search employees
   */
  searchEmployees = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchParams: EmployeeSearchParams = {
        query: req.query.query as string,
        departmentId: req.query.departmentId as string,
        positionId: req.query.positionId as string,
        managerId: req.query.managerId as string,
        status: req.query.status as any,
        employmentType: req.query.employmentType as any,
        workLocation: req.query.workLocation as any,
        hireDate: req.query.hireDateFrom || req.query.hireDateTo ? {
          from: req.query.hireDateFrom as string,
          to: req.query.hireDateTo as string,
        } : undefined,
        skills: req.query.skills ? (req.query.skills as string).split(',') : undefined,
      };

      const pagination: PaginationParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'firstName',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
      };

      const result = await this.employeeService.searchEmployees(searchParams, pagination);

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
      logger.error('Failed to search employees', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search employees',
        },
      });
    }
  };

  /**
   * Get employees by department
   */
  getEmployeesByDepartment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { departmentId } = req.params;
      const employees = await this.employeeService.getEmployeesByDepartment(departmentId);

      res.json({
        success: true,
        data: employees,
      });
    } catch (error) {
      logger.error('Failed to get employees by department', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve employees',
        },
      });
    }
  };

  /**
   * Get employees by manager
   */
  getEmployeesByManager = async (req: Request, res: Response): Promise<void> => {
    try {
      const { managerId } = req.params;
      const employees = await this.employeeService.getEmployeesByManager(managerId);

      res.json({
        success: true,
        data: employees,
      });
    } catch (error) {
      logger.error('Failed to get employees by manager', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve employees',
        },
      });
    }
  };

  /**
   * Get employee hierarchy
   */
  getEmployeeHierarchy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { managerId } = req.params;
      const employees = await this.employeeService.getEmployeeHierarchy(managerId);

      res.json({
        success: true,
        data: employees,
      });
    } catch (error) {
      logger.error('Failed to get employee hierarchy', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve employee hierarchy',
        },
      });
    }
  };

  /**
   * Get upcoming birthdays
   */
  getUpcomingBirthdays = async (req: Request, res: Response): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const employees = await this.employeeService.getUpcomingBirthdays(days);

      res.json({
        success: true,
        data: employees,
        metadata: {
          days,
          count: employees.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get upcoming birthdays', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve upcoming birthdays',
        },
      });
    }
  };

  /**
   * Get upcoming work anniversaries
   */
  getUpcomingAnniversaries = async (req: Request, res: Response): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const employees = await this.employeeService.getUpcomingAnniversaries(days);

      res.json({
        success: true,
        data: employees,
        metadata: {
          days,
          count: employees.length,
        },
      });
    } catch (error) {
      logger.error('Failed to get upcoming anniversaries', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve upcoming anniversaries',
        },
      });
    }
  };

  /**
   * Get employee analytics
   */
  getEmployeeAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const analytics = await this.employeeService.getEmployeeAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: analytics,
        metadata: {
          generatedAt: new Date(),
          dateRange: { startDate, endDate },
        },
      });
    } catch (error) {
      logger.error('Failed to get employee analytics', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_FAILED',
          message: 'Failed to generate analytics',
        },
      });
    }
  };
}
