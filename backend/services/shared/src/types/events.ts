// Event types - shared across all services

import { BaseEntity, UserRole } from './common';

// Base Event Interface (shared across all services)
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  version: string;
  source: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

// Domain Event interface for Kafka
export interface DomainEvent extends BaseEvent {
  data: Record<string, any>;
}

// System Events (cross-service events)
export interface UserAuthenticatedEvent extends BaseEvent {
  type: 'user.authenticated';
  data: {
    userId: string;
    email: string;
    role: UserRole;
    loginTime: Date;
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface UserLoggedOutEvent extends BaseEvent {
  type: 'user.logged_out';
  data: {
    userId: string;
    sessionId: string;
    logoutTime: Date;
    reason?: 'manual' | 'timeout' | 'forced';
  };
}

export interface NotificationRequestEvent extends BaseEvent {
  type: 'notification.requested';
  data: {
    recipient: string;
    type: 'email' | 'sms' | 'push' | 'in_app';
    template: string;
    data: Record<string, any>;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    scheduledAt?: Date;
    expiresAt?: Date;
  };
}

export interface AuditLogEvent extends BaseEvent {
  type: 'audit.log.created';
  data: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    outcome: 'success' | 'failure';
    details?: Record<string, any>;
  };
}

// Employee Events
export interface EmployeeCreatedEvent extends BaseEvent {
  type: 'employee.created';
  data: {
    employeeId: string;
    email: string;
    firstName: string;
    lastName: string;
    departmentId: string;
    positionId: string;
    managerId?: string;
    hireDate: Date;
    employmentType: string;
    status: string;
  };
}

export interface EmployeeUpdatedEvent extends BaseEvent {
  type: 'employee.updated';
  data: {
    employeeId: string;
    changes: Record<string, any>;
    updatedBy: string;
    previousValues?: Record<string, any>;
  };
}

export interface EmployeeTerminatedEvent extends BaseEvent {
  type: 'employee.terminated';
  data: {
    employeeId: string;
    terminationDate: Date;
    reason?: string;
    terminatedBy: string;
    exitInterviewCompleted?: boolean;
  };
}

// Performance Events
export interface PerformanceReviewCreatedEvent extends BaseEvent {
  type: 'performance.review.created';
  data: {
    reviewId: string;
    employeeId: string;
    reviewerId: string;
    reviewType: string;
    reviewPeriod: string;
    dueDate: Date;
  };
}

export interface PerformanceReviewCompletedEvent extends BaseEvent {
  type: 'performance.review.completed';
  data: {
    reviewId: string;
    employeeId: string;
    reviewerId: string;
    overallRating?: number;
    completedAt: Date;
    nextReviewDate?: Date;
  };
}

export interface GoalCreatedEvent extends BaseEvent {
  type: 'performance.goal.created';
  data: {
    goalId: string;
    employeeId: string;
    title: string;
    category: string;
    priority: string;
    targetDate: Date;
    assignedBy?: string;
  };
}

export interface GoalCompletedEvent extends BaseEvent {
  type: 'performance.goal.completed';
  data: {
    goalId: string;
    employeeId: string;
    achievedDate: Date;
    finalProgress: number;
    actualOutcome?: string;
  };
}

// Learning Events
export interface CourseEnrollmentEvent extends BaseEvent {
  type: 'learning.course.enrolled';
  data: {
    enrollmentId: string;
    courseId: string;
    userId: string;
    enrollmentType: 'self' | 'assigned' | 'required';
    assignedBy?: string;
    dueDate?: Date;
  };
}

export interface CourseCompletedEvent extends BaseEvent {
  type: 'learning.course.completed';
  data: {
    enrollmentId: string;
    courseId: string;
    userId: string;
    completedAt: Date;
    finalScore?: number;
    certificateIssued: boolean;
    timeSpent: number;
  };
}

export interface CertificateIssuedEvent extends BaseEvent {
  type: 'learning.certificate.issued';
  data: {
    certificateId: string;
    userId: string;
    courseId: string;
    certificateNumber: string;
    issuedAt: Date;
    expiresAt?: Date;
  };
}

export interface SkillAssessedEvent extends BaseEvent {
  type: 'learning.skill.assessed';
  data: {
    userId: string;
    skillId: string;
    level: string;
    proficiency: number;
    assessedBy?: string;
    previousLevel?: string;
    verificationRequired: boolean;
  };
}

// Time & Attendance Events
export interface TimeEntryCreatedEvent extends BaseEvent {
  type: 'time.entry.created';
  data: {
    entryId: string;
    employeeId: string;
    date: Date;
    clockIn?: Date;
    clockOut?: Date;
    workLocation?: string;
    method: 'manual' | 'biometric' | 'mobile' | 'web';
  };
}

export interface LeaveRequestSubmittedEvent extends BaseEvent {
  type: 'time.leave.requested';
  data: {
    requestId: string;
    employeeId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    days: number;
    isEmergency: boolean;
    reason?: string;
  };
}

export interface LeaveRequestApprovedEvent extends BaseEvent {
  type: 'time.leave.approved';
  data: {
    requestId: string;
    employeeId: string;
    approvedBy: string;
    approvedAt: Date;
    startDate: Date;
    endDate: Date;
    days: number;
  };
}

export interface OvertimeRequestedEvent extends BaseEvent {
  type: 'time.overtime.requested';
  data: {
    requestId: string;
    employeeId: string;
    date: Date;
    hours: number;
    reason: string;
    estimatedCost?: number;
  };
}

// Recruitment Events
export interface ApplicationReceivedEvent extends BaseEvent {
  type: 'recruitment.application.received';
  data: {
    applicationId: string;
    candidateId: string;
    jobPostingId: string;
    source: string;
    submittedAt: Date;
  };
}

export interface InterviewScheduledEvent extends BaseEvent {
  type: 'recruitment.interview.scheduled';
  data: {
    interviewId: string;
    applicationId: string;
    candidateId: string;
    interviewerId: string;
    scheduledAt: Date;
    type: string;
    location?: string;
  };
}

export interface OfferExtendedEvent extends BaseEvent {
  type: 'recruitment.offer.extended';
  data: {
    offerId: string;
    candidateId: string;
    jobPostingId: string;
    salary: number;
    currency: string;
    extendedBy: string;
    expiresAt: Date;
  };
}

// System Events Union Type
export type SystemEvent = 
  | UserAuthenticatedEvent 
  | UserLoggedOutEvent 
  | NotificationRequestEvent 
  | AuditLogEvent;

// Domain Events Union Type
export type DomainEventType = 
  | EmployeeCreatedEvent 
  | EmployeeUpdatedEvent 
  | EmployeeTerminatedEvent
  | PerformanceReviewCreatedEvent
  | PerformanceReviewCompletedEvent
  | GoalCreatedEvent
  | GoalCompletedEvent
  | CourseEnrollmentEvent
  | CourseCompletedEvent
  | CertificateIssuedEvent
  | SkillAssessedEvent
  | TimeEntryCreatedEvent
  | LeaveRequestSubmittedEvent
  | LeaveRequestApprovedEvent
  | OvertimeRequestedEvent
  | ApplicationReceivedEvent
  | InterviewScheduledEvent
  | OfferExtendedEvent;

// Event Factory Types
export interface EventFactory {
  createEvent<T extends Record<string, any>>(
    type: string,
    data: T,
    source: string,
    options?: {
      correlationId?: string;
      metadata?: Record<string, any>;
      version?: string;
    }
  ): T;
}

// Event Handler Types
export interface EventHandler<T extends BaseEvent = BaseEvent> {
  handle(event: T, metadata?: EventMetadata): Promise<void>;
}

export interface EventMetadata {
  partition?: number;
  offset?: string;
  timestamp?: Date;
  headers?: Record<string, string>;
}

// Event Contract Interfaces (for service autonomy)
export interface ServiceEventContract<TData = any> extends BaseEvent {
  data: TData;
}

// Topic Definitions
export const TOPICS = {
  SYSTEM_EVENTS: 'hrms.system.events',
  EMPLOYEE_EVENTS: 'hrms.employee.events',
  PERFORMANCE_EVENTS: 'hrms.performance.events',
  LEARNING_EVENTS: 'hrms.learning.events',
  TIME_ATTENDANCE_EVENTS: 'hrms.time-attendance.events',
  RECRUITMENT_EVENTS: 'hrms.recruitment.events',
  NOTIFICATION_EVENTS: 'hrms.notification.events',
  AUDIT_EVENTS: 'hrms.audit.events',
} as const;

// Event Type Constants
export const EVENT_TYPES = {
  // System
  USER_AUTHENTICATED: 'user.authenticated',
  USER_LOGGED_OUT: 'user.logged_out',
  NOTIFICATION_REQUESTED: 'notification.requested',
  AUDIT_LOG_CREATED: 'audit.log.created',
  
  // Employee
  EMPLOYEE_CREATED: 'employee.created',
  EMPLOYEE_UPDATED: 'employee.updated',
  EMPLOYEE_TERMINATED: 'employee.terminated',
  
  // Performance
  PERFORMANCE_REVIEW_CREATED: 'performance.review.created',
  PERFORMANCE_REVIEW_COMPLETED: 'performance.review.completed',
  GOAL_CREATED: 'performance.goal.created',
  GOAL_COMPLETED: 'performance.goal.completed',
  
  // Learning
  COURSE_ENROLLED: 'learning.course.enrolled',
  COURSE_COMPLETED: 'learning.course.completed',
  CERTIFICATE_ISSUED: 'learning.certificate.issued',
  SKILL_ASSESSED: 'learning.skill.assessed',
  
  // Time & Attendance
  TIME_ENTRY_CREATED: 'time.entry.created',
  LEAVE_REQUESTED: 'time.leave.requested',
  LEAVE_APPROVED: 'time.leave.approved',
  OVERTIME_REQUESTED: 'time.overtime.requested',
  
  // Recruitment
  APPLICATION_RECEIVED: 'recruitment.application.received',
  INTERVIEW_SCHEDULED: 'recruitment.interview.scheduled',
  OFFER_EXTENDED: 'recruitment.offer.extended',
} as const;
