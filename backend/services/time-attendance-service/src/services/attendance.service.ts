import { AttendanceRecord, AttendanceStatus } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { AttendanceRepository } from '../repositories/attendance.repository';

const logger = createLogger('attendance-service');

interface AttendanceFilters {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: AttendanceStatus;
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

interface AttendanceDashboard {
  todayStatus: {
    clockedIn: boolean;
    clockInTime?: Date;
    clockOutTime?: Date;
    status: AttendanceStatus;
    totalHours?: number;
    lateMinutes: number;
  };
  weekSummary: {
    totalDays: number;
    presentDays: number;
    lateDays: number;
    totalHours: number;
    averageHours: number;
  };
  monthSummary: {
    totalWorkingDays: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    attendanceRate: number;
  };
  upcomingEvents: Array<{
    type: 'holiday' | 'leave' | 'meeting';
    date: Date;
    title: string;
  }>;
}

interface AttendanceAnalytics {
  attendanceRate: number;
  punctualityRate: number;
  averageWorkingHours: number;
  trends: {
    period: string;
    attendanceRate: number;
    punctualityRate: number;
    averageHours: number;
  }[];
  departmentBreakdown: {
    department: string;
    attendanceRate: number;
    employeeCount: number;
  }[];
  patterns: {
    peakAttendanceDays: string[];
    commonLateHours: string[];
    absencePatterns: string[];
  };
}

export class AttendanceService {
  private attendanceRepository: AttendanceRepository;

  constructor(attendanceRepository: AttendanceRepository) {
    this.attendanceRepository = attendanceRepository;
  }

  /**
   * Get attendance records with pagination and filters
   */
  async getAttendanceRecords(filters: AttendanceFilters): Promise<PaginatedAttendanceRecords> {
    try {
      return await this.attendanceRepository.findMany(filters);
    } catch (error) {
      logger.error('Get attendance records failed', error as Error);
      throw error;
    }
  }

  /**
   * Get attendance dashboard for employee
   */
  async getAttendanceDashboard(employeeId: string, date: Date): Promise<AttendanceDashboard> {
    try {
      const today = new Date(date);
      today.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get today's status
      const todayRecord = await this.attendanceRepository.findByEmployeeAndDate(employeeId, today);
      
      // Get week summary
      const weekRecords = await this.attendanceRepository.findByDateRange(
        employeeId,
        startOfWeek,
        today
      );

      // Get month summary
      const monthRecords = await this.attendanceRepository.findByDateRange(
        employeeId,
        startOfMonth,
        today
      );

      // Calculate metrics
      const todayStatus = {
        clockedIn: todayRecord?.clockIn ? true : false,
        clockInTime: todayRecord?.clockIn || undefined,
        clockOutTime: todayRecord?.clockOut || undefined,
        status: todayRecord?.status || AttendanceStatus.ABSENT,
        totalHours: todayRecord?.totalHours ? Number(todayRecord.totalHours) : undefined,
        lateMinutes: todayRecord?.lateMinutes || 0
      };

      const weekSummary = {
        totalDays: weekRecords.length,
        presentDays: weekRecords.filter(r => r.status === AttendanceStatus.PRESENT).length,
        lateDays: weekRecords.filter(r => r.lateMinutes > 0).length,
        totalHours: weekRecords.reduce((sum, r) => sum + Number(r.totalHours || 0), 0),
        averageHours: weekRecords.length > 0 
          ? weekRecords.reduce((sum, r) => sum + Number(r.totalHours || 0), 0) / weekRecords.length 
          : 0
      };

      const monthSummary = {
        totalWorkingDays: this.calculateWorkingDays(startOfMonth, today),
        presentDays: monthRecords.filter(r => r.status === AttendanceStatus.PRESENT).length,
        absentDays: monthRecords.filter(r => r.status === AttendanceStatus.ABSENT).length,
        leaveDays: monthRecords.filter(r => r.status === AttendanceStatus.ON_LEAVE).length,
        attendanceRate: monthRecords.length > 0 
          ? (monthRecords.filter(r => r.status === AttendanceStatus.PRESENT).length / monthRecords.length) * 100 
          : 0
      };

      // Get upcoming events (mock data for now)
      const upcomingEvents = [
        {
          type: 'holiday' as const,
          date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
          title: 'Company Holiday'
        }
      ];

      return {
        todayStatus,
        weekSummary,
        monthSummary,
        upcomingEvents
      };
    } catch (error) {
      logger.error('Get attendance dashboard failed', error as Error);
      throw error;
    }
  }

  /**
   * Get employee attendance summary
   */
  async getEmployeeAttendanceSummary(employeeId: string, startDate: Date, endDate: Date) {
    try {
      const records = await this.attendanceRepository.findByDateRange(employeeId, startDate, endDate);
      
      return {
        totalDays: records.length,
        presentDays: records.filter(r => r.status === AttendanceStatus.PRESENT).length,
        absentDays: records.filter(r => r.status === AttendanceStatus.ABSENT).length,
        lateDays: records.filter(r => r.lateMinutes > 0).length,
        halfDays: records.filter(r => r.status === AttendanceStatus.HALF_DAY).length,
        leaveDays: records.filter(r => r.status === AttendanceStatus.ON_LEAVE).length,
        totalHours: records.reduce((sum, r) => sum + Number(r.totalHours || 0), 0),
        averageHours: records.length > 0 
          ? records.reduce((sum, r) => sum + Number(r.totalHours || 0), 0) / records.length 
          : 0,
        attendanceRate: records.length > 0 
          ? (records.filter(r => r.status === AttendanceStatus.PRESENT).length / records.length) * 100 
          : 0,
        punctualityRate: records.length > 0 
          ? ((records.length - records.filter(r => r.lateMinutes > 0).length) / records.length) * 100 
          : 0,
        records
      };
    } catch (error) {
      logger.error('Get employee attendance summary failed', error as Error);
      throw error;
    }
  }

  /**
   * Get attendance analytics
   */
  async getAttendanceAnalytics(params: {
    startDate: Date;
    endDate: Date;
    department?: string;
    granularity: 'daily' | 'weekly' | 'monthly';
  }): Promise<AttendanceAnalytics> {
    try {
      // This would typically aggregate data from multiple employees
      // For now, returning mock analytics structure
      return {
        attendanceRate: 92.5,
        punctualityRate: 87.3,
        averageWorkingHours: 8.2,
        trends: [
          {
            period: '2024-01',
            attendanceRate: 90.2,
            punctualityRate: 85.1,
            averageHours: 8.1
          },
          {
            period: '2024-02',
            attendanceRate: 92.5,
            punctualityRate: 87.3,
            averageHours: 8.2
          }
        ],
        departmentBreakdown: [
          {
            department: 'Engineering',
            attendanceRate: 94.2,
            employeeCount: 25
          },
          {
            department: 'Marketing',
            attendanceRate: 91.1,
            employeeCount: 15
          }
        ],
        patterns: {
          peakAttendanceDays: ['Tuesday', 'Wednesday', 'Thursday'],
          commonLateHours: ['9:15 AM', '9:30 AM'],
          absencePatterns: ['Monday', 'Friday']
        }
      };
    } catch (error) {
      logger.error('Get attendance analytics failed', error as Error);
      throw error;
    }
  }

  /**
   * Update attendance record
   */
  async updateAttendanceRecord(recordId: string, updateData: any): Promise<AttendanceRecord> {
    try {
      return await this.attendanceRepository.update(recordId, updateData);
    } catch (error) {
      logger.error('Update attendance record failed', error as Error);
      throw error;
    }
  }

  /**
   * Generate attendance report
   */
  async generateAttendanceReport(params: {
    startDate: Date;
    endDate: Date;
    employeeIds?: string[];
    departments?: string[];
    format: 'json' | 'csv';
  }) {
    try {
      const filters = {
        startDate: params.startDate,
        endDate: params.endDate,
        employeeIds: params.employeeIds,
        departments: params.departments
      };

      const records = await this.attendanceRepository.findForReport(filters);

      if (params.format === 'csv') {
        return this.convertToCSV(records);
      }

      return {
        reportInfo: {
          generatedAt: new Date(),
          period: {
            startDate: params.startDate,
            endDate: params.endDate
          },
          totalRecords: records.length
        },
        summary: {
          totalEmployees: new Set(records.map(r => r.employeeId)).size,
          averageAttendanceRate: records.length > 0 
            ? (records.filter(r => r.status === AttendanceStatus.PRESENT).length / records.length) * 100 
            : 0,
          totalWorkingDays: this.calculateWorkingDays(params.startDate, params.endDate)
        },
        records
      };
    } catch (error) {
      logger.error('Generate attendance report failed', error as Error);
      throw error;
    }
  }

  /**
   * Process time entries to create attendance records
   */
  async processTimeEntryToAttendance(timeEntryId: string): Promise<AttendanceRecord> {
    try {
      // This would typically fetch the time entry and create/update attendance record
      // Implementation depends on the relationship between time entries and attendance records
      throw new Error('Method not implemented');
    } catch (error) {
      logger.error('Process time entry to attendance failed', error as Error);
      throw error;
    }
  }

  /**
   * Helper method to calculate working days
   */
  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  /**
   * Helper method to convert records to CSV
   */
  private convertToCSV(records: any[]): string {
    if (records.length === 0) return '';

    const headers = Object.keys(records[0]).join(',');
    const rows = records.map(record => 
      Object.values(record).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }
}
