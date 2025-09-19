import { TimeEntry, TimeCorrection, TimeEntryStatus, CorrectionStatus } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { TimeEntryRepository } from '../repositories/time-entry.repository';
import { 
  TimeEntryCreateData,
  TimeEntryUpdateData,
  TimeEntryFilters,
  TimeEntryCorrectionData,
  PaginatedTimeEntries 
} from '../types/time-attendance.types';

const logger = createLogger('time-entry-service');

export class TimeEntryService {
  private timeEntryRepository: TimeEntryRepository;

  constructor(timeEntryRepository: TimeEntryRepository) {
    this.timeEntryRepository = timeEntryRepository;
  }

  /**
   * Clock in - Create new time entry
   */
  async clockIn(data: TimeEntryCreateData): Promise<TimeEntry> {
    try {
      // Check if employee already has an active time entry
      const activeEntry = await this.timeEntryRepository.findActiveByEmployeeId(data.employeeId);
      
      if (activeEntry) {
        throw new Error('Employee already has an active time entry');
      }

      const timeEntry = await this.timeEntryRepository.create({
        employeeId: data.employeeId,
        clockIn: new Date(),
        workLocation: data.workLocation,
        gpsLocation: data.gpsLocation,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
        notes: data.notes,
        status: TimeEntryStatus.ACTIVE
      });

      logger.info('Employee clocked in successfully', { 
        employeeId: data.employeeId,
        timeEntryId: timeEntry.id 
      });

      return timeEntry;
    } catch (error) {
      logger.error('Clock in failed', error as Error);
      throw error;
    }
  }

  /**
   * Clock out - Update existing time entry
   */
  async clockOut(timeEntryId: string, data: { notes?: string; gpsLocation?: any; ipAddress?: string }): Promise<TimeEntry> {
    try {
      const timeEntry = await this.timeEntryRepository.findById(timeEntryId);
      
      if (!timeEntry) {
        const error = new Error('Time entry not found');
        (error as any).code = 'TIME_ENTRY_NOT_FOUND';
        throw error;
      }

      if (timeEntry.clockOut) {
        throw new Error('Employee already clocked out');
      }

      const clockOutTime = new Date();
      const totalHours = this.calculateTotalHours(timeEntry.clockIn, clockOutTime, timeEntry.breakStart, timeEntry.breakEnd);
      const { regularHours, overtimeHours } = this.calculateRegularAndOvertimeHours(totalHours);

      const updatedEntry = await this.timeEntryRepository.update(timeEntryId, {
        clockOut: clockOutTime,
        totalHours,
        regularHours,
        overtimeHours,
        status: TimeEntryStatus.COMPLETED,
        notes: data.notes || timeEntry.notes,
        gpsLocation: data.gpsLocation || timeEntry.gpsLocation
      });

      logger.info('Employee clocked out successfully', { 
        employeeId: timeEntry.employeeId,
        timeEntryId,
        totalHours 
      });

      return updatedEntry;
    } catch (error) {
      logger.error('Clock out failed', error as Error);
      throw error;
    }
  }

  /**
   * Start break
   */
  async startBreak(timeEntryId: string): Promise<TimeEntry> {
    try {
      const timeEntry = await this.timeEntryRepository.findById(timeEntryId);
      
      if (!timeEntry) {
        throw new Error('Time entry not found');
      }

      if (timeEntry.breakStart) {
        throw new Error('Break already started');
      }

      if (timeEntry.clockOut) {
        throw new Error('Cannot start break after clocking out');
      }

      const updatedEntry = await this.timeEntryRepository.update(timeEntryId, {
        breakStart: new Date()
      });

      return updatedEntry;
    } catch (error) {
      logger.error('Start break failed', error as Error);
      throw error;
    }
  }

  /**
   * End break
   */
  async endBreak(timeEntryId: string): Promise<TimeEntry> {
    try {
      const timeEntry = await this.timeEntryRepository.findById(timeEntryId);
      
      if (!timeEntry) {
        throw new Error('Time entry not found');
      }

      if (!timeEntry.breakStart) {
        throw new Error('Break not started');
      }

      if (timeEntry.breakEnd) {
        throw new Error('Break already ended');
      }

      const breakEnd = new Date();
      const breakDuration = Math.floor((breakEnd.getTime() - timeEntry.breakStart.getTime()) / (1000 * 60)); // minutes

      const updatedEntry = await this.timeEntryRepository.update(timeEntryId, {
        breakEnd,
        breakDuration
      });

      return updatedEntry;
    } catch (error) {
      logger.error('End break failed', error as Error);
      throw error;
    }
  }

  /**
   * Get time entries with pagination and filters
   */
  async getTimeEntries(filters: TimeEntryFilters): Promise<PaginatedTimeEntries> {
    try {
      const result = await this.timeEntryRepository.findMany(filters);
      return result;
    } catch (error) {
      logger.error('Get time entries failed', error as Error);
      throw error;
    }
  }

  /**
   * Get time entry by ID
   */
  async getTimeEntryById(timeEntryId: string): Promise<TimeEntry | null> {
    try {
      return await this.timeEntryRepository.findById(timeEntryId);
    } catch (error) {
      logger.error('Get time entry failed', error as Error);
      throw error;
    }
  }

  /**
   * Get active time entry for employee
   */
  async getActiveTimeEntry(employeeId: string): Promise<TimeEntry | null> {
    try {
      return await this.timeEntryRepository.findActiveByEmployeeId(employeeId);
    } catch (error) {
      logger.error('Get active time entry failed', error as Error);
      throw error;
    }
  }

  /**
   * Update time entry
   */
  async updateTimeEntry(timeEntryId: string, data: TimeEntryUpdateData): Promise<TimeEntry> {
    try {
      const timeEntry = await this.timeEntryRepository.findById(timeEntryId);
      
      if (!timeEntry) {
        throw new Error('Time entry not found');
      }

      // Recalculate hours if clock times are updated
      let updateData = { ...data };
      if (data.clockIn || data.clockOut) {
        const clockIn = data.clockIn || timeEntry.clockIn;
        const clockOut = data.clockOut || timeEntry.clockOut;
        
        if (clockOut) {
          const totalHours = this.calculateTotalHours(clockIn, clockOut, timeEntry.breakStart, timeEntry.breakEnd);
          const { regularHours, overtimeHours } = this.calculateRegularAndOvertimeHours(totalHours);
          
          updateData = {
            ...updateData,
            totalHours,
            regularHours,
            overtimeHours
          };
        }
      }

      const updatedEntry = await this.timeEntryRepository.update(timeEntryId, updateData);

      logger.info('Time entry updated', { timeEntryId, updatedFields: Object.keys(data) });

      return updatedEntry;
    } catch (error) {
      logger.error('Update time entry failed', error as Error);
      throw error;
    }
  }

  /**
   * Request time correction
   */
  async requestCorrection(timeEntryId: string, data: TimeEntryCorrectionData): Promise<TimeCorrection> {
    try {
      const timeEntry = await this.timeEntryRepository.findById(timeEntryId);
      
      if (!timeEntry) {
        throw new Error('Time entry not found');
      }

      const correction = await this.timeEntryRepository.createCorrection({
        timeEntry: { connect: { id: timeEntryId } },
        employeeId: timeEntry.employeeId,
        requestedBy: data.requestedBy,
        originalClockIn: timeEntry.clockIn,
        newClockIn: data.newClockIn,
        originalClockOut: timeEntry.clockOut,
        newClockOut: data.newClockOut,
        reason: data.reason,
        justification: data.justification,
        status: CorrectionStatus.PENDING
      });

      logger.info('Time correction requested', { 
        timeEntryId, 
        correctionId: correction.id,
        requestedBy: data.requestedBy 
      });

      return correction;
    } catch (error) {
      logger.error('Request correction failed', error as Error);
      throw error;
    }
  }

  /**
   * Delete time entry (soft delete)
   */
  async deleteTimeEntry(timeEntryId: string): Promise<void> {
    try {
      await this.timeEntryRepository.softDelete(timeEntryId);
      logger.info('Time entry deleted', { timeEntryId });
    } catch (error) {
      logger.error('Delete time entry failed', error as Error);
      throw error;
    }
  }

  /**
   * Calculate total hours worked
   */
  private calculateTotalHours(
    clockIn: Date, 
    clockOut: Date, 
    breakStart?: Date | null, 
    breakEnd?: Date | null
  ): number {
    const workTime = clockOut.getTime() - clockIn.getTime();
    let breakTime = 0;

    if (breakStart && breakEnd) {
      breakTime = breakEnd.getTime() - breakStart.getTime();
    }

    const totalMilliseconds = workTime - breakTime;
    return Number((totalMilliseconds / (1000 * 60 * 60)).toFixed(2)); // Convert to hours
  }

  /**
   * Calculate regular and overtime hours
   */
  private calculateRegularAndOvertimeHours(totalHours: number): { regularHours: number; overtimeHours: number } {
    const standardWorkDay = 8; // 8 hours standard work day
    
    if (totalHours <= standardWorkDay) {
      return {
        regularHours: totalHours,
        overtimeHours: 0
      };
    }

    return {
      regularHours: standardWorkDay,
      overtimeHours: totalHours - standardWorkDay
    };
  }

  /**
   * Get time entry statistics for employee
   */
  async getEmployeeTimeStats(employeeId: string, startDate: Date, endDate: Date): Promise<{
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    totalDays: number;
    averageHoursPerDay: number;
  }> {
    try {
      const timeEntries = await this.timeEntryRepository.findMany({
        employeeId,
        startDate,
        endDate,
        page: 1,
        limit: 1000 // Get all entries for stats
      });

      const stats = timeEntries.timeEntries.reduce((acc, entry) => {
        acc.totalHours += Number(entry.totalHours || 0);
        acc.regularHours += Number(entry.regularHours || 0);
        acc.overtimeHours += Number(entry.overtimeHours || 0);
        acc.totalDays += 1;
        return acc;
      }, {
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        totalDays: 0
      });

      return {
        ...stats,
        averageHoursPerDay: stats.totalDays > 0 ? stats.totalHours / stats.totalDays : 0
      };
    } catch (error) {
      logger.error('Get employee time stats failed', error as Error);
      throw error;
    }
  }
}
