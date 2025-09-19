import { PrismaClient, AttendanceRecord, Prisma } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('attendance-repository');

interface AttendanceFilters {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  department?: string;
  page: number;
  limit: number;
}

interface PaginatedAttendanceRecords {
  records: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AttendanceRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create attendance record
   */
  async create(data: Prisma.AttendanceRecordCreateInput): Promise<AttendanceRecord> {
    try {
      return await this.prisma.attendanceRecord.create({
        data
      });
    } catch (error) {
      logger.error('Failed to create attendance record', error as Error);
      throw error;
    }
  }

  /**
   * Find attendance record by ID
   */
  async findById(id: string): Promise<AttendanceRecord | null> {
    try {
      return await this.prisma.attendanceRecord.findUnique({
        where: { id }
      });
    } catch (error) {
      logger.error('Failed to find attendance record by ID', error as Error);
      throw error;
    }
  }

  /**
   * Find attendance record by employee and date
   */
  async findByEmployeeAndDate(employeeId: string, date: Date): Promise<AttendanceRecord | null> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return await this.prisma.attendanceRecord.findFirst({
        where: {
          employeeId,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });
    } catch (error) {
      logger.error('Failed to find attendance record by employee and date', error as Error);
      throw error;
    }
  }

  /**
   * Find attendance records by date range
   */
  async findByDateRange(employeeId: string, startDate: Date, endDate: Date): Promise<AttendanceRecord[]> {
    try {
      return await this.prisma.attendanceRecord.findMany({
        where: {
          employeeId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'asc' }
      });
    } catch (error) {
      logger.error('Failed to find attendance records by date range', error as Error);
      throw error;
    }
  }

  /**
   * Find multiple attendance records with filters and pagination
   */
  async findMany(filters: AttendanceFilters): Promise<PaginatedAttendanceRecords> {
    try {
      const {
        employeeId,
        startDate,
        endDate,
        status,
        page = 1,
        limit = 20
      } = filters;

      const where: Prisma.AttendanceRecordWhereInput = {};

      if (employeeId) {
        where.employeeId = employeeId;
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = startDate;
        }
        if (endDate) {
          where.date.lte = endDate;
        }
      }

      if (status) {
        where.status = status as any;
      }

      const skip = (page - 1) * limit;

      const [records, total] = await Promise.all([
        this.prisma.attendanceRecord.findMany({
          where,
          orderBy: { date: 'desc' },
          skip,
          take: limit
        }),
        this.prisma.attendanceRecord.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        records,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error('Failed to find attendance records', error as Error);
      throw error;
    }
  }

  /**
   * Update attendance record
   */
  async update(id: string, data: Prisma.AttendanceRecordUpdateInput): Promise<AttendanceRecord> {
    try {
      return await this.prisma.attendanceRecord.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to update attendance record', error as Error);
      throw error;
    }
  }

  /**
   * Delete attendance record
   */
  async delete(id: string): Promise<AttendanceRecord> {
    try {
      return await this.prisma.attendanceRecord.delete({
        where: { id }
      });
    } catch (error) {
      logger.error('Failed to delete attendance record', error as Error);
      throw error;
    }
  }

  /**
   * Find records for reporting
   */
  async findForReport(filters: {
    startDate: Date;
    endDate: Date;
    employeeIds?: string[];
    departments?: string[];
  }): Promise<AttendanceRecord[]> {
    try {
      const where: Prisma.AttendanceRecordWhereInput = {
        date: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      };

      if (filters.employeeIds && filters.employeeIds.length > 0) {
        where.employeeId = {
          in: filters.employeeIds
        };
      }

      // Note: Department filtering would require joining with employee data
      // This would need to be implemented based on your employee service integration

      return await this.prisma.attendanceRecord.findMany({
        where,
        orderBy: [
          { date: 'desc' },
          { employeeId: 'asc' }
        ]
      });
    } catch (error) {
      logger.error('Failed to find records for report', error as Error);
      throw error;
    }
  }

  /**
   * Get attendance statistics for date range
   */
  async getAttendanceStats(employeeId: string, startDate: Date, endDate: Date): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalHours: number;
    averageHours: number;
  }> {
    try {
      const result = await this.prisma.attendanceRecord.aggregate({
        where: {
          employeeId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          id: true
        },
        _sum: {
          totalHours: true,
          lateMinutes: true
        }
      });

      const statusCounts = await this.prisma.attendanceRecord.groupBy({
        by: ['status'],
        where: {
          employeeId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          status: true
        }
      });

      const lateCount = await this.prisma.attendanceRecord.count({
        where: {
          employeeId,
          date: {
            gte: startDate,
            lte: endDate
          },
          lateMinutes: {
            gt: 0
          }
        }
      });

      const totalDays = result._count.id || 0;
      const totalHours = Number(result._sum.totalHours || 0);
      
      const presentDays = statusCounts.find(s => s.status === 'PRESENT')?._count.status || 0;
      const absentDays = statusCounts.find(s => s.status === 'ABSENT')?._count.status || 0;

      return {
        totalDays,
        presentDays,
        absentDays,
        lateDays: lateCount,
        totalHours,
        averageHours: totalDays > 0 ? totalHours / totalDays : 0
      };
    } catch (error) {
      logger.error('Failed to get attendance stats', error as Error);
      throw error;
    }
  }

  /**
   * Bulk create attendance records
   */
  async bulkCreate(records: Prisma.AttendanceRecordCreateInput[]): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.attendanceRecord.createMany({
        data: records,
        skipDuplicates: true
      });
    } catch (error) {
      logger.error('Failed to bulk create attendance records', error as Error);
      throw error;
    }
  }

  /**
   * Find attendance records that need approval
   */
  async findPendingApprovals(limit: number = 50): Promise<AttendanceRecord[]> {
    try {
      return await this.prisma.attendanceRecord.findMany({
        where: {
          // Add conditions for records that need approval
          // This depends on your business logic
        },
        orderBy: { date: 'asc' },
        take: limit
      });
    } catch (error) {
      logger.error('Failed to find pending approvals', error as Error);
      throw error;
    }
  }
}
