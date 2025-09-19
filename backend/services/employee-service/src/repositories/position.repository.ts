import { PrismaClient, Position, Prisma } from '@prisma/client';
import { PositionSearchParams } from '../types/employee.types';
import { PaginationParams, PaginationResult } from '../models/shared.models';

// Simple logger fallback
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data),
  error: (message: string, error?: Error) => console.error(`[ERROR] ${message}`, error),
  debug: (message: string, data?: any) => console.log(`[DEBUG] ${message}`, data),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data),
};


export class PositionRepository {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prismaClient = prismaClient;
  }

  private get model() {
    return this.prismaClient.position;
  }

  /**
   * Create a new position
   */
  async create(data: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>): Promise<Position> {
    try {
      return await this.model.create({
        data: {
          title: data.title,
          description: data.description,
          departmentId: data.departmentId,
          level: data.level,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          requirements: data.requirements as Prisma.InputJsonValue,
          responsibilities: data.responsibilities as Prisma.InputJsonValue,
          isActive: data.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to create position', error as Error);
      throw error;
    }
  }

  /**
   * Find position by ID
   */
  async findById(id: string, options?: { include?: string[] }): Promise<Position | null> {
    try {
      const include = options?.include ? this.buildInclude(options.include) : undefined;
      
      return await this.model.findUnique({
        where: { id },
        include,
      });
    } catch (error) {
      logger.error('Failed to find position by ID', error as Error);
      throw error;
    }
  }

  /**
   * Update position
   */
  async update(id: string, data: Partial<Position>): Promise<Position> {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Only include defined fields
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
      if (data.level !== undefined) updateData.level = data.level;
      if (data.salaryMin !== undefined) updateData.salaryMin = data.salaryMin;
      if (data.salaryMax !== undefined) updateData.salaryMax = data.salaryMax;
      if (data.requirements !== undefined) updateData.requirements = data.requirements as Prisma.InputJsonValue;
      if (data.responsibilities !== undefined) updateData.responsibilities = data.responsibilities as Prisma.InputJsonValue;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      return await this.model.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      logger.error('Failed to update position', error as Error);
      throw error;
    }
  }

  /**
   * Soft delete position
   */
  async softDelete(id: string): Promise<Position> {
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
      logger.error('Failed to soft delete position', error as Error);
      throw error;
    }
  }

  /**
   * Get active employee count for a position
   */
  async getActiveEmployeeCount(positionId: string): Promise<number> {
    try {
      const position = await this.model.findUnique({
        where: { id: positionId },
        include: {
          employees: {
            where: {
              status: 'ACTIVE',
              deletedAt: null,
            },
          },
        },
      });
      
      return position ? position.employees.length : 0;
    } catch (error) {
      logger.error('Failed to get active employee count', error as Error);
      throw error;
    }
  }

  /**
   * Get position statistics
   */
  async getPositionStats(positionId: string): Promise<{
    employeeCount: number;
    avgSalary: number;
    satisfactionScore?: number;
    requirementsFulfillment?: number;
  }> {
    try {
      const position = await this.model.findUnique({
        where: { id: positionId },
        include: {
          employees: {
            where: { deletedAt: null },
            select: {
              id: true,
              status: true,
              baseSalary: true,
            },
          },
        },
      });

      if (!position) {
        throw new Error('Position not found');
      }

      const employeeCount = position.employees.length;
      const activeEmployees = position.employees.filter((emp: any) => emp.status === 'ACTIVE');
      const activeEmployeeCount = activeEmployees.length;

      // Calculate average salary
      const avgSalary = activeEmployees.reduce((sum: number, emp: any) => {
        return sum + (emp.baseSalary ? Number(emp.baseSalary) : 0);
      }, 0) / (activeEmployeeCount || 1);

      return {
        employeeCount: activeEmployeeCount,
        avgSalary,
        satisfactionScore: 4.1, // Placeholder - would need survey data
        requirementsFulfillment: 85, // Placeholder - would need skill matching
      };
    } catch (error) {
      logger.error('Failed to get position statistics', error as Error);
      throw error;
    }
  }

  /**
   * Get open positions
   */
  async getOpenPositions(departmentId?: string): Promise<Position[]> {
    try {
      const where: any = {
        deletedAt: null,
        isActive: true,
        employees: {
          none: {
            status: 'ACTIVE',
            deletedAt: null,
          },
        },
      };

      if (departmentId) {
        where.departmentId = departmentId;
      }

      return await this.model.findMany({
        where,
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          { level: 'asc' },
          { title: 'asc' },
        ],
      });
    } catch (error) {
      logger.error('Failed to get open positions', error as Error);
      throw error;
    }
  }

  /**
   * Get position hierarchy by level
   */
  async getPositionHierarchy(departmentId?: string): Promise<Position[]> {
    try {
      const where: any = {
        deletedAt: null,
        isActive: true,
      };

      if (departmentId) {
        where.departmentId = departmentId;
      }

      return await this.model.findMany({
        where,
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
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
            },
          },
        },
        orderBy: [
          { level: 'desc' },
          { title: 'asc' },
        ],
      });
    } catch (error) {
      logger.error('Failed to get position hierarchy', error as Error);
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
        case 'department':
          includeObj.department = {
            select: {
              id: true,
              name: true,
              code: true,
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
        default:
          includeObj[field] = true;
      }
    }
    
    return includeObj;
  }

  /**
   * Find positions by department
   */
  async findByDepartment(departmentId: string): Promise<Position[]> {
    try {
      return await this.model.findMany({
        where: { 
          departmentId,
          deletedAt: null,
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
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
        },
        orderBy: [
          { level: 'asc' },
          { title: 'asc' },
        ],
      });
    } catch (error) {
      logger.error('Failed to find positions by department', error as Error);
      throw error;
    }
  }

  /**
   * Search positions with advanced filtering
   */
  async searchPositions(
    params: PositionSearchParams,
    pagination: PaginationParams
  ): Promise<PaginationResult<Position>> {
    try {
      const where = this.buildSearchWhere(params);
      const orderBy = this.buildSearchOrderBy(params);

      const [positions, total] = await Promise.all([
        this.model.findMany({
          where,
          include: {
            department: {
              select: {
                id: true,
                name: true,
                code: true,
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
                baseSalary: true,
              },
            },
          },
          orderBy,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
        }),
        this.model.count({ where }),
      ]);

      return this.buildPaginationResult(positions, total, pagination);
    } catch (error) {
      logger.error('Failed to search positions', error as Error);
      throw error;
    }
  }

  /**
   * Get position with detailed statistics
   */
  async getPositionWithStats(id: string): Promise<Position & {
    employeeCount: number;
    activeEmployeeCount: number;
    averageSalary: number;
    vacancies: number;
  } | null> {
    try {
      const position = await this.model.findUnique({
        where: { id },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
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
        },
      });

      if (!position) {
        return null;
      }

      const employeeCount = position.employees.length;
      const activeEmployeeCount = position.employees.filter(emp => emp.status === 'ACTIVE').length;
      const averageSalary = position.employees.reduce((sum, emp) => {
        return sum + (emp.baseSalary ? Number(emp.baseSalary) : 0);
      }, 0) / (employeeCount || 1);

      // Calculate vacancies (simplified - could be more complex based on business rules)
      const vacancies = Math.max(0, (position.level * 2) - activeEmployeeCount);

      return {
        ...position,
        employeeCount,
        activeEmployeeCount,
        averageSalary,
        vacancies,
      };
    } catch (error) {
      logger.error('Failed to get position with stats', error as Error);
      throw error;
    }
  }

  /**
   * Get positions by level range
   */
  async getPositionsByLevel(minLevel: number, maxLevel: number): Promise<Position[]> {
    try {
      return await this.model.findMany({
        where: {
          level: {
            gte: minLevel,
            lte: maxLevel,
          },
          deletedAt: null,
          isActive: true,
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
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
            },
          },
        },
        orderBy: [
          { level: 'asc' },
          { title: 'asc' },
        ],
      });
    } catch (error) {
      logger.error('Failed to get positions by level', error as Error);
      throw error;
    }
  }

  /**
   * Get positions by salary range
   */
  async getPositionsBySalaryRange(minSalary: number, maxSalary: number): Promise<Position[]> {
    try {
      return await this.model.findMany({
        where: {
          OR: [
            {
              salaryMin: {
                gte: minSalary,
                lte: maxSalary,
              },
            },
            {
              salaryMax: {
                gte: minSalary,
                lte: maxSalary,
              },
            },
          ],
          deletedAt: null,
          isActive: true,
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          employees: {
            where: { 
              deletedAt: null,
              status: 'ACTIVE',
            },
          },
        },
        orderBy: [
          { salaryMin: 'asc' },
          { title: 'asc' },
        ],
      });
    } catch (error) {
      logger.error('Failed to get positions by salary range', error as Error);
      throw error;
    }
  }

  /**
   * Get position analytics
   */
  async getPositionAnalytics(): Promise<any> {
    try {
      const [
        totalPositions,
        activePositions,
        positionStats,
        levelDistribution,
        salaryDistribution,
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
            department: {
              select: {
                name: true,
              },
            },
            employees: {
              where: { deletedAt: null },
              select: {
                status: true,
                baseSalary: true,
              },
            },
          },
        }),
        this.model.groupBy({
          by: ['level'],
          where: { deletedAt: null },
          _count: true,
        }),
        this.model.findMany({
          where: { 
            deletedAt: null,
            OR: [
              { salaryMin: { not: null } },
              { salaryMax: { not: null } },
            ],
          },
          select: {
            salaryMin: true,
            salaryMax: true,
          },
        }),
      ]);

      const positionMetrics = positionStats.map(position => {
        const employeeCount = position.employees.length;
        const activeEmployees = position.employees.filter(emp => emp.status === 'ACTIVE').length;
        const averageSalary = position.employees.reduce((sum, emp) => {
          return sum + (emp.baseSalary ? Number(emp.baseSalary) : 0);
        }, 0) / (employeeCount || 1);

        return {
          id: position.id,
          title: position.title,
          department: position.department.name,
          level: position.level,
          employeeCount,
          activeEmployees,
          averageSalary,
          salaryMin: position.salaryMin ? Number(position.salaryMin) : null,
          salaryMax: position.salaryMax ? Number(position.salaryMax) : null,
        };
      });

      return {
        totalPositions,
        activePositions,
        positionMetrics,
        levelDistribution,
        salaryDistribution,
      };
    } catch (error) {
      logger.error('Failed to get position analytics', error as Error);
      throw error;
    }
  }

  /**
   * Check if position title exists in department
   */
  async isTitleAvailableInDepartment(
    title: string, 
    departmentId: string, 
    excludeId?: string
  ): Promise<boolean> {
    try {
      const where: Prisma.PositionWhereInput = {
        title,
        departmentId,
        deletedAt: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existingPosition = await this.model.findFirst({ where });
      return !existingPosition;
    } catch (error) {
      logger.error('Failed to check position title availability', error as Error);
      throw error;
    }
  }

  /**
   * Build search where clause
   */
  private buildSearchWhere(params: PositionSearchParams): Prisma.PositionWhereInput {
    const where: Prisma.PositionWhereInput = {
      deletedAt: null,
    };

    if (params.query) {
      where.OR = [
        { title: { contains: params.query, mode: 'insensitive' } },
        { description: { contains: params.query, mode: 'insensitive' } },
        { department: { name: { contains: params.query, mode: 'insensitive' } } },
      ];
    }

    if (params.departmentId) {
      where.departmentId = params.departmentId;
    }

    if (params.level) {
      where.level = params.level;
    }

    if (params.salaryRange) {
      where.AND = [];
      
      if (params.salaryRange.min) {
        where.AND.push({
          OR: [
            { salaryMin: { gte: params.salaryRange.min } },
            { salaryMax: { gte: params.salaryRange.min } },
          ],
        });
      }

      if (params.salaryRange.max) {
        where.AND.push({
          OR: [
            { salaryMin: { lte: params.salaryRange.max } },
            { salaryMax: { lte: params.salaryRange.max } },
          ],
        });
      }
    }

    if (typeof params.isActive === 'boolean') {
      where.isActive = params.isActive;
    }

    return where;
  }

  /**
   * Build search order by clause
   */
  private buildSearchOrderBy(params: PositionSearchParams): Prisma.PositionOrderByWithRelationInput {
    const sortBy = params.sortBy || 'title';
    const sortOrder = params.sortOrder || 'asc';

    switch (sortBy) {
      case 'department':
        return { department: { name: sortOrder } };
      case 'employeeCount':
        return { employees: { _count: sortOrder } };
      default:
        return { [sortBy]: sortOrder };
    }
  }
}
