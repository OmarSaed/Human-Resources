import { PrismaClient, Employee, Prisma } from '@prisma/client';
import { PrismaRepository, PaginationParams, PaginationResult } from '@hrms/shared';
import { EmployeeSearchParams } from '../types/employee.types';
import { createLogger } from '@hrms/shared';

const logger = createLogger('employee-repository');

export class EmployeeRepository extends PrismaRepository<Employee> {
  protected tableName = 'employees';
  protected modelName = 'employee';

  constructor(prismaClient: PrismaClient) {
    super(prismaClient);
  }

  /**
   * Find employee by employee number
   */
  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    try {
      return await this.model.findUnique({
        where: { employeeNumber },
        include: {
          department: true,
          position: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to find employee by employee number', error as Error);
      throw error;
    }
  }

  /**
   * Find employee by email
   */
  async findByEmail(email: string): Promise<Employee | null> {
    try {
      return await this.model.findUnique({
        where: { email },
        include: {
          department: true,
          position: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to find employee by email', error as Error);
      throw error;
    }
  }

  /**
   * Find employee by user ID (from auth service)
   */
  async findByUserId(userId: string): Promise<Employee | null> {
    try {
      return await this.model.findUnique({
        where: { userId },
        include: {
          department: true,
          position: true,
          manager: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find employee by user ID', error as Error);
      throw error;
    }
  }

  /**
   * Find employees by department
   */
  async findByDepartment(departmentId: string): Promise<Employee[]> {
    try {
      return await this.model.findMany({
        where: { 
          departmentId,
          deletedAt: null,
        },
        include: {
          position: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
            },
          },
        },
        orderBy: { firstName: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to find employees by department', error as Error);
      throw error;
    }
  }

  /**
   * Find employees by manager
   */
  async findByManager(managerId: string): Promise<Employee[]> {
    try {
      return await this.model.findMany({
        where: { 
          managerId,
          deletedAt: null,
        },
        include: {
          department: true,
          position: true,
        },
        orderBy: { firstName: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to find employees by manager', error as Error);
      throw error;
    }
  }

  /**
   * Search employees with advanced filtering
   */
  async searchEmployees(
    params: EmployeeSearchParams,
    pagination: PaginationParams
  ): Promise<PaginationResult<Employee>> {
    try {
      const where = this.buildSearchWhere(params);
      const orderBy = this.buildSearchOrderBy(params);

      const [employees, total] = await Promise.all([
        this.model.findMany({
          where,
          include: {
            department: true,
            position: true,
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
              },
            },
          },
          orderBy,
          skip: ((pagination.page || 1) - 1) * (pagination.limit || 20),
          take: pagination.limit,
        }),
        this.model.count({ where }),
      ]);

      return this.buildPaginationResult(employees, total, pagination);
    } catch (error) {
      logger.error('Failed to search employees', error as Error);
      throw error;
    }
  }

  /**
   * Get employees hierarchy starting from a manager
   */
  async getEmployeeHierarchy(managerId: string): Promise<Employee[]> {
    try {
      return await this.model.findMany({
        where: { 
          managerId,
          deletedAt: null,
        },
        include: {
          department: true,
          position: true,
          directReports: {
            include: {
              department: true,
              position: true,
            },
          },
        },
        orderBy: { firstName: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to get employee hierarchy', error as Error);
      throw error;
    }
  }

  /**
   * Get employees with upcoming birthdays
   */
  async getUpcomingBirthdays(days: number = 30): Promise<Employee[]> {
    try {
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + days);

      return await this.model.findMany({
        where: {
          dateOfBirth: {
            not: null,
          },
          deletedAt: null,
          status: 'ACTIVE',
        },
        include: {
          department: true,
          position: true,
        },
        orderBy: { dateOfBirth: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to get upcoming birthdays', error as Error);
      throw error;
    }
  }

  /**
   * Get employees with upcoming work anniversaries
   */
  async getUpcomingAnniversaries(days: number = 30): Promise<Employee[]> {
    try {
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + days);

      return await this.model.findMany({
        where: {
          hireDate: {
            not: null,
          },
          deletedAt: null,
          status: 'ACTIVE',
        },
        include: {
          department: true,
          position: true,
        },
        orderBy: { hireDate: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to get upcoming anniversaries', error as Error);
      throw error;
    }
  }

  /**
   * Get employee analytics
   */
  async getEmployeeAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const dateFilter = startDate && endDate ? {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      } : {};

      const [
        totalEmployees,
        activeEmployees,
        departmentStats,
        statusBreakdown,
        employmentTypeBreakdown,
        workLocationBreakdown,
      ] = await Promise.all([
        this.model.count({
          where: { deletedAt: null, ...dateFilter },
        }),
        this.model.count({
          where: { deletedAt: null, status: 'ACTIVE', ...dateFilter },
        }),
        this.model.groupBy({
          by: ['departmentId'],
          where: { deletedAt: null, ...dateFilter },
          _count: true,
          _avg: { baseSalary: true },
        }),
        this.model.groupBy({
          by: ['status'],
          where: { deletedAt: null, ...dateFilter },
          _count: true,
        }),
        this.model.groupBy({
          by: ['employmentType'],
          where: { deletedAt: null, ...dateFilter },
          _count: true,
        }),
        this.model.groupBy({
          by: ['workLocation'],
          where: { deletedAt: null, ...dateFilter },
          _count: true,
        }),
      ]);

      return {
        totalEmployees,
        activeEmployees,
        departmentStats,
        statusBreakdown,
        employmentTypeBreakdown,
        workLocationBreakdown,
      };
    } catch (error) {
      logger.error('Failed to get employee analytics', error as Error);
      throw error;
    }
  }

  /**
   * Generate next employee number
   */
  async generateEmployeeNumber(prefix: string = 'EMP'): Promise<string> {
    try {
      const lastEmployee = await this.model.findFirst({
        where: {
          employeeNumber: {
            startsWith: prefix,
          },
        },
        orderBy: { employeeNumber: 'desc' },
        select: { employeeNumber: true },
      });

      if (!lastEmployee) {
        return `${prefix}000001`;
      }

      const lastNumber = parseInt(lastEmployee.employeeNumber.replace(prefix, ''));
      const nextNumber = (lastNumber + 1).toString().padStart(6, '0');
      return `${prefix}${nextNumber}`;
    } catch (error) {
      logger.error('Failed to generate employee number', error as Error);
      throw error;
    }
  }

  /**
   * Build search where clause
   */
  private buildSearchWhere(params: EmployeeSearchParams): Prisma.EmployeeWhereInput {
    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
    };

    if (params.query) {
      where.OR = [
        { firstName: { contains: params.query, mode: 'insensitive' } },
        { lastName: { contains: params.query, mode: 'insensitive' } },
        { email: { contains: params.query, mode: 'insensitive' } },
        { employeeNumber: { contains: params.query, mode: 'insensitive' } },
      ];
    }

    if (params.departmentId) {
      where.departmentId = params.departmentId;
    }

    if (params.positionId) {
      where.positionId = params.positionId;
    }

    if (params.managerId) {
      where.managerId = params.managerId;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.employmentType) {
      where.employmentType = params.employmentType;
    }

    if (params.workLocation) {
      where.workLocation = params.workLocation;
    }

    if (params.hireDate) {
      where.hireDate = {};
      if (params.hireDate.from) {
        where.hireDate.gte = new Date(params.hireDate.from);
      }
      if (params.hireDate.to) {
        where.hireDate.lte = new Date(params.hireDate.to);
      }
    }

    if (params.skills && params.skills.length > 0) {
      where.skills = {
        path: ['$'],
        array_contains: params.skills,
      };
    }

    return where;
  }

  /**
   * Build search order by clause
   */
  private buildSearchOrderBy(params: EmployeeSearchParams): Prisma.EmployeeOrderByWithRelationInput {
    const sortBy = params.sortBy || 'firstName';
    const sortOrder = params.sortOrder || 'asc';

    switch (sortBy) {
      case 'department':
        return { department: { name: sortOrder } };
      case 'position':
        return { position: { title: sortOrder } };
      case 'manager':
        return { manager: { firstName: sortOrder } };
      default:
        return { [sortBy]: sortOrder };
    }
  }

  /**
   * Create employee with generated employee number
   */
  async createEmployee(data: Omit<Employee, 'id' | 'employeeNumber' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    try {
      const employeeNumber = await this.generateEmployeeNumber();
      
      return await this.create({
        ...data,
        employeeNumber,
      });
    } catch (error) {
      logger.error('Failed to create employee', error as Error);
      throw error;
    }
  }

  /**
   * Update employee with history tracking
   */
  async updateEmployeeWithHistory(
    id: string, 
    data: Partial<Employee>, 
    changedBy: string,
    reason?: string
  ): Promise<Employee> {
    try {
      return await this.withTransaction(async (prisma) => {
        // Get current employee data
        const currentEmployee = await prisma.employee.findUnique({
          where: { id },
        });

        if (!currentEmployee) {
          throw new Error('Employee not found');
        }

        // Update employee
        const updatedEmployee = await prisma.employee.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
          include: {
            department: true,
            position: true,
            manager: true,
          },
        });

        // Track significant changes in history
        const significantFields = ['departmentId', 'positionId', 'managerId', 'status', 'baseSalary'];
        for (const field of significantFields) {
          if (data[field as keyof Employee] && data[field as keyof Employee] !== currentEmployee[field as keyof Employee]) {
            await prisma.employeeHistory.create({
              data: {
                employeeId: id,
                changeType: this.getChangeType(field),
                field,
                oldValue: String(currentEmployee[field as keyof Employee] || ''),
                newValue: String(data[field as keyof Employee] || ''),
                effectiveDate: new Date(),
                changedBy,
                reason,
              },
            });
          }
        }

        return updatedEmployee;
      });
    } catch (error) {
      logger.error('Failed to update employee with history', error as Error);
      throw error;
    }
  }

  /**
   * Get change type based on field
   */
  private getChangeType(field: string): string {
    const changeTypeMap: Record<string, string> = {
      departmentId: 'DEPARTMENT_CHANGE',
      positionId: 'POSITION_CHANGE',
      managerId: 'TRANSFER',
      status: 'STATUS_CHANGE',
      baseSalary: 'SALARY_CHANGE',
    };

    return changeTypeMap[field] || 'PERSONAL_INFO_CHANGE';
  }
}
