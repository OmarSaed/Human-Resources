import { LeaveRequest, LeaveType, LeaveBalance, LeaveStatus } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { LeaveRepository } from '../repositories/leave.repository';

const logger = createLogger('leave-service');

interface LeaveRequestFilters {
  employeeId?: string;
  leaveTypeId?: string;
  status?: LeaveStatus;
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

export class LeaveService {
  private leaveRepository: LeaveRepository;

  constructor(leaveRepository: LeaveRepository) {
    this.leaveRepository = leaveRepository;
  }

  /**
   * Get leave requests with pagination and filters
   */
  async getLeaveRequests(filters: LeaveRequestFilters): Promise<PaginatedLeaveRequests> {
    try {
      return await this.leaveRepository.findMany(filters);
    } catch (error) {
      logger.error('Get leave requests failed', error as Error);
      throw error;
    }
  }

  /**
   * Create new leave request
   */
  async createLeaveRequest(data: any): Promise<LeaveRequest> {
    try {
      // Validate leave balance
      const balance = await this.getEmployeeLeaveBalance(data.employeeId, new Date().getFullYear());
      const leaveType = balance.find(b => b.leaveTypeId === data.leaveTypeId);
      
      if (!leaveType || leaveType.remaining < data.totalDays) {
        throw new Error('Insufficient leave balance');
      }

      // Calculate total days
      const totalDays = this.calculateLeaveDays(new Date(data.startDate), new Date(data.endDate));

      const leaveRequest = await this.leaveRepository.create({
        ...data,
        totalDays,
        status: LeaveStatus.PENDING
      });

      logger.info('Leave request created', { 
        requestId: leaveRequest.id,
        employeeId: data.employeeId 
      });

      return leaveRequest;
    } catch (error) {
      logger.error('Create leave request failed', error as Error);
      throw error;
    }
  }

  /**
   * Get leave request by ID
   */
  async getLeaveRequestById(requestId: string): Promise<LeaveRequest | null> {
    try {
      return await this.leaveRepository.findById(requestId);
    } catch (error) {
      logger.error('Get leave request failed', error as Error);
      throw error;
    }
  }

  /**
   * Update leave request
   */
  async updateLeaveRequest(requestId: string, updateData: any): Promise<LeaveRequest> {
    try {
      const request = await this.leaveRepository.findById(requestId);
      
      if (!request) {
        throw new Error('Leave request not found');
      }

      if (request.status !== LeaveStatus.PENDING) {
        throw new Error('Only pending requests can be updated');
      }

      return await this.leaveRepository.update(requestId, updateData);
    } catch (error) {
      logger.error('Update leave request failed', error as Error);
      throw error;
    }
  }

  /**
   * Approve leave request
   */
  async approveLeaveRequest(requestId: string, approverId: string, notes?: string): Promise<LeaveRequest> {
    try {
      const request = await this.leaveRepository.findById(requestId);
      
      if (!request) {
        throw new Error('Leave request not found');
      }

      if (request.status !== LeaveStatus.PENDING) {
        throw new Error('Only pending requests can be approved');
      }

      const updatedRequest = await this.leaveRepository.update(requestId, {
        status: LeaveStatus.APPROVED,
        approvedBy: approverId,
        approvedAt: new Date()
      });

      // Update leave balance
      await this.updateLeaveBalance(request.employeeId, request.leaveTypeId, -request.totalDays);

      logger.info('Leave request approved', { 
        requestId,
        approverId 
      });

      return updatedRequest;
    } catch (error) {
      logger.error('Approve leave request failed', error as Error);
      throw error;
    }
  }

  /**
   * Reject leave request
   */
  async rejectLeaveRequest(requestId: string, rejectorId: string, reason: string): Promise<LeaveRequest> {
    try {
      const request = await this.leaveRepository.findById(requestId);
      
      if (!request) {
        throw new Error('Leave request not found');
      }

      if (request.status !== LeaveStatus.PENDING) {
        throw new Error('Only pending requests can be rejected');
      }

      const updatedRequest = await this.leaveRepository.update(requestId, {
        status: LeaveStatus.REJECTED,
        rejectedBy: rejectorId,
        rejectedAt: new Date(),
        rejectionReason: reason
      });

      logger.info('Leave request rejected', { 
        requestId,
        rejectorId 
      });

      return updatedRequest;
    } catch (error) {
      logger.error('Reject leave request failed', error as Error);
      throw error;
    }
  }

  /**
   * Cancel leave request
   */
  async cancelLeaveRequest(requestId: string, reason?: string): Promise<LeaveRequest> {
    try {
      const request = await this.leaveRepository.findById(requestId);
      
      if (!request) {
        throw new Error('Leave request not found');
      }

      if (request.status === LeaveStatus.CANCELLED) {
        throw new Error('Request is already cancelled');
      }

      const updatedRequest = await this.leaveRepository.update(requestId, {
        status: LeaveStatus.CANCELLED,
        cancellationReason: reason
      });

      // If request was approved, restore leave balance
      if (request.status === LeaveStatus.APPROVED) {
        await this.updateLeaveBalance(request.employeeId, request.leaveTypeId, Number(request.totalDays));
      }

      logger.info('Leave request cancelled', { requestId });

      return updatedRequest;
    } catch (error) {
      logger.error('Cancel leave request failed', error as Error);
      throw error;
    }
  }

  /**
   * Get leave types
   */
  async getLeaveTypes(): Promise<LeaveType[]> {
    try {
      return await this.leaveRepository.findAllLeaveTypes();
    } catch (error) {
      logger.error('Get leave types failed', error as Error);
      throw error;
    }
  }

  /**
   * Create leave type
   */
  async createLeaveType(data: any): Promise<LeaveType> {
    try {
      return await this.leaveRepository.createLeaveType(data);
    } catch (error) {
      logger.error('Create leave type failed', error as Error);
      throw error;
    }
  }

  /**
   * Get employee leave balance
   */
  async getEmployeeLeaveBalance(employeeId: string, year: number): Promise<LeaveBalance[]> {
    try {
      return await this.leaveRepository.findLeaveBalance(employeeId, year);
    } catch (error) {
      logger.error('Get leave balance failed', error as Error);
      throw error;
    }
  }

  /**
   * Update leave balance
   */
  async updateLeaveBalance(employeeId: string, leaveTypeId: string, days: number): Promise<void> {
    try {
      await this.leaveRepository.updateLeaveBalance(employeeId, leaveTypeId, days);
    } catch (error) {
      logger.error('Update leave balance failed', error as Error);
      throw error;
    }
  }

  /**
   * Get leave calendar
   */
  async getLeaveCalendar(params: {
    startDate: Date;
    endDate: Date;
    departmentId?: string;
  }): Promise<any[]> {
    try {
      const leaveRequests = await this.leaveRepository.findApprovedLeaves(
        params.startDate,
        params.endDate,
        params.departmentId
      );

      // Transform to calendar format
      return leaveRequests.map(request => ({
        id: request.id,
        employeeId: request.employeeId,
        title: `Leave - ${request.reason}`,
        start: request.startDate,
        end: request.endDate,
        type: 'leave',
        status: request.status
      }));
    } catch (error) {
      logger.error('Get leave calendar failed', error as Error);
      throw error;
    }
  }

  /**
   * Helper method to calculate leave days
   */
  private calculateLeaveDays(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff + 1; // Include both start and end dates
  }

  /**
   * Get leave statistics
   */
  async getLeaveStatistics(employeeId: string, year: number): Promise<{
    totalRequests: number;
    approvedRequests: number;
    pendingRequests: number;
    rejectedRequests: number;
    totalDaysTaken: number;
    remainingDays: number;
  }> {
    try {
      const requests = await this.leaveRepository.findByEmployeeAndYear(employeeId, year);
      const balance = await this.getEmployeeLeaveBalance(employeeId, year);

      const stats = {
        totalRequests: requests.length,
        approvedRequests: requests.filter(r => r.status === LeaveStatus.APPROVED).length,
        pendingRequests: requests.filter(r => r.status === LeaveStatus.PENDING).length,
        rejectedRequests: requests.filter(r => r.status === LeaveStatus.REJECTED).length,
        totalDaysTaken: requests
          .filter(r => r.status === LeaveStatus.APPROVED)
          .reduce((sum, r) => sum + Number(r.totalDays), 0),
        remainingDays: balance.reduce((sum, b) => sum + Number(b.remaining), 0)
      };

      return stats;
    } catch (error) {
      logger.error('Get leave statistics failed', error as Error);
      throw error;
    }
  }
}
