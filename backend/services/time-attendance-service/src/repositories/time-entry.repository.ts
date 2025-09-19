import { PrismaClient, TimeEntry, TimeCorrection, Prisma } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { TimeEntryFilters, PaginatedTimeEntries } from '../types/time-attendance.types';

const logger = createLogger('time-entry-repository');

export class TimeEntryRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new time entry
   */
  async create(data: Prisma.TimeEntryCreateInput): Promise<TimeEntry> {
    try {
      return await this.prisma.timeEntry.create({
        data,
        include: {
          corrections: true,
          auditLogs: true
        }
      });
    } catch (error) {
      logger.error('Failed to create time entry', error as Error);
      throw error;
    }
  }

  /**
   * Find time entry by ID
   */
  async findById(id: string): Promise<TimeEntry | null> {
    try {
      return await this.prisma.timeEntry.findUnique({
        where: { id },
        include: {
          corrections: {
            orderBy: { createdAt: 'desc' }
          },
          auditLogs: {
            orderBy: { timestamp: 'desc' },
            take: 10
          }
        }
      });
    } catch (error) {
      logger.error('Failed to find time entry by ID', error as Error);
      throw error;
    }
  }

  /**
   * Find active time entry for employee
   */
  async findActiveByEmployeeId(employeeId: string): Promise<TimeEntry | null> {
    try {
      return await this.prisma.timeEntry.findFirst({
        where: {
          employeeId,
          clockOut: null,
          deletedAt: null
        },
        include: {
          corrections: true
        }
      });
    } catch (error) {
      logger.error('Failed to find active time entry', error as Error);
      throw error;
    }
  }

  /**
   * Find multiple time entries with filters and pagination
   */
  async findMany(filters: TimeEntryFilters): Promise<PaginatedTimeEntries> {
    try {
      const {
        employeeId,
        startDate,
        endDate,
        status,
        workLocation,
        page = 1,
        limit = 20
      } = filters;

      const where: Prisma.TimeEntryWhereInput = {
        deletedAt: null
      };

      if (employeeId) {
        where.employeeId = employeeId;
      }

      if (startDate || endDate) {
        where.clockIn = {};
        if (startDate) {
          where.clockIn.gte = startDate;
        }
        if (endDate) {
          where.clockIn.lte = endDate;
        }
      }

      if (status) {
        where.status = status;
      }

      if (workLocation) {
        where.workLocation = workLocation;
      }

      const skip = (page - 1) * limit;

      const [timeEntries, total] = await Promise.all([
        this.prisma.timeEntry.findMany({
          where,
          include: {
            corrections: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          },
          orderBy: { clockIn: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.timeEntry.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        timeEntries,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error('Failed to find time entries', error as Error);
      throw error;
    }
  }

  /**
   * Update time entry
   */
  async update(id: string, data: Prisma.TimeEntryUpdateInput): Promise<TimeEntry> {
    try {
      return await this.prisma.timeEntry.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          corrections: true,
          auditLogs: true
        }
      });
    } catch (error) {
      logger.error('Failed to update time entry', error as Error);
      throw error;
    }
  }

  /**
   * Soft delete time entry
   */
  async softDelete(id: string): Promise<TimeEntry> {
    try {
      return await this.prisma.timeEntry.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to soft delete time entry', error as Error);
      throw error;
    }
  }

  /**
   * Hard delete time entry
   */
  async delete(id: string): Promise<TimeEntry> {
    try {
      return await this.prisma.timeEntry.delete({
        where: { id }
      });
    } catch (error) {
      logger.error('Failed to delete time entry', error as Error);
      throw error;
    }
  }

  /**
   * Create time correction request
   */
  async createCorrection(data: Prisma.TimeCorrectionCreateInput): Promise<TimeCorrection> {
    try {
      return await this.prisma.timeCorrection.create({
        data,
        include: {
          timeEntry: true
        }
      });
    } catch (error) {
      logger.error('Failed to create time correction', error as Error);
      throw error;
    }
  }

  /**
   * Find corrections for time entry
   */
  async findCorrectionsByTimeEntryId(timeEntryId: string): Promise<TimeCorrection[]> {
    try {
      return await this.prisma.timeCorrection.findMany({
        where: { timeEntryId },
        include: {
          timeEntry: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      logger.error('Failed to find corrections', error as Error);
      throw error;
    }
  }

  /**
   * Update correction status
   */
  async updateCorrection(id: string, data: Prisma.TimeCorrectionUpdateInput): Promise<TimeCorrection> {
    try {
      return await this.prisma.timeCorrection.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          timeEntry: true
        }
      });
    } catch (error) {
      logger.error('Failed to update correction', error as Error);
      throw error;
    }
  }

  /**
   * Get time entries for date range (for attendance records)
   */
  async findByDateRange(employeeId: string, startDate: Date, endDate: Date): Promise<TimeEntry[]> {
    try {
      return await this.prisma.timeEntry.findMany({
        where: {
          employeeId,
          clockIn: {
            gte: startDate,
            lte: endDate
          },
          deletedAt: null
        },
        orderBy: { clockIn: 'asc' }
      });
    } catch (error) {
      logger.error('Failed to find time entries by date range', error as Error);
      throw error;
    }
  }

  /**
   * Get overtime entries for employee
   */
  async findOvertimeEntries(employeeId: string, startDate: Date, endDate: Date): Promise<TimeEntry[]> {
    try {
      return await this.prisma.timeEntry.findMany({
        where: {
          employeeId,
          clockIn: {
            gte: startDate,
            lte: endDate
          },
          overtimeHours: {
            gt: 0
          },
          deletedAt: null
        },
        orderBy: { clockIn: 'desc' }
      });
    } catch (error) {
      logger.error('Failed to find overtime entries', error as Error);
      throw error;
    }
  }

  /**
   * Get summary statistics for employee
   */
  async getEmployeeSummary(employeeId: string, startDate: Date, endDate: Date): Promise<{
    totalEntries: number;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    averageHoursPerDay: number;
  }> {
    try {
      const result = await this.prisma.timeEntry.aggregate({
        where: {
          employeeId,
          clockIn: {
            gte: startDate,
            lte: endDate
          },
          deletedAt: null
        },
        _count: { id: true },
        _sum: {
          totalHours: true,
          regularHours: true,
          overtimeHours: true
        }
      });

      const totalEntries = result._count.id || 0;
      const totalHours = Number(result._sum.totalHours || 0);
      const regularHours = Number(result._sum.regularHours || 0);
      const overtimeHours = Number(result._sum.overtimeHours || 0);

      return {
        totalEntries,
        totalHours,
        regularHours,
        overtimeHours,
        averageHoursPerDay: totalEntries > 0 ? totalHours / totalEntries : 0
      };
    } catch (error) {
      logger.error('Failed to get employee summary', error as Error);
      throw error;
    }
  }

  /**
   * Find entries requiring approval
   */
  async findPendingApprovals(managerId?: string, limit: number = 50): Promise<TimeEntry[]> {
    try {
      const where: Prisma.TimeEntryWhereInput = {
        status: 'PENDING_APPROVAL',
        deletedAt: null
      };

      // If manager ID is provided, filter by employees under this manager
      // This would require integration with employee service to get team members

      return await this.prisma.timeEntry.findMany({
        where,
        include: {
          corrections: {
            where: { status: 'PENDING' }
          }
        },
        orderBy: { clockIn: 'asc' },
        take: limit
      });
    } catch (error) {
      logger.error('Failed to find pending approvals', error as Error);
      throw error;
    }
  }

  /**
   * Bulk update time entries
   */
  async bulkUpdate(ids: string[], data: Prisma.TimeEntryUpdateInput): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.timeEntry.updateMany({
        where: {
          id: { in: ids }
        },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to bulk update time entries', error as Error);
      throw error;
    }
  }
}
