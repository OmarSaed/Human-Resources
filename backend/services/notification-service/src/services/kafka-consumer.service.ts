import { KafkaConsumer, TOPICS, SYSTEM_EVENT_TYPES, createLogger, DomainEvent } from '@hrms/shared';
import type { EventHandler, EventMetadata } from '../../../shared/dist/kafka/consumer';
import { NotificationService } from './notification.service';
import { NotificationData } from '../models/notification.models';
import { getServiceConfig } from '@hrms/shared';

const logger = createLogger('kafka-consumer');
const config = getServiceConfig('notification-service');

export class KafkaConsumerService {
  private consumer: KafkaConsumer;

  constructor(private notificationService: NotificationService) {
    this.consumer = new KafkaConsumer(
      config.kafka.clientId,
      config.kafka.groupId,
      config.kafka.brokers
    );
  }

  async initialize(): Promise<void> {
    try {
      // Register event handlers
      this.registerEventHandlers();

      // Subscribe to relevant topics
      await this.consumer.subscribe([
        TOPICS.EMPLOYEE_EVENTS,
        TOPICS.RECRUITMENT_EVENTS,
        TOPICS.PERFORMANCE_EVENTS,
        TOPICS.LEARNING_EVENTS,
        TOPICS.NOTIFICATION_EVENTS,
        'system-events',
        'attendance-events',
      ]);

      // Start consuming
      await this.consumer.startConsuming();

      logger.info('Kafka consumer service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka consumer service', error as Error);
      throw error;
    }
  }

  private registerEventHandlers(): void {
    // Employee Events
    this.consumer.registerEventHandler('employee.created', this.handleEmployeeCreated);
    this.consumer.registerEventHandler('employee.updated', this.handleEmployeeUpdated);
    this.consumer.registerEventHandler('employee.terminated', this.handleEmployeeTerminated);

    // Recruitment Events
    this.consumer.registerEventHandler('recruitment.application.received', this.handleApplicationReceived);
    this.consumer.registerEventHandler('recruitment.interview.scheduled', this.handleInterviewScheduled);
    this.consumer.registerEventHandler('recruitment.status.updated', this.handleRecruitmentStatusUpdated);

    // Performance Events
    this.consumer.registerEventHandler('performance.review.due', this.handlePerformanceReviewDue);
    this.consumer.registerEventHandler('performance.review.completed', this.handlePerformanceReviewCompleted);
    this.consumer.registerEventHandler('performance.goal.assigned', this.handleGoalAssigned);

    // Learning Events
    this.consumer.registerEventHandler('learning.course.assigned', this.handleCourseAssigned);
    this.consumer.registerEventHandler('learning.course.completed', this.handleCourseCompleted);
    this.consumer.registerEventHandler('learning.certification.earned', this.handleCertificationEarned);

    // Attendance Events
    this.consumer.registerEventHandler('attendance.late.checkin', this.handleLateCheckin);
    this.consumer.registerEventHandler('attendance.missing.checkout', this.handleMissingCheckout);
    this.consumer.registerEventHandler('attendance.leave.approved', this.handleLeaveApproved);
    this.consumer.registerEventHandler('attendance.leave.rejected', this.handleLeaveRejected);

    // System Events
    this.consumer.registerEventHandler(SYSTEM_EVENT_TYPES.USER_AUTHENTICATED, this.handleUserAuthenticated);
    this.consumer.registerEventHandler('system.maintenance', this.handleSystemMaintenance);

    // Direct notification events
    this.consumer.registerEventHandler(SYSTEM_EVENT_TYPES.NOTIFICATION_REQUESTED, this.handleNotificationRequested);
  }

  // Employee Event Handlers
  private handleEmployeeCreated: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, email, firstName, lastName, managerId } = event.data;

    await this.notificationService.sendNotification({
      type: 'EMPLOYEE_WELCOME',
      channel: 'EMAIL',
      userId: employeeId,
      email,
      subject: `Welcome to the company, ${firstName}!`,
      message: `Hi ${firstName} ${lastName}, welcome to our HRMS! Your employee ID is ${employeeId}. Please check your onboarding tasks.`,
      data: { employeeId, firstName, lastName },
      source: 'employee-service',
      correlationId: event.correlationId,
    });

    // Notify manager if exists
    if (managerId) {
      await this.notificationService.sendNotification({
        type: 'EMPLOYEE_UPDATED',
        channel: 'EMAIL',
        userId: managerId,
        subject: 'New Team Member',
        message: `${firstName} ${lastName} has joined your team. Please ensure they complete their onboarding process.`,
        data: { employeeId, firstName, lastName, managerId },
        source: 'employee-service',
        correlationId: event.correlationId,
      });
    }
  };

  private handleEmployeeUpdated: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, email, changes } = event.data;

    if (changes.includes('personal_info') || changes.includes('contact_info')) {
      await this.notificationService.sendNotification({
        type: 'EMPLOYEE_UPDATED',
        channel: 'IN_APP',
        userId: employeeId,
        email,
        subject: 'Profile Updated',
        message: 'Your profile information has been updated. Please review the changes.',
        data: { employeeId, changes },
        source: 'employee-service',
        correlationId: event.correlationId,
      });
    }
  };

  private handleEmployeeTerminated: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, email, firstName, lastName, terminationDate, managerId } = event.data;

    // Notify HR
    await this.notificationService.sendNotification({
      type: 'EMPLOYEE_TERMINATED',
      channel: 'EMAIL',
      email: 'hr@company.com', // This should come from configuration
      subject: 'Employee Termination',
      message: `${firstName} ${lastName} (ID: ${employeeId}) has been terminated effective ${terminationDate}. Please complete offboarding procedures.`,
      data: { employeeId, firstName, lastName, terminationDate },
      source: 'employee-service',
      correlationId: event.correlationId,
    });

    // Notify manager
    if (managerId) {
      await this.notificationService.sendNotification({
        type: 'EMPLOYEE_TERMINATED',
        channel: 'EMAIL',
        userId: managerId,
        subject: 'Team Member Departure',
        message: `${firstName} ${lastName} has left the team effective ${terminationDate}.`,
        data: { employeeId, firstName, lastName, terminationDate },
        source: 'employee-service',
        correlationId: event.correlationId,
      });
    }
  };

  // Recruitment Event Handlers
  private handleApplicationReceived: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { candidateId, candidateName, candidateEmail, positionTitle, recruiterId } = event.data;

    if (recruiterId) {
      await this.notificationService.sendNotification({
        type: 'RECRUITMENT_APPLICATION_RECEIVED',
        channel: 'EMAIL',
        userId: recruiterId,
        subject: 'New Job Application',
        message: `${candidateName} has applied for the ${positionTitle} position. Please review their application.`,
        data: { candidateId, candidateName, positionTitle },
        source: 'recruitment-service',
        correlationId: event.correlationId,
      });
    }
  };

  private handleInterviewScheduled: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { candidateId, candidateName, candidateEmail, positionTitle, interviewDate, interviewType } = event.data;

    await this.notificationService.sendNotification({
      type: 'RECRUITMENT_INTERVIEW_SCHEDULED',
      channel: 'EMAIL',
      email: candidateEmail,
      subject: `Interview Scheduled - ${positionTitle}`,
      message: `Hi ${candidateName}, your ${interviewType} interview for the ${positionTitle} position has been scheduled for ${interviewDate}. We look forward to meeting you!`,
      data: { candidateId, positionTitle, interviewDate, interviewType },
      source: 'recruitment-service',
      correlationId: event.correlationId,
    });
  };

  private handleRecruitmentStatusUpdated: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { candidateId, candidateName, candidateEmail, status, positionTitle, feedback } = event.data;

    await this.notificationService.sendNotification({
      type: 'RECRUITMENT_STATUS_UPDATED',
      channel: 'EMAIL',
      email: candidateEmail,
      subject: `Application Update - ${positionTitle}`,
      message: `Hi ${candidateName}, your application status for the ${positionTitle} position has been updated to: ${status}. ${feedback || ''}`,
      data: { candidateId, status, positionTitle, feedback },
      source: 'recruitment-service',
      correlationId: event.correlationId,
    });
  };

  // Performance Event Handlers
  private handlePerformanceReviewDue: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, employeeEmail, reviewId, dueDate, reviewerName } = event.data;

    await this.notificationService.sendNotification({
      type: 'PERFORMANCE_REVIEW_DUE',
      channel: 'EMAIL',
      userId: employeeId,
      email: employeeEmail,
      subject: 'Performance Review Due',
      message: `Your performance review with ${reviewerName} is due by ${dueDate}. Please complete your self-assessment.`,
      data: { reviewId, dueDate, reviewerName },
      source: 'performance-service',
      correlationId: event.correlationId,
    });
  };

  private handlePerformanceReviewCompleted: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, employeeEmail, reviewId, rating, reviewerName } = event.data;

    await this.notificationService.sendNotification({
      type: 'PERFORMANCE_REVIEW_COMPLETED',
      channel: 'EMAIL',
      userId: employeeId,
      email: employeeEmail,
      subject: 'Performance Review Completed',
      message: `Your performance review has been completed by ${reviewerName}. Overall rating: ${rating}. Please review the feedback and development plan.`,
      data: { reviewId, rating, reviewerName },
      source: 'performance-service',
      correlationId: event.correlationId,
    });
  };

  private handleGoalAssigned: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, employeeEmail, goalId, goalTitle, dueDate, assignedBy } = event.data;

    await this.notificationService.sendNotification({
      type: 'PERFORMANCE_GOAL_ASSIGNED',
      channel: 'EMAIL',
      userId: employeeId,
      email: employeeEmail,
      subject: 'New Goal Assigned',
      message: `A new goal "${goalTitle}" has been assigned to you by ${assignedBy}. Due date: ${dueDate}.`,
      data: { goalId, goalTitle, dueDate, assignedBy },
      source: 'performance-service',
      correlationId: event.correlationId,
    });
  };

  // Learning Event Handlers
  private handleCourseAssigned: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, employeeEmail, courseId, courseTitle, dueDate, assignedBy } = event.data;

    await this.notificationService.sendNotification({
      type: 'LEARNING_COURSE_ASSIGNED',
      channel: 'EMAIL',
      userId: employeeId,
      email: employeeEmail,
      subject: 'New Learning Course Assigned',
      message: `You have been enrolled in the course "${courseTitle}" by ${assignedBy}. Please complete it by ${dueDate}.`,
      data: { courseId, courseTitle, dueDate, assignedBy },
      source: 'learning-service',
      correlationId: event.correlationId,
    });
  };

  private handleCourseCompleted: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, employeeEmail, courseId, courseTitle, completionDate, score } = event.data;

    await this.notificationService.sendNotification({
      type: 'LEARNING_COURSE_COMPLETED',
      channel: 'EMAIL',
      userId: employeeId,
      email: employeeEmail,
      subject: 'Course Completed',
      message: `Congratulations! You have successfully completed "${courseTitle}" on ${completionDate}. Score: ${score}%.`,
      data: { courseId, courseTitle, completionDate, score },
      source: 'learning-service',
      correlationId: event.correlationId,
    });
  };

  private handleCertificationEarned: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, employeeEmail, certificationId, certificationName, earnedDate } = event.data;

    await this.notificationService.sendNotification({
      type: 'LEARNING_CERTIFICATION_EARNED',
      channel: 'EMAIL',
      userId: employeeId,
      email: employeeEmail,
      subject: 'Certification Earned!',
      message: `Congratulations! You have earned the "${certificationName}" certification on ${earnedDate}. This has been added to your profile.`,
      data: { certificationId, certificationName, earnedDate },
      source: 'learning-service',
      correlationId: event.correlationId,
    });
  };

  // Attendance Event Handlers
  private handleLateCheckin: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, employeeEmail, checkinTime, scheduledTime, managerId } = event.data;

    await this.notificationService.sendNotification({
      type: 'ATTENDANCE_LATE_CHECKIN',
      channel: 'IN_APP',
      userId: employeeId,
      email: employeeEmail,
      subject: 'Late Check-in Recorded',
      message: `Your check-in at ${checkinTime} was recorded as late. Scheduled time was ${scheduledTime}.`,
      data: { checkinTime, scheduledTime },
      source: 'attendance-service',
      correlationId: event.correlationId,
    });

    // Notify manager for repeated late check-ins
    if (managerId && event.data.isRepeated) {
      await this.notificationService.sendNotification({
        type: 'ATTENDANCE_LATE_CHECKIN',
        channel: 'IN_APP',
        userId: managerId,
        subject: 'Employee Late Check-in Pattern',
        message: `Employee has had multiple late check-ins this week. Please follow up.`,
        data: { employeeId, checkinTime, scheduledTime },
        source: 'attendance-service',
        correlationId: event.correlationId,
      });
    }
  };

  private handleMissingCheckout: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, employeeEmail, date, managerId } = event.data;

    await this.notificationService.sendNotification({
      type: 'ATTENDANCE_MISSING_CHECKOUT',
      channel: 'EMAIL',
      userId: employeeId,
      email: employeeEmail,
      subject: 'Missing Check-out',
      message: `You forgot to check out yesterday (${date}). Please update your timesheet or contact your manager.`,
      data: { date },
      source: 'attendance-service',
      correlationId: event.correlationId,
    });
  };

  private handleLeaveApproved: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, employeeEmail, leaveId, leaveType, startDate, endDate, approvedBy } = event.data;

    await this.notificationService.sendNotification({
      type: 'ATTENDANCE_LEAVE_APPROVED',
      channel: 'EMAIL',
      userId: employeeId,
      email: employeeEmail,
      subject: 'Leave Request Approved',
      message: `Your ${leaveType} leave request from ${startDate} to ${endDate} has been approved by ${approvedBy}.`,
      data: { leaveId, leaveType, startDate, endDate, approvedBy },
      source: 'attendance-service',
      correlationId: event.correlationId,
    });
  };

  private handleLeaveRejected: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { employeeId, employeeEmail, leaveId, leaveType, startDate, endDate, rejectedBy, reason } = event.data;

    await this.notificationService.sendNotification({
      type: 'ATTENDANCE_LEAVE_REJECTED',
      channel: 'EMAIL',
      userId: employeeId,
      email: employeeEmail,
      subject: 'Leave Request Rejected',
      message: `Your ${leaveType} leave request from ${startDate} to ${endDate} has been rejected by ${rejectedBy}. Reason: ${reason}`,
      data: { leaveId, leaveType, startDate, endDate, rejectedBy, reason },
      source: 'attendance-service',
      correlationId: event.correlationId,
    });
  };

  // System Event Handlers
  private handleUserAuthenticated: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { userId, email, isFirstLogin, lastLoginAt } = event.data;

    if (isFirstLogin) {
      await this.notificationService.sendNotification({
        type: 'SYSTEM_ALERT',
        channel: 'EMAIL',
        userId,
        email,
        subject: 'Welcome to HRMS',
        message: 'Welcome to our HRMS! Please complete your profile setup and explore the features available to you.',
        data: { isFirstLogin },
        source: 'auth-service',
        correlationId: event.correlationId,
      });
    }
  };

  private handleSystemMaintenance: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const { startTime, endTime, description, affectedServices } = event.data;

    // Broadcast to all users
    await this.notificationService.sendNotification({
      type: 'SYSTEM_MAINTENANCE',
      channel: 'EMAIL',
      email: 'all-users@company.com', // This would be handled differently in production
      subject: 'Scheduled System Maintenance',
      message: `System maintenance is scheduled from ${startTime} to ${endTime}. ${description} Affected services: ${affectedServices.join(', ')}.`,
      data: { startTime, endTime, description, affectedServices },
      source: 'system',
      correlationId: event.correlationId,
    });
  };

  // Direct notification handler
  private handleNotificationRequested: EventHandler<DomainEvent> = async (event: DomainEvent, metadata: EventMetadata) => {
    const notificationRequest = event.data as NotificationData;
    
    await this.notificationService.sendNotification({
      ...notificationRequest,
      correlationId: event.correlationId,
    });
  };

  async cleanup(): Promise<void> {
    try {
      await this.consumer.disconnect();
      logger.info('Kafka consumer service cleaned up');
    } catch (error) {
      logger.error('Error during Kafka consumer cleanup', error as Error);
    }
  }

  isHealthy(): boolean {
    return this.consumer.isHealthy();
  }
}
