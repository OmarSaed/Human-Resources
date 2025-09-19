import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { LeaveService } from '../services/leave.service';
import { LeaveRepository } from '../repositories/leave.repository';

const logger = createLogger('leave-controller');

export class LeaveController {
  private leaveService: LeaveService;
  private leaveRepository: LeaveRepository;

  constructor(prisma: PrismaClient) {
    this.leaveRepository = new LeaveRepository(prisma);
    this.leaveService = new LeaveService(this.leaveRepository);
  }

  /**
   * Get leave requests with filters
   */
  getLeaveRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        employeeId,
        leaveTypeId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query as any;

      const filters = {
        employeeId: employeeId || (req as any).user?.id,
        leaveTypeId,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString())
      };

      const result = await this.leaveService.getLeaveRequests(filters);

      res.json({
        success: true,
        data: result.requests,
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
      logger.error('Get leave requests failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_LEAVE_REQUESTS_FAILED',
          message: 'Failed to retrieve leave requests'
        }
      });
    }
  };

  /**
   * Create leave request
   */
  createLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const employeeId = (req as any).user?.id;
      const leaveData = {
        ...req.body,
        employeeId
      };

      const request = await this.leaveService.createLeaveRequest(leaveData);

      res.status(201).json({
        success: true,
        data: request,
        message: 'Leave request created successfully'
      });
    } catch (error) {
      logger.error('Create leave request failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_LEAVE_REQUEST_FAILED',
          message: 'Failed to create leave request'
        }
      });
    }
  };

  /**
   * Get single leave request
   */
  getLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;
      
      const request = await this.leaveService.getLeaveRequestById(requestId);

      if (!request) {
        res.status(404).json({
          success: false,
          error: {
            code: 'LEAVE_REQUEST_NOT_FOUND',
            message: 'Leave request not found'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      logger.error('Get leave request failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_LEAVE_REQUEST_FAILED',
          message: 'Failed to retrieve leave request'
        }
      });
    }
  };

  /**
   * Update leave request
   */
  updateLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;
      const updateData = req.body;

      const request = await this.leaveService.updateLeaveRequest(requestId, updateData);

      res.json({
        success: true,
        data: request,
        message: 'Leave request updated successfully'
      });
    } catch (error) {
      logger.error('Update leave request failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_LEAVE_REQUEST_FAILED',
          message: 'Failed to update leave request'
        }
      });
    }
  };

  /**
   * Approve leave request
   */
  approveLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;
      const { notes } = req.body;
      const approverId = (req as any).user?.id;

      const request = await this.leaveService.approveLeaveRequest(requestId, approverId, notes);

      res.json({
        success: true,
        data: request,
        message: 'Leave request approved successfully'
      });
    } catch (error) {
      logger.error('Approve leave request failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'APPROVE_LEAVE_REQUEST_FAILED',
          message: 'Failed to approve leave request'
        }
      });
    }
  };

  /**
   * Reject leave request
   */
  rejectLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;
      const rejectorId = (req as any).user?.id;

      const request = await this.leaveService.rejectLeaveRequest(requestId, rejectorId, reason);

      res.json({
        success: true,
        data: request,
        message: 'Leave request rejected'
      });
    } catch (error) {
      logger.error('Reject leave request failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REJECT_LEAVE_REQUEST_FAILED',
          message: 'Failed to reject leave request'
        }
      });
    }
  };

  /**
   * Get leave types
   */
  getLeaveTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const leaveTypes = await this.leaveService.getLeaveTypes();

      res.json({
        success: true,
        data: leaveTypes
      });
    } catch (error) {
      logger.error('Get leave types failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_LEAVE_TYPES_FAILED',
          message: 'Failed to retrieve leave types'
        }
      });
    }
  };

  /**
   * Create leave type
   */
  createLeaveType = async (req: Request, res: Response): Promise<void> => {
    try {
      const leaveType = await this.leaveService.createLeaveType(req.body);

      res.status(201).json({
        success: true,
        data: leaveType,
        message: 'Leave type created successfully'
      });
    } catch (error) {
      logger.error('Create leave type failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_LEAVE_TYPE_FAILED',
          message: 'Failed to create leave type'
        }
      });
    }
  };

  /**
   * Get employee leave balance
   */
  getLeaveBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const { year } = req.query as any;

      const balance = await this.leaveService.getEmployeeLeaveBalance(
        employeeId,
        year ? parseInt(year) : new Date().getFullYear()
      );

      res.json({
        success: true,
        data: balance
      });
    } catch (error) {
      logger.error('Get leave balance failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_LEAVE_BALANCE_FAILED',
          message: 'Failed to retrieve leave balance'
        }
      });
    }
  };

  /**
   * Get leave calendar
   */
  getLeaveCalendar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, departmentId } = req.query as any;

      const calendar = await this.leaveService.getLeaveCalendar({
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(new Date().getFullYear(), 11, 31),
        departmentId
      });

      res.json({
        success: true,
        data: calendar
      });
    } catch (error) {
      logger.error('Get leave calendar failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_LEAVE_CALENDAR_FAILED',
          message: 'Failed to retrieve leave calendar'
        }
      });
    }
  };

  /**
   * Cancel leave request
   */
  cancelLeaveRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;

      const request = await this.leaveService.cancelLeaveRequest(requestId, reason);

      res.json({
        success: true,
        data: request,
        message: 'Leave request cancelled successfully'
      });
    } catch (error) {
      logger.error('Cancel leave request failed', error as Error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CANCEL_LEAVE_REQUEST_FAILED',
          message: 'Failed to cancel leave request'
        }
      });
    }
  };
}
