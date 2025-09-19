import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { AttendanceService } from '../services/attendance.service';
import { AttendanceRepository } from '../repositories/attendance.repository';

const logger = createLogger('attendance-controller');

export class AttendanceController {
  private attendanceService: AttendanceService;
  private attendanceRepository: AttendanceRepository;

  constructor(prisma: PrismaClient) {
    this.attendanceRepository = new AttendanceRepository(prisma);
    this.attendanceService = new AttendanceService(this.attendanceRepository);
  }

  /**
   * Get attendance records with filters
   */
  getAttendanceRecords = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        employeeId,
        startDate,
        endDate,
        status,
        department,
        page = 1,
        limit = 20
      } = req.query as any;

      const filters = {
        employeeId: employeeId || (req as any).user?.id,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        department,
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString())
      };

      const result = await this.attendanceService.getAttendanceRecords(filters);

      res.json({
        success: true,
        data: result.records,
        meta: {
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        }
      });
    } catch (error) {
      logger.error('Get attendance records failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ATTENDANCE_FAILED',
          message: 'Failed to retrieve attendance records'
        }
      });
    }
  };

  /**
   * Get attendance dashboard data
   */
  getAttendanceDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const { date, employeeId } = req.query as any;
      const targetDate = date ? new Date(date) : new Date();
      const empId = employeeId || (req as any).user?.id;

      const dashboard = await this.attendanceService.getAttendanceDashboard(empId, targetDate);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Get attendance dashboard failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_DASHBOARD_FAILED',
          message: 'Failed to retrieve attendance dashboard'
        }
      });
    }
  };

  /**
   * Get employee attendance summary
   */
  getEmployeeAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query as any;

      const attendance = await this.attendanceService.getEmployeeAttendanceSummary(
        employeeId,
        startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate ? new Date(endDate) : new Date()
      );

      res.json({
        success: true,
        data: attendance
      });
    } catch (error) {
      logger.error('Get employee attendance failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_EMPLOYEE_ATTENDANCE_FAILED',
          message: 'Failed to retrieve employee attendance'
        }
      });
    }
  };

  /**
   * Get attendance analytics
   */
  getAttendanceAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        startDate, 
        endDate, 
        department,
        granularity = 'daily'
      } = req.query as any;

      const analytics = await this.attendanceService.getAttendanceAnalytics({
        startDate: startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate: endDate ? new Date(endDate) : new Date(),
        department,
        granularity
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Get attendance analytics failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ANALYTICS_FAILED',
          message: 'Failed to retrieve attendance analytics'
        }
      });
    }
  };

  /**
   * Update attendance record
   */
  updateAttendanceRecord = async (req: Request, res: Response): Promise<void> => {
    try {
      const { recordId } = req.params;
      const updateData = req.body;

      const record = await this.attendanceService.updateAttendanceRecord(recordId, updateData);

      res.json({
        success: true,
        data: record,
        message: 'Attendance record updated successfully'
      });
    } catch (error) {
      logger.error('Update attendance record failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ATTENDANCE_FAILED',
          message: 'Failed to update attendance record'
        }
      });
    }
  };

  /**
   * Generate attendance report
   */
  generateAttendanceReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        startDate,
        endDate,
        employeeIds,
        departments,
        format = 'json'
      } = req.body;

      const report = await this.attendanceService.generateAttendanceReport({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        employeeIds,
        departments,
        format
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
        res.send(report);
      } else {
        res.json({
          success: true,
          data: report
        });
      }
    } catch (error) {
      logger.error('Generate attendance report failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GENERATE_REPORT_FAILED',
          message: 'Failed to generate attendance report'
        }
      });
    }
  };
}
