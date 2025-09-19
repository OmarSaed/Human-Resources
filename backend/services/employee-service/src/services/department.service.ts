import { PrismaClient } from '@prisma/client';
import { createLogger, EventFactory, SYSTEM_EVENT_TYPES, AuditService, NotificationService } from '@hrms/shared';
import { DepartmentRepository } from '../repositories/department.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import {
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  DepartmentResponse,
  DepartmentSearchParams,
  DepartmentStats,
} from '../types/employee.types';
import { PaginationParams, PaginationResult } from '@hrms/shared';

const logger = createLogger('department-service');

export class DepartmentService {
  private departmentRepository: DepartmentRepository;
  private employeeRepository: EmployeeRepository;
  private auditService: AuditService;
  private notificationService: NotificationService;

  constructor(
    prismaClient: PrismaClient,
    auditService: AuditService,
    notificationService: NotificationService
  ) {
    this.departmentRepository = new DepartmentRepository(prismaClient);
    this.employeeRepository = new EmployeeRepository(prismaClient);
    this.auditService = auditService;
    this.notificationService = notificationService;
  }

  /**
   * Create a new department
   */
  async createDepartment(data: DepartmentCreateRequest, createdBy: string): Promise<DepartmentResponse> {
    try {
      // Validate manager if provided
      if (data.managerId) {
        const manager = await this.employeeRepository.findById(data.managerId);
        if (!manager || manager.status !== 'ACTIVE') {
          throw new Error('Invalid or inactive manager');
        }
      }

      // Check if department code is unique
      const existingDepartment = await this.departmentRepository.findByCode(data.code);
      if (existingDepartment) {
        throw new Error('Department with this code already exists');
      }

      // Create department
      const department = await this.departmentRepository.create({
        name: data.name,
        description: data.description || null,
        code: data.code,
        managerId: data.managerId || null,
        budget: data.budget ? new (require('@prisma/client')).Prisma.Decimal(data.budget) : null,
        location: data.location || null,
        isActive: true,
        deletedAt: null,
      });

      // Audit log
      await this.auditService.logAction({
        entityType: 'department',
        entityId: department.id,
        action: 'create',
        userId: createdBy,
        changes: { created: department },
        metadata: { departmentData: data }
      });

      // Send notifications
      await this.notificationService.sendDepartmentNotification('created', department);

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: createdBy,
        action: 'DEPARTMENT_CREATED',
        resource: 'department',
        resourceId: department.id,
        changes: { created: department },
      });

      logger.info('Department created successfully', {
        departmentId: department.id,
        departmentCode: department.code,
        createdBy,
      });

      return this.transformDepartmentResponse(department);
    } catch (error) {
      logger.error('Failed to create department', error as Error);
      throw error;
    }
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(id: string): Promise<DepartmentResponse | null> {
    try {
      const department = await this.departmentRepository.findById(id, {
        include: ['manager', 'employees', 'positions'],
      });

      if (!department) {
        return null;
      }

      return this.transformDepartmentResponse(department);
    } catch (error) {
      logger.error('Failed to get department by ID', error as Error);
      throw error;
    }
  }

  /**
   * Search departments
   */
  async searchDepartments(
    params: DepartmentSearchParams,
    pagination: PaginationParams
  ): Promise<PaginationResult<DepartmentResponse>> {
    try {
      const paginationWithDefaults = {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        sortBy: pagination.sortBy,
        sortOrder: pagination.sortOrder
      };
      const result = await this.departmentRepository.searchDepartments(params, paginationWithDefaults);
      
      return {
        ...result,
        data: result.data.map(department => this.transformDepartmentResponse(department)),
      };
    } catch (error) {
      logger.error('Failed to search departments', error as Error);
      throw error;
    }
  }

  /**
   * Update department
   */
  async updateDepartment(
    id: string,
    data: DepartmentUpdateRequest,
    updatedBy: string,
    reason?: string
  ): Promise<DepartmentResponse> {
    try {
      const existingDepartment = await this.departmentRepository.findById(id);
      if (!existingDepartment) {
        throw new Error('Department not found');
      }

      // Validate manager if changing
      if (data.managerId) {
        const manager = await this.employeeRepository.findById(data.managerId);
        if (!manager || manager.status !== 'ACTIVE') {
          throw new Error('Invalid or inactive manager');
        }
      }

      // Check code uniqueness if changing
      if (data.code && data.code !== existingDepartment.code) {
        const existingByCode = await this.departmentRepository.findByCode(data.code);
        if (existingByCode) {
          throw new Error('Department with this code already exists');
        }
      }

      // Transform data for Prisma
      const updateData = {
        ...data,
        description: data.description !== undefined ? data.description || null : undefined,
        managerId: data.managerId !== undefined ? data.managerId || null : undefined,
        budget: data.budget !== undefined ? (data.budget ? new (require('@prisma/client')).Prisma.Decimal(data.budget) : null) : undefined,
        location: data.location !== undefined ? data.location || null : undefined,
        updatedAt: new Date(),
      };

      // Update department
      const updatedDepartment = await this.departmentRepository.update(id, updateData);

      // Audit log
      await this.auditService.logAction({
        entityType: 'department',
        entityId: id,
        action: 'update',
        userId: updatedBy,
        changes: { updated: updateData, previous: existingDepartment },
        metadata: { reason }
      });

      // Send notifications
      await this.notificationService.sendDepartmentNotification('updated', updatedDepartment, existingDepartment);

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: updatedBy,
        action: 'DEPARTMENT_UPDATED',
        resource: 'department',
        resourceId: id,
        changes: { 
          before: existingDepartment,
          after: data,
        },
      });

      logger.info('Department updated successfully', {
        departmentId: id,
        updatedBy,
        changes: Object.keys(data),
      });

      return this.transformDepartmentResponse(updatedDepartment);
    } catch (error) {
      logger.error('Failed to update department', error as Error);
      throw error;
    }
  }

  /**
   * Delete department (soft delete)
   */
  async deleteDepartment(id: string, deletedBy: string, reason?: string): Promise<void> {
    try {
      const department = await this.departmentRepository.findById(id);
      if (!department) {
        throw new Error('Department not found');
      }

      // Check if department has active employees
      const employeeCount = await this.departmentRepository.getActiveEmployeeCount(id);
      if (employeeCount > 0) {
        throw new Error('Cannot delete department with active employees');
      }

      // Soft delete
      await this.departmentRepository.softDelete(id);

      // Audit log
      await this.auditService.logAction({
        entityType: 'department',
        entityId: id,
        action: 'delete',
        userId: deletedBy,
        changes: { deleted: department },
        metadata: { reason }
      });

      // Send notifications
      await this.notificationService.sendDepartmentNotification('deleted', department);

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: deletedBy,
        action: 'DEPARTMENT_DELETED',
        resource: 'department',
        resourceId: id,
        changes: { deleted: department, reason },
      });

      logger.info('Department deleted successfully', {
        departmentId: id,
        deletedBy,
        reason,
      });
    } catch (error) {
      logger.error('Failed to delete department', error as Error);
      throw error;
    }
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(id: string): Promise<DepartmentStats> {
    try {
      const department = await this.departmentRepository.findById(id);
      if (!department) {
        throw new Error('Department not found');
      }

      const stats = await this.departmentRepository.getDepartmentStats(id);
      
      return {
        departmentId: id,
        departmentName: department.name,
        employeeCount: stats.employeeCount,
        avgSalary: stats.avgSalary,
        turnoverRate: stats.turnoverRate,
        totalBudget: department.budget ? Number(department.budget) : 0,
        budgetUtilization: stats.budgetUtilization || 0,
        openPositions: stats.openPositions || 0,
        satisfactionScore: stats.satisfactionScore || 0,
      };
    } catch (error) {
      logger.error('Failed to get department statistics', error as Error);
      throw error;
    }
  }

  /**
   * Get department hierarchy
   */
  async getDepartmentHierarchy(): Promise<DepartmentResponse[]> {
    try {
      const departments = await this.departmentRepository.getDepartmentHierarchy();
      return departments.map(department => this.transformDepartmentResponse(department));
    } catch (error) {
      logger.error('Failed to get department hierarchy', error as Error);
      throw error;
    }
  }

  /**
   * Transform department data to response format
   */
  private transformDepartmentResponse(department: any): DepartmentResponse {
    return {
      ...department,
      employeeCount: department.employees?.length || 0,
    };
  }
}
