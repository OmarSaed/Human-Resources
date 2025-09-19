/**
 * User preference interfaces and models for notification service
 */

export interface NotificationPreferenceData {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  employeeUpdates?: boolean;
  systemAlerts?: boolean;
  recruitmentUpdates?: boolean;
  performanceUpdates?: boolean;
  learningUpdates?: boolean;
  attendanceAlerts?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface ChannelPreferences {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
}

export interface TypePreferences {
  employeeUpdates?: boolean;
  systemAlerts?: boolean;
  recruitmentUpdates?: boolean;
  performanceUpdates?: boolean;
  learningUpdates?: boolean;
  attendanceAlerts?: boolean;
}

export interface QuietHoursPreferences {
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}
