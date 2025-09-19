import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { TimeEntryService } from '../services/time-entry.service';
import { TimeEntryRepository } from '../repositories/time-entry.repository';
import { 
  TimeEntryCreateRequest, 
  TimeEntryUpdateRequest,
  TimeEntrySearchParams,
  TimeEntryCorrectionRequest 
} from '../types/time-attendance.types';
import { validateTimeEntry, validateTimeEntryUpdate, validateTimeCorrection } from '../validation/time-entry.validation';

const logger = createLogger('time-entry-controller');

export class TimeEntryController {
  private timeEntryService: TimeEntryService;
  private timeEntryRepository: TimeEntryRepository;

  constructor(prisma: PrismaClient) {
    this.timeEntryRepository = new TimeEntryRepository(prisma);
    this.timeEntryService = new TimeEntryService(this.timeEntryRepository);
  }

  /**
   * Clock in - Create new time entry
   */
  clockIn = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = validateTimeEntry(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid time entry data',
            details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
          }
        });
        return;
      }

      const employeeId = (req as any).user?.id || req.body.employeeId;
      const timeEntry = await this.timeEntryService.clockIn({
        employeeId,
        workLocation: value.workLocation,
        gpsLocation: value.gpsLocation,
        deviceInfo: value.deviceInfo,
        ipAddress: req.ip,
        notes: value.notes
      });

      logger.info('Employee clocked in', { 
        employeeId, 
        timeEntryId: timeEntry.id,
        workLocation: timeEntry.workLocation 
      });

      res.status(201).json({
        success: true,
        data: timeEntry,
        message: 'Successfully clocked in'
      });
    } catch (error) {
      logger.error('Clock in failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLOCK_IN_FAILED',
          message: 'Failed to clock in'
        }
      });
    }
  };

  /**
   * Clock out - Update existing time entry
   */
  clockOut = async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeEntryId } = req.params;
      const { notes, gpsLocation } = req.body;

      const timeEntry = await this.timeEntryService.clockOut(timeEntryId, {
        notes,
        gpsLocation,
        ipAddress: req.ip
      });

      logger.info('Employee clocked out', { 
        employeeId: timeEntry.employeeId,
        timeEntryId: timeEntry.id,
        totalHours: timeEntry.totalHours
      });

      res.json({
        success: true,
        data: timeEntry,
        message: 'Successfully clocked out'
      });
    } catch (error) {
      logger.error('Clock out failed', error as Error);
      if ((error as any).code === 'TIME_ENTRY_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: {
            code: 'TIME_ENTRY_NOT_FOUND',
            message: 'Time entry not found'
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'CLOCK_OUT_FAILED',
          message: 'Failed to clock out'
        }
      });
    }
  };

  /**
   * Start break
   */
  startBreak = async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeEntryId } = req.params;
      
      const timeEntry = await this.timeEntryService.startBreak(timeEntryId);

      res.json({
        success: true,
        data: timeEntry,
        message: 'Break started'
      });
    } catch (error) {
      logger.error('Start break failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'START_BREAK_FAILED',
          message: 'Failed to start break'
        }
      });
    }
  };

  /**
   * End break
   */
  endBreak = async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeEntryId } = req.params;
      
      const timeEntry = await this.timeEntryService.endBreak(timeEntryId);

      res.json({
        success: true,
        data: timeEntry,
        message: 'Break ended'
      });
    } catch (error) {
      logger.error('End break failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'END_BREAK_FAILED',
          message: 'Failed to end break'
        }
      });
    }
  };

  /**
   * Get time entries with filters
   */
  getTimeEntries = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        employeeId,
        startDate,
        endDate,
        status,
        workLocation,
        page = 1,
        limit = 20
      } = req.query as TimeEntrySearchParams;

      const filters = {
        employeeId: employeeId || (req as any).user?.id,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        workLocation,
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString())
      };

      const result = await this.timeEntryService.getTimeEntries(filters);

      res.json({
        success: true,
        data: result.timeEntries,
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
      logger.error('Get time entries failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TIME_ENTRIES_FAILED',
          message: 'Failed to retrieve time entries'
        }
      });
    }
  };

  /**
   * Get single time entry
   */
  getTimeEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeEntryId } = req.params;
      
      const timeEntry = await this.timeEntryService.getTimeEntryById(timeEntryId);

      if (!timeEntry) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TIME_ENTRY_NOT_FOUND',
            message: 'Time entry not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: timeEntry
      });
    } catch (error) {
      logger.error('Get time entry failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_TIME_ENTRY_FAILED',
          message: 'Failed to retrieve time entry'
        }
      });
    }
  };

  /**
   * Update time entry
   */
  updateTimeEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeEntryId } = req.params;
      const { error, value } = validateTimeEntryUpdate(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
            details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
          }
        });
        return;
      }

      const timeEntry = await this.timeEntryService.updateTimeEntry(timeEntryId, value);

      res.json({
        success: true,
        data: timeEntry,
        message: 'Time entry updated successfully'
      });
    } catch (error) {
      logger.error('Update time entry failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_TIME_ENTRY_FAILED',
          message: 'Failed to update time entry'
        }
      });
    }
  };

  /**
   * Request time correction
   */
  requestCorrection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeEntryId } = req.params;
      const { error, value } = validateTimeCorrection(req.body);
      
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid correction request',
            details: error.details.map(d => ({ field: d.path.join('.'), message: d.message }))
          }
        });
        return;
      }

      const correction = await this.timeEntryService.requestCorrection(timeEntryId, {
        ...value,
        requestedBy: (req as any).user?.id
      });

      res.status(201).json({
        success: true,
        data: correction,
        message: 'Correction request submitted successfully'
      });
    } catch (error) {
      logger.error('Request correction failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REQUEST_CORRECTION_FAILED',
          message: 'Failed to submit correction request'
        }
      });
    }
  };

  /**
   * Get active time entry for employee
   */
  getActiveTimeEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      const employeeId = (req as any).user?.id || req.params.employeeId;
      
      const activeEntry = await this.timeEntryService.getActiveTimeEntry(employeeId);

      if (!activeEntry) {
        res.json({
          success: true,
          data: null,
          message: 'No active time entry'
        });
        return;
      }

      res.json({
        success: true,
        data: activeEntry
      });
    } catch (error) {
      logger.error('Get active time entry failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ACTIVE_TIME_ENTRY_FAILED',
          message: 'Failed to retrieve active time entry'
        }
      });
    }
  };

  /**
   * Delete time entry
   */
  deleteTimeEntry = async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeEntryId } = req.params;
      
      await this.timeEntryService.deleteTimeEntry(timeEntryId);

      res.json({
        success: true,
        message: 'Time entry deleted successfully'
      });
    } catch (error) {
      logger.error('Delete time entry failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_TIME_ENTRY_FAILED',
          message: 'Failed to delete time entry'
        }
      });
    }
  };
}
