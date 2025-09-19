import { PrismaClient } from '@prisma/client';
import { createLogger, EventFactory, SYSTEM_EVENT_TYPES ,AuditService, NotificationService } from '@hrms/shared';
import { PositionRepository } from '../repositories/position.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import {
  PositionCreateRequest,
  PositionUpdateRequest,
  PositionResponse,
  PositionSearchParams,
  PositionStats,
} from '../types/employee.types';
import { PaginationParams, PaginationResult } from '@hrms/shared';

const logger = createLogger('position-service');

export class PositionService {
  private positionRepository: PositionRepository;
  private departmentRepository: DepartmentRepository;
  private auditService: AuditService;
  private notificationService: NotificationService;

  constructor(
    prismaClient: PrismaClient,
    auditService: AuditService,
    notificationService: NotificationService
  ) {
    this.positionRepository = new PositionRepository(prismaClient);
    this.departmentRepository = new DepartmentRepository(prismaClient);
    this.auditService = auditService;
    this.notificationService = notificationService;
  }

  /**
   * Create a new position
   */
  async createPosition(data: PositionCreateRequest, createdBy: string): Promise<PositionResponse> {
    try {
      // Validate department exists
      const department = await this.departmentRepository.findById(data.departmentId);
      if (!department || !department.isActive) {
        throw new Error('Invalid or inactive department');
      }

      // Validate salary range
      if (data.salaryMin && data.salaryMax && data.salaryMin > data.salaryMax) {
        throw new Error('Minimum salary cannot be greater than maximum salary');
      }

      // Create position
      const position = await this.positionRepository.create({
        title: data.title,
        description: data.description || null,
        departmentId: data.departmentId,
        level: data.level || 1,
        salaryMin: data.salaryMin ? new (require('@prisma/client')).Prisma.Decimal(data.salaryMin) : null,
        salaryMax: data.salaryMax ? new (require('@prisma/client')).Prisma.Decimal(data.salaryMax) : null,
        requirements: data.requirements as any,
        responsibilities: data.responsibilities as any,
        isActive: true,
        deletedAt: null,
      });

      // Audit log
      await this.auditService.logAction({
        entityType: 'position',
        entityId: position.id,
        action: 'create',
        userId: createdBy,
        changes: { created: position },
        metadata: { positionData: data }
      });

      // Send notifications
      await this.notificationService.sendPositionNotification('created', position, department);

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: createdBy,
        action: 'POSITION_CREATED',
        resource: 'position',
        resourceId: position.id,
        changes: { created: position },
      });

      logger.info('Position created successfully', {
        positionId: position.id,
        positionTitle: position.title,
        departmentId: position.departmentId,
        createdBy,
      });

      return this.transformPositionResponse(position);
    } catch (error) {
      logger.error('Failed to create position', error as Error);
      throw error;
    }
  }

  /**
   * Get position by ID
   */
  async getPositionById(id: string): Promise<PositionResponse | null> {
    try {
      const position = await this.positionRepository.findById(id, {
        include: ['department', 'employees'],
      });

      if (!position) {
        return null;
      }

      return this.transformPositionResponse(position);
    } catch (error) {
      logger.error('Failed to get position by ID', error as Error);
      throw error;
    }
  }

  /**
   * Search positions
   */
  async searchPositions(
    params: PositionSearchParams,
    pagination: PaginationParams
  ): Promise<PaginationResult<PositionResponse>> {
    try {
      const paginationWithDefaults = {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        sortBy: pagination.sortBy,
        sortOrder: pagination.sortOrder
      };
      const result = await this.positionRepository.searchPositions(params, paginationWithDefaults);
      
      return {
        ...result,
        data: result.data.map(position => this.transformPositionResponse(position)),
      };
    } catch (error) {
      logger.error('Failed to search positions', error as Error);
      throw error;
    }
  }

  /**
   * Update position
   */
  async updatePosition(
    id: string,
    data: PositionUpdateRequest,
    updatedBy: string,
    reason?: string
  ): Promise<PositionResponse> {
    try {
      const existingPosition = await this.positionRepository.findById(id);
      if (!existingPosition) {
        throw new Error('Position not found');
      }

      // Validate department if changing
      if (data.departmentId) {
        const department = await this.departmentRepository.findById(data.departmentId);
        if (!department || !department.isActive) {
          throw new Error('Invalid or inactive department');
        }
      }

      // Validate salary range
      const salaryMin = data.salaryMin ?? existingPosition.salaryMin;
      const salaryMax = data.salaryMax ?? existingPosition.salaryMax;
      if (salaryMin && salaryMax && Number(salaryMin) > Number(salaryMax)) {
        throw new Error('Minimum salary cannot be greater than maximum salary');
      }

      // Prepare update data
      const updateData: any = {
        ...data,
        requirements: data.requirements as any,
        responsibilities: data.responsibilities as any,
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Update position
      const updatedPosition = await this.positionRepository.update(id, updateData);

      // Audit log
      await this.auditService.logAction({
        entityType: 'position',
        entityId: id,
        action: 'update',
        userId: updatedBy,
        changes: { updated: updateData, previous: existingPosition },
        metadata: { reason }
      });

      // Send notifications
      await this.notificationService.sendPositionNotification('updated', updatedPosition, undefined, existingPosition);

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: updatedBy,
        action: 'POSITION_UPDATED',
        resource: 'position',
        resourceId: id,
        changes: { 
          before: existingPosition,
          after: data,
        },
      });

      logger.info('Position updated successfully', {
        positionId: id,
        updatedBy,
        changes: Object.keys(data),
      });

      return this.transformPositionResponse(updatedPosition);
    } catch (error) {
      logger.error('Failed to update position', error as Error);
      throw error;
    }
  }

  /**
   * Delete position (soft delete)
   */
  async deletePosition(id: string, deletedBy: string, reason?: string): Promise<void> {
    try {
      const position = await this.positionRepository.findById(id);
      if (!position) {
        throw new Error('Position not found');
      }

      // Check if position has active employees
      const employeeCount = await this.positionRepository.getActiveEmployeeCount(id);
      if (employeeCount > 0) {
        throw new Error('Cannot delete position with active employees');
      }

      // Soft delete
      await this.positionRepository.softDelete(id);

      // Audit log
      await this.auditService.logAction({
        entityType: 'position',
        entityId: id,
        action: 'delete',
        userId: deletedBy,
        changes: { deleted: position },
        metadata: { reason }
      });

      // Send notifications
      await this.notificationService.sendPositionNotification('deleted', position);

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: deletedBy,
        action: 'POSITION_DELETED',
        resource: 'position',
        resourceId: id,
        changes: { deleted: position, reason },
      });

      logger.info('Position deleted successfully', {
        positionId: id,
        deletedBy,
        reason,
      });
    } catch (error) {
      logger.error('Failed to delete position', error as Error);
      throw error;
    }
  }

  /**
   * Get positions by department
   */
  async getPositionsByDepartment(departmentId: string): Promise<PositionResponse[]> {
    try {
      const positions = await this.positionRepository.findByDepartment(departmentId);
      return positions.map(position => this.transformPositionResponse(position));
    } catch (error) {
      logger.error('Failed to get positions by department', error as Error);
      throw error;
    }
  }

  /**
   * Get position statistics
   */
  async getPositionStats(id: string): Promise<PositionStats> {
    try {
      const position = await this.positionRepository.findById(id);
      if (!position) {
        throw new Error('Position not found');
      }

      const stats = await this.positionRepository.getPositionStats(id);
      
      return {
        positionId: id,
        positionTitle: position.title,
        employeeCount: stats.employeeCount,
        avgSalary: stats.avgSalary,
        vacancies: Math.max(0, 1 - stats.employeeCount),
        level: position.level,
        departmentId: position.departmentId,
        salaryRange: {
          min: position.salaryMin ? Number(position.salaryMin) : 0,
          max: position.salaryMax ? Number(position.salaryMax) : 0,
        },
        employeeSatisfaction: stats.satisfactionScore || 0
      };
    } catch (error) {
      logger.error('Failed to get position statistics', error as Error);
      throw error;
    }
  }

  /**
   * Get open positions
   */
  async getOpenPositions(departmentId?: string): Promise<PositionResponse[]> {
    try {
      const positions = await this.positionRepository.getOpenPositions(departmentId);
      return positions.map(position => this.transformPositionResponse(position));
    } catch (error) {
      logger.error('Failed to get open positions', error as Error);
      throw error;
    }
  }

  /**
   * Get position hierarchy by level
   */
  async getPositionHierarchy(departmentId?: string): Promise<PositionResponse[]> {
    try {
      const positions = await this.positionRepository.getPositionHierarchy(departmentId);
      return positions.map(position => this.transformPositionResponse(position));
    } catch (error) {
      logger.error('Failed to get position hierarchy', error as Error);
      throw error;
    }
  }

  /**
   * Transform position data to response format
   */
  private transformPositionResponse(position: any): PositionResponse {
    return {
      ...position,
      employeeCount: position.employees?.length || 0,
      requirements: Array.isArray(position.requirements) ? position.requirements : [],
      responsibilities: Array.isArray(position.responsibilities) ? position.responsibilities : [],
    };
  }
}
