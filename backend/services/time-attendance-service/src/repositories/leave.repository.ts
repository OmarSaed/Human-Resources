import { PrismaClient, LeaveRequest, LeaveType, LeaveBalance, Prisma } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('leave-repository');

interface LeaveRequestFilters {
  employeeId?: string;
  leaveTypeId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

interface PaginatedLeaveRequests {
  requests: LeaveRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class LeaveRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create leave request
   */
  async create(data: Prisma.LeaveRequestCreateInput): Promise<LeaveRequest> {
    try {
      return await this.prisma.leaveRequest.create({
        data
      });
    } catch (error) {
      logger.error('Failed to create leave request', error as Error);
      throw error;
    }
  }

  /**
   * Find leave request by ID
   */
  async findById(id: string): Promise<LeaveRequest | null> {
    try {
      return await this.prisma.leaveRequest.findUnique({
        where: { id }
      });
    } catch (error) {
      logger.error('Failed to find leave request by ID', error as Error);
      throw error;
    }
  }

  /**
   * Find multiple leave requests with filters and pagination
   */
  async findMany(filters: LeaveRequestFilters): Promise<PaginatedLeaveRequests> {
    try {
      const {
        employeeId,
        leaveTypeId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = filters;

      const where: Prisma.LeaveRequestWhereInput = {};

      if (employeeId) {
        where.employeeId = employeeId;
      }

      if (leaveTypeId) {
        where.leaveTypeId = leaveTypeId;
      }

      if (status) {
        where.status = status as any;
      }

      if (startDate || endDate) {
        where.OR = [
          {
            startDate: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            endDate: {
              gte: startDate,
              lte: endDate
            }
          }
        ];
      }

      const skip = (page - 1) * limit;

      const [requests, total] = await Promise.all([
        this.prisma.leaveRequest.findMany({
          where,
          orderBy: { startDate: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.leaveRequest.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        requests,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error('Failed to find leave requests', error as Error);
      throw error;
    }
  }

  /**
   * Update leave request
   */
  async update(id: string, data: Prisma.LeaveRequestUpdateInput): Promise<LeaveRequest> {
    try {
      return await this.prisma.leaveRequest.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to update leave request', error as Error);
      throw error;
    }
  }

  /**
   * Find all leave types
   */
  async findAllLeaveTypes(): Promise<LeaveType[]> {
    try {
      return await this.prisma.leaveType.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      logger.error('Failed to find leave types', error as Error);
      throw error;
    }
  }

  /**
   * Create leave type
   */
  async createLeaveType(data: Prisma.LeaveTypeCreateInput): Promise<LeaveType> {
    try {
      return await this.prisma.leaveType.create({
        data
      });
    } catch (error) {
      logger.error('Failed to create leave type', error as Error);
      throw error;
    }
  }

  /**
   * Find leave balance for employee
   */
  async findLeaveBalance(employeeId: string, year: number): Promise<LeaveBalance[]> {
    try {
      return await this.prisma.leaveBalance.findMany({
        where: {
          employeeId,
          year
        },
        include: {
          leaveType: true
        }
      });
    } catch (error) {
      logger.error('Failed to find leave balance', error as Error);
      throw error;
    }
  }

  /**
   * Update leave balance
   */
  async updateLeaveBalance(employeeId: string, leaveTypeId: string, days: number): Promise<void> {
    try {
      const currentYear = new Date().getFullYear();
      
      await this.prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId,
            leaveTypeId,
            year: currentYear
          }
        },
        update: {
          used: {
            increment: Math.abs(days)
          },
          remaining: {
            decrement: days
          }
        },
        create: {
          employeeId,
          leaveTypeId,
          year: currentYear,
          allocated: 0, // This should be set based on leave type
          used: Math.abs(days),
          remaining: -days
        }
      });
    } catch (error) {
      logger.error('Failed to update leave balance', error as Error);
      throw error;
    }
  }

  /**
   * Find approved leaves for calendar
   */
  async findApprovedLeaves(startDate: Date, endDate: Date, departmentId?: string): Promise<LeaveRequest[]> {
    try {
      const where: Prisma.LeaveRequestWhereInput = {
        status: 'APPROVED',
        OR: [
          {
            startDate: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            endDate: {
              gte: startDate,
              lte: endDate
            }
          }
        ]
      };

      return await this.prisma.leaveRequest.findMany({
        where,
        orderBy: { startDate: 'asc' }
      });
    } catch (error) {
      logger.error('Failed to find approved leaves', error as Error);
      throw error;
    }
  }

  /**
   * Find leave requests by employee and year
   */
  async findByEmployeeAndYear(employeeId: string, year: number): Promise<LeaveRequest[]> {
    try {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);

      return await this.prisma.leaveRequest.findMany({
        where: {
          employeeId,
          startDate: {
            gte: startOfYear,
            lte: endOfYear
          }
        },
        orderBy: { startDate: 'desc' }
      });
    } catch (error) {
      logger.error('Failed to find leave requests by employee and year', error as Error);
      throw error;
    }
  }
}
