import { PrismaClient, Department, Prisma } from '@prisma/client';
import { DepartmentSearchParams } from '../types/employee.types';
import { PaginationParams, PaginationResult } from '../models/shared.models';


// Simple logger fallback
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data),
  error: (message: string, error?: Error) => console.error(`[ERROR] ${message}`, error),
  debug: (message: string, data?: any) => console.log(`[DEBUG] ${message}`, data),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data),
};


export class DepartmentRepository {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private get model() {
    return this.prismaClient.department;
  }

  /**
   * Create a new department
   */
  async create(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Promise<Department> {
    try {
      return await this.model.create({
        data: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to create department', error as Error);
      throw error;
    }
  }

  /**
   * Find department by ID
   */
  async findById(id: string, options?: { include?: string[] }): Promise<Department | null> {
    try {
      const include = options?.include ? this.buildInclude(options.include) : undefined;
      
      return await this.model.findUnique({
        where: { id },
        include,
      });
    } catch (error) {
      logger.error('Failed to find department by ID', error as Error);
      throw error;
    }
  }

  /**
   * Update department
   */
  async update(id: string, data: Partial<Department>): Promise<Department> {
    try {
      return await this.model.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to update department', error as Error);
      throw error;
    }
  }

  /**
   * Soft delete department
   */
  async softDelete(id: string): Promise<Department> {
    try {
      return await this.model.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
          isActive: false,
        },
      });
    } catch (error) {
      logger.error('Failed to soft delete department', error as Error);
      throw error;
    }
  }

  /**
   * Build pagination result
   */
  private buildPaginationResult<T>(data: T[], total: number, pagination: PaginationParams): PaginationResult<T> {
    const totalPages = Math.ceil(total / pagination.limit);
    
    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    };
  }

  /**
   * Build include clause
   */
  private buildInclude(include: string[]): any {
    const includeObj: any = {};
    
    for (const field of include) {
      switch (field) {
        case 'manager':
          includeObj.manager = {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true,
            },
          };
          break;
        case 'employees':
          includeObj.employees = {
            where: { deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              status: true,
            },
          };
          break;
        case 'positions':
          includeObj.positions = {
            where: { deletedAt: null },
          };
          break;
        default:
          includeObj[field] = true;
      }
    }
    
    return includeObj;
  }

  /**
   * Find department by code
   */
  async findByCode(code: string): Promise<Department | null> {
    try {
      return await this.model.findUnique({
        where: { code },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true,
            },
          },
          employees: {
            where: { deletedAt: null },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              status: true,
            },
          },
          positions: {
            where: { deletedAt: null },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to find department by code', error as Error);
      throw error;
    }
  }

  /**
   * Find department by name
   */
  async findByName(name: string): Promise<Department | null> {
    try {
      return await this.model.findUnique({
        where: { name },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true,
            },
          },
          employees: {
            where: { deletedAt: null },
          },
          positions: {
            where: { deletedAt: null },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to find department by name', error as Error);
      throw error;
    }
  }

  /**
   * Search departments with advanced filtering
   */
  async searchDepartments(
    params: DepartmentSearchParams,
    pagination: PaginationParams
  ): Promise<PaginationResult<Department>> {
    try {
      const where = this.buildSearchWhere(params);
      const orderBy = this.buildSearchOrderBy(params);

      const [departments, total] = await Promise.all([
        this.model.findMany({
          where,
          include: {
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeNumber: true,
              },
            },
            employees: {
              where: { deletedAt: null },
              select: {
                id: true,
                status: true,
              },
            },
            positions: {
              where: { deletedAt: null },
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
        }),
        this.model.count({ where }),
      ]);

      return this.buildPaginationResult(departments, total, pagination);
    } catch (error) {
      logger.error('Failed to search departments', error as Error);
      throw error;
    }
  }

  /**
   * Get department with detailed statistics
   */
  async getDepartmentWithStats(id: string): Promise<Department & {
    employeeCount: number;
    activeEmployeeCount: number;
    positionCount: number;
    averageSalary: number;
  } | null> {
    try {
      const department = await this.model.findUnique({
        where: { id },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true,
            },
          },
          employees: {
            where: { deletedAt: null },
            select: {
              id: true,
              status: true,
              baseSalary: true,
            },
          },
          positions: {
            where: { deletedAt: null },
          },
        },
      });

      if (!department) {
        return null;
      }

      const employeeCount = department.employees.length;
      const activeEmployeeCount = department.employees.filter((emp: any) => emp.status === 'ACTIVE').length;
      const positionCount = department.positions.length;
      const averageSalary = department.employees.reduce((sum: number, emp: any) => {
        return sum + (emp.baseSalary ? Number(emp.baseSalary) : 0);
      }, 0) / (employeeCount || 1);

      return {
        ...department,
        employeeCount,
        activeEmployeeCount,
        positionCount,
        averageSalary,
      };
    } catch (error) {
      logger.error('Failed to get department with stats', error as Error);
      throw error;
    }
  }

  /**
   * Get all departments hierarchy
   */
  async getDepartmentHierarchy(): Promise<Department[]> {
    try {
      return await this.model.findMany({
        where: { 
          deletedAt: null,
          isActive: true,
        },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true,
            },
          },
          employees: {
            where: { 
              deletedAt: null,
              status: 'ACTIVE',
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
              position: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to get department hierarchy', error as Error);
      throw error;
    }
  }

  /**
   * Get department analytics
   */
  async getDepartmentAnalytics(): Promise<any> {
    try {
      const [
        totalDepartments,
        activeDepartments,
        departmentStats,
      ] = await Promise.all([
        this.model.count({
          where: { deletedAt: null },
        }),
        this.model.count({
          where: { deletedAt: null, isActive: true },
        }),
        this.model.findMany({
          where: { deletedAt: null },
          include: {
            employees: {
              where: { deletedAt: null },
              select: {
                status: true,
                baseSalary: true,
              },
            },
            positions: {
              where: { deletedAt: null },
            },
          },
        }),
      ]);

      const departmentMetrics = departmentStats.map((dept: any) => {
        const employeeCount = dept.employees.length;
        const activeEmployees = dept.employees.filter((emp: any) => emp.status === 'ACTIVE').length;
        const averageSalary = dept.employees.reduce((sum: number, emp: any) => {
          return sum + (emp.baseSalary ? Number(emp.baseSalary) : 0);
        }, 0) / (employeeCount || 1);

        return {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          employeeCount,
          activeEmployees,
          positionCount: dept.positions.length,
          averageSalary,
          budget: dept.budget ? Number(dept.budget) : 0,
        };
      });

      return {
        totalDepartments,
        activeDepartments,
        departmentMetrics,
      };
    } catch (error) {
      logger.error('Failed to get department analytics', error as Error);
      throw error;
    }
  }

  /**
   * Check if department code is available
   */
  async isCodeAvailable(code: string, excludeId?: string): Promise<boolean> {
    try {
      const where: Prisma.DepartmentWhereInput = {
        code,
        deletedAt: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existingDepartment = await this.model.findFirst({ where });
      return !existingDepartment;
    } catch (error) {
      logger.error('Failed to check department code availability', error as Error);
      throw error;
    }
  }

  /**
   * Check if department name is available
   */
  async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    try {
      const where: Prisma.DepartmentWhereInput = {
        name,
        deletedAt: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existingDepartment = await this.model.findFirst({ where });
      return !existingDepartment;
    } catch (error) {
      logger.error('Failed to check department name availability', error as Error);
      throw error;
    }
  }

  /**
   * Build search where clause
   */
  private buildSearchWhere(params: DepartmentSearchParams): Prisma.DepartmentWhereInput {
    const where: Prisma.DepartmentWhereInput = {
      deletedAt: null,
    };

    if (params.query) {
      where.OR = [
        { name: { contains: params.query, mode: 'insensitive' } },
        { code: { contains: params.query, mode: 'insensitive' } },
        { description: { contains: params.query, mode: 'insensitive' } },
        { location: { contains: params.query, mode: 'insensitive' } },
      ];
    }

    if (params.managerId) {
      where.managerId = params.managerId;
    }

    if (typeof params.isActive === 'boolean') {
      where.isActive = params.isActive;
    }

    return where;
  }

  /**
   * Get active employee count for a department
   */
  async getActiveEmployeeCount(departmentId: string): Promise<number> {
    try {
      const department = await this.model.findUnique({
        where: { id: departmentId },
        include: {
          employees: {
            where: {
              status: 'ACTIVE',
              deletedAt: null,
            },
          },
        },
      });
      
      return department ? department.employees.length : 0;
    } catch (error) {
      logger.error('Failed to get active employee count', error as Error);
      throw error;
    }
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(departmentId: string): Promise<{
    employeeCount: number;
    avgSalary: number;
    turnoverRate: number;
    budgetUtilization?: number;
    openPositions?: number;
    satisfactionScore?: number;
  }> {
    try {
      const department = await this.model.findUnique({
        where: { id: departmentId },
        include: {
          employees: {
            where: { deletedAt: null },
            select: {
              id: true,
              status: true,
              baseSalary: true,
              hireDate: true,
              terminationDate: true,
            },
          },
          positions: {
            where: { deletedAt: null },
            select: {
              id: true,
              employees: {
                where: { deletedAt: null },
                select: { id: true },
              },
            },
          },
        },
      });

      if (!department) {
        throw new Error('Department not found');
      }

      const employeeCount = department.employees.length;
      const activeEmployees = department.employees.filter((emp: any) => emp.status === 'ACTIVE');
      const activeEmployeeCount = activeEmployees.length;

      // Calculate average salary
      const avgSalary = activeEmployees.reduce((sum: number, emp: any) => {
        return sum + (emp.baseSalary ? Number(emp.baseSalary) : 0);
      }, 0) / (activeEmployeeCount || 1);

      // Calculate turnover rate (simplified calculation)
      const currentYear = new Date().getFullYear();
      const terminatedThisYear = department.employees.filter((emp: any) => 
        emp.terminationDate && emp.terminationDate.getFullYear() === currentYear
      ).length;
      const turnoverRate = (terminatedThisYear / (employeeCount || 1)) * 100;

      // Calculate open positions
      const openPositions = department.positions.reduce((sum: number, pos: any) => {
        return sum + Math.max(0, 1 - pos.employees.length); // Assuming 1 employee per position
      }, 0);

      return {
        employeeCount: activeEmployeeCount,
        avgSalary,
        turnoverRate,
        openPositions,
        budgetUtilization: 75, // Placeholder - would need actual budget tracking
        satisfactionScore: 4.2, // Placeholder - would need survey data
      };
    } catch (error) {
      logger.error('Failed to get department statistics', error as Error);
      throw error;
    }
  }

  /**
   * Build search order by clause
   */
  private buildSearchOrderBy(params: DepartmentSearchParams): Prisma.DepartmentOrderByWithRelationInput {
    const sortBy = params.sortBy || 'name';
    const sortOrder = params.sortOrder || 'asc';

    switch (sortBy) {
      case 'manager':
        return { manager: { firstName: sortOrder } };
      case 'employeeCount':
        return { employees: { _count: sortOrder } };
      default:
        return { [sortBy]: sortOrder };
    }
  }
}
