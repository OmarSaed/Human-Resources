/**
 * Core notification interfaces and models for notification service
 */

export interface NotificationData {
  templateId?: string;
  type: 'EMPLOYEE_WELCOME' | 'EMPLOYEE_UPDATED' | 'EMPLOYEE_TERMINATED' | 'RECRUITMENT_APPLICATION_RECEIVED' | 'RECRUITMENT_INTERVIEW_SCHEDULED' | 'RECRUITMENT_STATUS_UPDATED' | 'PERFORMANCE_REVIEW_DUE' | 'PERFORMANCE_REVIEW_COMPLETED' | 'PERFORMANCE_GOAL_ASSIGNED' | 'LEARNING_COURSE_ASSIGNED' | 'LEARNING_COURSE_COMPLETED' | 'LEARNING_CERTIFICATION_EARNED' | 'ATTENDANCE_LATE_CHECKIN' | 'ATTENDANCE_MISSING_CHECKOUT' | 'ATTENDANCE_LEAVE_APPROVED' | 'ATTENDANCE_LEAVE_REJECTED' | 'SYSTEM_ALERT' | 'SYSTEM_MAINTENANCE' | 'CUSTOM';
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  userId?: string;
  email?: string;
  phoneNumber?: string;
  deviceToken?: string;
  subject?: string;
  message: string;
  data?: any;
  correlationId?: string;
  source: string;
}

export interface ListUserNotificationsOptions {
  type?: string;
  channel?: string;
  status?: string;
  unreadOnly: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface NotificationStatistics {
  totalNotifications: number;
  unreadNotifications: number;
  notificationsByType: Record<string, number>;
  notificationsByChannel: Record<string, number>;
  notificationsByStatus: Record<string, number>;
  recentActivity: any[];
}

export interface DeliveryAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  failureRate: number;
  byChannel: Record<string, {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  byType: Record<string, {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  trends: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
  dailyMetrics: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
}
