/**
 * Event Contracts - Service Event Interface Definitions
 * 
 * This file defines the contracts that individual services must follow
 * when creating their own events. It provides type safety and consistency
 * without tightly coupling services to specific event implementations.
 */

import { BaseEvent } from '../types';

// Service Event Contract Interface
export interface ServiceEventContract<TData = any> extends BaseEvent {
  data: TData;
}

// Employee Service Event Contracts
export namespace EmployeeEvents {
  export interface EmployeeCreated extends ServiceEventContract {
    type: 'employee.created';
    data: {
      employeeId: string;
      email: string;
      firstName: string;
      lastName: string;
      departmentId: string;
      managerId?: string;
      startDate: Date;
    };
  }

  export interface EmployeeUpdated extends ServiceEventContract {
    type: 'employee.updated';
    data: {
      employeeId: string;
      changes: {
        field: string;
        oldValue: any;
        newValue: any;
      }[];
      updatedBy: string;
    };
  }

  export interface EmployeeDeactivated extends ServiceEventContract {
    type: 'employee.deactivated';
    data: {
      employeeId: string;
      reason: string;
      lastWorkingDay: Date;
      deactivatedBy: string;
    };
  }
}

// Recruitment Service Event Contracts
export namespace RecruitmentEvents {
  export interface JobPosted extends ServiceEventContract {
    type: 'recruitment.job.posted';
    data: {
      jobId: string;
      title: string;
      departmentId: string;
      postedBy: string;
      applicationDeadline?: Date;
    };
  }

  export interface ApplicationSubmitted extends ServiceEventContract {
    type: 'recruitment.application.submitted';
    data: {
      applicationId: string;
      candidateId: string;
      jobId: string;
      submittedAt: Date;
      source: string; // 'website' | 'referral' | 'linkedin' etc.
    };
  }

  export interface CandidateStatusChanged extends ServiceEventContract {
    type: 'recruitment.candidate.status_changed';
    data: {
      candidateId: string;
      applicationId: string;
      previousStatus: string;
      newStatus: string;
      changedBy: string;
      reason?: string;
    };
  }
}

// Performance Service Event Contracts
export namespace PerformanceEvents {
  export interface ReviewStarted extends ServiceEventContract {
    type: 'performance.review.started';
    data: {
      reviewId: string;
      employeeId: string;
      reviewerId: string;
      reviewPeriod: {
        startDate: Date;
        endDate: Date;
      };
      dueDate: Date;
    };
  }

  export interface ReviewCompleted extends ServiceEventContract {
    type: 'performance.review.completed';
    data: {
      reviewId: string;
      employeeId: string;
      reviewerId: string;
      overallRating: number;
      completedAt: Date;
      nextReviewDate?: Date;
    };
  }

  export interface GoalCreated extends ServiceEventContract {
    type: 'performance.goal.created';
    data: {
      goalId: string;
      employeeId: string;
      title: string;
      targetDate: Date;
      priority: 'low' | 'medium' | 'high' | 'critical';
      createdBy: string;
    };
  }
}

// Learning Service Event Contracts
export namespace LearningEvents {
  export interface CourseEnrollment extends ServiceEventContract {
    type: 'learning.course.enrolled';
    data: {
      enrollmentId: string;
      employeeId: string;
      courseId: string;
      enrolledBy?: string; // if enrolled by manager
      enrollmentDate: Date;
      expectedCompletionDate?: Date;
    };
  }

  export interface CourseCompleted extends ServiceEventContract {
    type: 'learning.course.completed';
    data: {
      enrollmentId: string;
      employeeId: string;
      courseId: string;
      completionDate: Date;
      score?: number;
      certificateIssued: boolean;
    };
  }

  export interface SkillAssessed extends ServiceEventContract {
    type: 'learning.skill.assessed';
    data: {
      assessmentId: string;
      employeeId: string;
      skillId: string;
      previousLevel?: number;
      newLevel: number;
      assessedBy: string;
      assessmentDate: Date;
    };
  }
}

// Attendance Service Event Contracts
export namespace AttendanceEvents {
  export interface CheckedIn extends ServiceEventContract {
    type: 'attendance.checked_in';
    data: {
      attendanceId: string;
      employeeId: string;
      checkInTime: Date;
      location?: string;
      method: 'manual' | 'biometric' | 'mobile' | 'web';
    };
  }

  export interface CheckedOut extends ServiceEventContract {
    type: 'attendance.checked_out';
    data: {
      attendanceId: string;
      employeeId: string;
      checkOutTime: Date;
      totalHours: number;
      location?: string;
      method: 'manual' | 'biometric' | 'mobile' | 'web';
    };
  }

  export interface LeaveRequested extends ServiceEventContract {
    type: 'attendance.leave.requested';
    data: {
      leaveRequestId: string;
      employeeId: string;
      leaveType: string;
      startDate: Date;
      endDate: Date;
      reason?: string;
      requestedAt: Date;
    };
  }
}

// Union types for each service's events
export type EmployeeServiceEvents = 
  | EmployeeEvents.EmployeeCreated
  | EmployeeEvents.EmployeeUpdated
  | EmployeeEvents.EmployeeDeactivated;

export type RecruitmentServiceEvents = 
  | RecruitmentEvents.JobPosted
  | RecruitmentEvents.ApplicationSubmitted
  | RecruitmentEvents.CandidateStatusChanged;

export type PerformanceServiceEvents = 
  | PerformanceEvents.ReviewStarted
  | PerformanceEvents.ReviewCompleted
  | PerformanceEvents.GoalCreated;

export type LearningServiceEvents = 
  | LearningEvents.CourseEnrollment
  | LearningEvents.CourseCompleted
  | LearningEvents.SkillAssessed;

export type AttendanceServiceEvents = 
  | AttendanceEvents.CheckedIn
  | AttendanceEvents.CheckedOut
  | AttendanceEvents.LeaveRequested;

// All service events combined
export type AllServiceEvents = 
  | EmployeeServiceEvents
  | RecruitmentServiceEvents
  | PerformanceServiceEvents
  | LearningServiceEvents
  | AttendanceServiceEvents;
