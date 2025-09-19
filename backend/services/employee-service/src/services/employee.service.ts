import { PrismaClient } from '@prisma/client';
import { createLogger, EventFactory, SYSTEM_EVENT_TYPES ,AuditService, NotificationService } from '@hrms/shared';
import { EmployeeRepository } from '../repositories/employee.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import { PositionRepository } from '../repositories/position.repository';
import {
  EmployeeCreateRequest,
  EmployeeUpdateRequest,
  EmployeeResponse,
  EmployeeSearchParams,
  EmployeeAnalytics,
} from '../types/employee.types';
import { PaginationParams, PaginationResult } from '@hrms/shared';
import { differenceInYears, differenceInDays, format } from 'date-fns';

const logger = createLogger('employee-service');

export class EmployeeService {
  private employeeRepository: EmployeeRepository;
  private departmentRepository: DepartmentRepository;
  private positionRepository: PositionRepository;
  private auditService: AuditService;
  private notificationService: NotificationService;

  constructor(
    prismaClient: PrismaClient,
    auditService: AuditService,
    notificationService: NotificationService
  ) {
    this.employeeRepository = new EmployeeRepository(prismaClient);
    this.departmentRepository = new DepartmentRepository(prismaClient);
    this.positionRepository = new PositionRepository(prismaClient);
    this.auditService = auditService;
    this.notificationService = notificationService;
  }

  /**
   * Create a new employee
   */
  async createEmployee(data: EmployeeCreateRequest, createdBy: string): Promise<EmployeeResponse> {
    try {
      // Validate department and position exist
      await this.validateDepartmentAndPosition(data.departmentId, data.positionId);

      // Validate manager if provided
      if (data.managerId) {
        await this.validateManager(data.managerId, data.departmentId);
      }

      // Check if email is already used
      const existingEmployee = await this.employeeRepository.findByEmail(data.email);
      if (existingEmployee) {
        throw new Error('Employee with this email already exists');
      }

      // Create employee
      const employee = await this.employeeRepository.createEmployee({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        maritalStatus: data.maritalStatus || null,
        nationality: data.nationality || null,
        address: data.address as any,
        emergencyContact: data.emergencyContact as any,
        departmentId: data.departmentId,
        positionId: data.positionId,
        managerId: data.managerId || null,
        hireDate: new Date(data.hireDate),
        employmentType: data.employmentType,
        workLocation: data.workLocation,
        baseSalary: data.baseSalary ? new (require('@prisma/client')).Prisma.Decimal(data.baseSalary) : null,
        currency: data.currency || 'USD',
        payrollSchedule: data.payrollSchedule || 'MONTHLY',
        skills: data.skills as any,
        certifications: data.certifications as any,
        education: data.education as any,
        experience: data.experience as any,
        status: 'ACTIVE',
        isActive: true,
        userId: null,
        terminationDate: null,
        benefits: null,
        profilePicture: null,
        documents: null,
        notes: null,
        deletedAt: null,
      });

      // Audit log
      await this.auditService.logAction({
        entityType: 'Employee',
        entityId: employee.id,
        action: 'create',
        userId: createdBy,
        changes: { created: employee },
        metadata: { employeeData: data }
      });

      // Send notifications
      await this.notificationService.sendEmployeeNotification('created', employee);

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: createdBy,
        action: 'EMPLOYEE_CREATED',
        resource: 'employee',
        resourceId: employee.id,
        changes: { created: employee },
      });

      logger.info('Employee created successfully', {
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        createdBy,
      });

      return this.transformEmployeeResponse(employee);
    } catch (error) {
      logger.error('Failed to create employee', error as Error);
      throw error;
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(id: string): Promise<EmployeeResponse | null> {
    try {
      const employee = await this.employeeRepository.findById(id, {
        include: ['department', 'position', 'manager'],
      });

      if (!employee) {
        return null;
      }

      return this.transformEmployeeResponse(employee);
    } catch (error) {
      logger.error('Failed to get employee by ID', error as Error);
      throw error;
    }
  }

  /**
   * Get employee by employee number
   */
  async getEmployeeByNumber(employeeNumber: string): Promise<EmployeeResponse | null> {
    try {
      const employee = await this.employeeRepository.findByEmployeeNumber(employeeNumber);

      if (!employee) {
        return null;
      }

      return this.transformEmployeeResponse(employee);
    } catch (error) {
      logger.error('Failed to get employee by number', error as Error);
      throw error;
    }
  }

  /**
   * Get employee by email
   */
  async getEmployeeByEmail(email: string): Promise<EmployeeResponse | null> {
    try {
      const employee = await this.employeeRepository.findByEmail(email);

      if (!employee) {
        return null;
      }

      return this.transformEmployeeResponse(employee);
    } catch (error) {
      logger.error('Failed to get employee by email', error as Error);
      throw error;
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(
    id: string,
    data: EmployeeUpdateRequest,
    updatedBy: string,
    reason?: string
  ): Promise<EmployeeResponse> {
    try {
      const existingEmployee = await this.employeeRepository.findById(id);
      if (!existingEmployee) {
        throw new Error('Employee not found');
      }

      // Validate department and position if changing
      if (data.departmentId || data.positionId) {
        await this.validateDepartmentAndPosition(
          data.departmentId || existingEmployee.departmentId,
          data.positionId || existingEmployee.positionId
        );
      }

      // Validate manager if changing
      if (data.managerId) {
        await this.validateManager(
          data.managerId,
          data.departmentId || existingEmployee.departmentId
        );
      }

      // Check email uniqueness if changing
      if (data.email && data.email !== existingEmployee.email) {
        const existingByEmail = await this.employeeRepository.findByEmail(data.email);
        if (existingByEmail) {
          throw new Error('Employee with this email already exists');
        }
      }

      // Prepare update data
      const updateData: any = {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        address: data.address as any,
        emergencyContact: data.emergencyContact as any,
        skills: data.skills as any,
        certifications: data.certifications as any,
        education: data.education as any,
        experience: data.experience as any,
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Update employee with history tracking
      const updatedEmployee = await this.employeeRepository.updateEmployeeWithHistory(
        id,
        updateData,
        updatedBy,
        reason
      );

      // Audit log
      await this.auditService.logAction({
        entityType: 'employee',
        entityId: id,
        action: 'update',
        userId: updatedBy,
        changes: { updated: updateData, previous: existingEmployee },
        metadata: { reason }
      });

      // Send notifications for significant changes
      await this.notificationService.sendEmployeeNotification('updated', updatedEmployee);

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: updatedBy,
        action: 'EMPLOYEE_UPDATED',
        resource: 'employee',
        resourceId: id,
        changes: { 
          before: existingEmployee,
          after: data,
        },
      });

      logger.info('Employee updated successfully', {
        employeeId: id,
        updatedBy,
        changes: Object.keys(data),
      });

      return this.transformEmployeeResponse(updatedEmployee);
    } catch (error) {
      logger.error('Failed to update employee', error as Error);
      throw error;
    }
  }

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(id: string, deletedBy: string, reason?: string): Promise<void> {
    try {
      const employee = await this.employeeRepository.findById(id);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Soft delete
      await this.employeeRepository.softDelete(id);

      // Audit log
      await this.auditService.logAction({
        entityType: 'employee',
        entityId: id,
        action: 'delete',
        userId: deletedBy,
        changes: { deleted: employee },
        metadata: { reason }
      });

      // Send notification
      await this.notificationService.sendEmployeeNotification('deleted', employee);

      // Publish event
      await EventFactory.publishEvent(SYSTEM_EVENT_TYPES.AUDIT_LOG_CREATED, {
        userId: deletedBy,
        action: 'EMPLOYEE_DELETED',
        resource: 'employee',
        resourceId: id,
        changes: { deleted: employee, reason },
      });

      logger.info('Employee deleted successfully', {
        employeeId: id,
        deletedBy,
        reason,
      });
    } catch (error) {
      logger.error('Failed to delete employee', error as Error);
      throw error;
    }
  }

  /**
   * Search employees
   */
  async searchEmployees(
    params: EmployeeSearchParams,
    pagination: PaginationParams
  ): Promise<PaginationResult<EmployeeResponse>> {
    try {
      const result = await this.employeeRepository.searchEmployees(params, pagination);
      
      return {
        ...result,
        data: result.data.map(employee => this.transformEmployeeResponse(employee)),
      };
    } catch (error) {
      logger.error('Failed to search employees', error as Error);
      throw error;
    }
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(departmentId: string): Promise<EmployeeResponse[]> {
    try {
      const employees = await this.employeeRepository.findByDepartment(departmentId);
      return employees.map(employee => this.transformEmployeeResponse(employee));
    } catch (error) {
      logger.error('Failed to get employees by department', error as Error);
      throw error;
    }
  }

  /**
   * Get employees by manager
   */
  async getEmployeesByManager(managerId: string): Promise<EmployeeResponse[]> {
    try {
      const employees = await this.employeeRepository.findByManager(managerId);
      return employees.map(employee => this.transformEmployeeResponse(employee));
    } catch (error) {
      logger.error('Failed to get employees by manager', error as Error);
      throw error;
    }
  }

  /**
   * Get employee hierarchy
   */
  async getEmployeeHierarchy(managerId: string): Promise<EmployeeResponse[]> {
    try {
      const employees = await this.employeeRepository.getEmployeeHierarchy(managerId);
      return employees.map(employee => this.transformEmployeeResponse(employee));
    } catch (error) {
      logger.error('Failed to get employee hierarchy', error as Error);
      throw error;
    }
  }

  /**
   * Get upcoming birthdays
   */
  async getUpcomingBirthdays(days: number = 30): Promise<EmployeeResponse[]> {
    try {
      const employees = await this.employeeRepository.getUpcomingBirthdays(days);
      return employees.map(employee => this.transformEmployeeResponse(employee));
    } catch (error) {
      logger.error('Failed to get upcoming birthdays', error as Error);
      throw error;
    }
  }

  /**
   * Get upcoming anniversaries
   */
  async getUpcomingAnniversaries(days: number = 30): Promise<EmployeeResponse[]> {
    try {
      const employees = await this.employeeRepository.getUpcomingAnniversaries(days);
      return employees.map(employee => this.transformEmployeeResponse(employee));
    } catch (error) {
      logger.error('Failed to get upcoming anniversaries', error as Error);
      throw error;
    }
  }

  /**
   * Get employee analytics
   */
  async getEmployeeAnalytics(startDate?: Date, endDate?: Date): Promise<EmployeeAnalytics> {
    try {
      const analytics = await this.employeeRepository.getEmployeeAnalytics(startDate, endDate);
      
      // Process and enhance the analytics data
      return {
        totalEmployees: analytics.totalEmployees,
        activeEmployees: analytics.activeEmployees,
        newHires: 0, // Calculate based on hire date within period
        terminations: 0, // Calculate based on termination date within period
        turnoverRate: 0, // Calculate turnover rate
        averageTenure: 0, // Calculate average tenure
        departmentBreakdown: analytics.departmentStats || [],
        positionBreakdown: [],
        demographicBreakdown: {
          genderBreakdown: {},
          ageGroups: {},
          workLocationBreakdown: analytics.workLocationBreakdown || {},
          employmentTypeBreakdown: analytics.employmentTypeBreakdown || {},
        },
      };
    } catch (error) {
      logger.error('Failed to get employee analytics', error as Error);
      throw error;
    }
  }

  /**
   * Validate department and position exist and are active
   */
  private async validateDepartmentAndPosition(departmentId: string, positionId: string): Promise<void> {
    const [department, position] = await Promise.all([
      this.departmentRepository.findById(departmentId),
      this.positionRepository.findById(positionId),
    ]);

    if (!department || !department.isActive) {
      throw new Error('Invalid or inactive department');
    }

    if (!position || !position.isActive) {
      throw new Error('Invalid or inactive position');
    }

    if (position.departmentId !== departmentId) {
      throw new Error('Position does not belong to the specified department');
    }
  }

  /**
   * Validate manager exists and is in the same department or higher hierarchy
   */
  private async validateManager(managerId: string, departmentId: string): Promise<void> {
    const manager = await this.employeeRepository.findById(managerId);

    if (!manager || manager.status !== 'ACTIVE') {
      throw new Error('Invalid or inactive manager');
    }

    // For now, allow managers from same department or any department
    // More complex hierarchy validation could be added here
  }

  /**
   * Transform employee data to response format
   */
  private transformEmployeeResponse(employee: any): EmployeeResponse {
    return {
      ...employee,
      fullName: `${employee.firstName} ${employee.lastName}`,
      age: employee.dateOfBirth ? differenceInYears(new Date(), employee.dateOfBirth) : undefined,
      tenure: this.calculateTenure(employee.hireDate),
    };
  }

  /**
   * Calculate employee tenure
   */
  private calculateTenure(hireDate: Date): string {
    const days = differenceInDays(new Date(), hireDate);
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);

    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  }
}
