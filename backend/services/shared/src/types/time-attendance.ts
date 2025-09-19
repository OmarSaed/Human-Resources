// Time & Attendance domain types - shared across services

import { BaseEntity, PaginationParams, EmployeeInfo, Status, DateRangeFilter, NumberRangeFilter } from './common';

// Core Time & Attendance Types
export interface TimeEntry extends BaseEntity {
  employeeId: string;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  breakStart?: Date;
  breakEnd?: Date;
  hoursWorked?: number;
  overtimeHours?: number;
  location?: string;
  notes?: string;
  status: TimeEntryStatus;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface AttendanceRecord extends BaseEntity {
  employeeId: string;
  date: Date;
  status: AttendanceStatus;
  clockIn?: Date;
  clockOut?: Date;
  scheduledIn?: Date;
  scheduledOut?: Date;
  workLocation?: string;
  notes?: string;
  leaveRequestId?: string;
}

export interface LeaveRequest extends BaseEntity {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason?: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedReason?: string;
  isEmergency: boolean;
  attachments?: Record<string, any>;
  notes?: string;
}

export interface LeaveType extends BaseEntity {
  name: string;
  description?: string;
  allowance: number;
  carryForward?: number;
  maxConsecutive?: number;
  minAdvanceNotice?: number;
  requiresApproval: boolean;
  isPaid: boolean;
  isActive: boolean;
  applicableGender?: string;
  minServiceMonths?: number;
  color?: string;
}

export interface LeaveBalance extends BaseEntity {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  available: number;
  carryForward?: number;
}

export interface WorkSchedule extends BaseEntity {
  employeeId: string;
  name: string;
  description?: string;
  timezone?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  weeklyHours?: number;
}

export interface Holiday extends BaseEntity {
  name: string;
  date: Date;
  description?: string;
  type: HolidayType;
  isRecurring: boolean;
  country?: string;
  region?: string;
  isOptional: boolean;
  applicableRoles?: string[];
}

export interface Shift extends BaseEntity {
  name: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  breakDuration?: number;
  color?: string;
  isActive: boolean;
  overtimeRate?: number;
  nightShiftRate?: number;
}

export interface OvertimeRequest extends BaseEntity {
  employeeId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  hours: number;
  reason: string;
  description?: string;
  status: OvertimeStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  rate?: number;
}

// Enums
export enum TimeEntryStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  HALF_DAY = 'HALF_DAY',
  ON_LEAVE = 'ON_LEAVE',
  HOLIDAY = 'HOLIDAY',
  WEEKEND = 'WEEKEND'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum HolidayType {
  NATIONAL = 'NATIONAL',
  REGIONAL = 'REGIONAL',
  COMPANY = 'COMPANY',
  RELIGIOUS = 'RELIGIOUS',
  CULTURAL = 'CULTURAL'
}

export enum OvertimeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum ShiftStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED'
}

export enum SwapStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

// Request/Response Types
export interface TimeEntryCreateRequest {
  employeeId: string;
  date?: string;
  clockIn?: string;
  workLocation?: string;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  gpsLocation?: GpsLocation;
  notes?: string;
}

export interface TimeEntryUpdateRequest {
  clockOut?: string;
  breakStart?: string;
  breakEnd?: string;
  workLocation?: string;
  notes?: string;
  status?: TimeEntryStatus;
}

export interface TimeEntryResponse extends TimeEntry {
  employee?: EmployeeInfo;
  calculatedHours?: CalculatedHours;
  violations?: TimeViolation[];
}

export interface LeaveRequestCreateRequest {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  description?: string;
  emergencyContact?: string;
  attachments?: string[];
  isEmergency?: boolean;
  handoverNotes?: string;
  backupPersonId?: string;
}

export interface LeaveRequestUpdateRequest {
  reason?: string;
  description?: string;
  emergencyContact?: string;
  handoverNotes?: string;
  backupPersonId?: string;
  status?: LeaveStatus;
  rejectionReason?: string;
}

export interface LeaveRequestResponse extends LeaveRequest {
  employee?: EmployeeInfo;
  leaveType?: LeaveTypeResponse;
  approvedByEmployee?: EmployeeInfo;
  backupPerson?: EmployeeInfo;
  canCancel?: boolean;
  remainingBalance?: number;
}

export interface AttendanceRecordResponse extends AttendanceRecord {
  employee?: EmployeeInfo;
  leaveRequest?: LeaveRequestResponse;
  summary?: AttendanceSummary;
}

export interface OvertimeRequestCreateRequest {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  description?: string;
}

export interface OvertimeRequestResponse extends OvertimeRequest {
  employee?: EmployeeInfo;
  approvedByEmployee?: EmployeeInfo;
  calculatedAmount?: number;
  exceedsPolicy?: boolean;
}

export interface WorkScheduleCreateRequest {
  employeeId: string;
  name: string;
  description?: string;
  timezone?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  weeklyHours?: number;
  scheduleRules: ScheduleRuleCreateRequest[];
}

export interface WorkScheduleResponse extends WorkSchedule {
  scheduleRules?: ScheduleRuleResponse[];
  employee?: EmployeeInfo;
  isCurrentlyActive?: boolean;
}

export interface HolidayCreateRequest {
  name: string;
  date: string;
  description?: string;
  type?: HolidayType;
  isRecurring?: boolean;
  country?: string;
  region?: string;
  isOptional?: boolean;
  applicableRoles?: string[];
}

export interface HolidayResponse extends Holiday {
  isApplicable?: boolean;
  daysUntil?: number;
}

// Supporting Interfaces
export interface CalculatedHours {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  breakDuration: number;
  isOvertime: boolean;
  violations: string[];
}

export interface TimeViolation {
  type: 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'LONG_BREAK' | 'MISSING_CLOCK_OUT' | 'OVERTIME_EXCEEDED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  minutes?: number;
}

export interface AttendanceSummary {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  totalWorkingDays: number;
  attendancePercentage: number;
  averageClockIn: string;
  averageClockOut: string;
}

export interface LeaveTypeResponse extends LeaveType {
  usageStats?: LeaveTypeUsage;
}

export interface LeaveTypeUsage {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  averageUsage: number;
  topUsers: string[];
}

export interface LeaveBalanceResponse extends LeaveBalance {
  leaveType?: LeaveTypeResponse;
  projectedUsage?: number;
  expiringDays?: number;
}

export interface ScheduleRuleCreateRequest {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  isWorkingDay?: boolean;
  isFlexible?: boolean;
  coreStartTime?: string;
  coreEndTime?: string;
}

export interface ScheduleRuleResponse {
  id: string;
  dayOfWeek: number;
  startTime: Date;
  endTime: Date;
  breakDuration?: number;
  isWorkingDay: boolean;
  isFlexible: boolean;
  coreStartTime?: Date;
  coreEndTime?: Date;
  dailyHours?: number;
  isCurrentDay?: boolean;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: string;
  platform: string;
  browser?: string;
  version?: string;
  userAgent: string;
}

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  address?: string;
}

// Search and Filter Types
export interface TimeEntrySearchParams extends PaginationParams {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: TimeEntryStatus;
  workLocation?: string;
  hasViolations?: boolean;
}

export interface AttendanceSearchParams extends PaginationParams {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus[];
  department?: string;
  isLate?: boolean;
}

export interface LeaveRequestSearchParams extends PaginationParams {
  employeeId?: string;
  leaveTypeId?: string;
  status?: LeaveStatus;
  startDate?: string;
  endDate?: string;
  isEmergency?: boolean;
  department?: string;
}

export interface OvertimeSearchParams extends PaginationParams {
  employeeId?: string;
  status?: OvertimeStatus;
  startDate?: string;
  endDate?: string;
  department?: string;
  minHours?: number;
  maxHours?: number;
}

// Analytics Types
export interface TimeAttendanceAnalytics {
  attendanceStats: AttendanceStatistics;
  timeTrackingStats: TimeTrackingStatistics;
  leaveStats: LeaveStatistics;
  overtimeStats: OvertimeStatistics;
  trends: TimeAttendanceTrends;
}

export interface AttendanceStatistics {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  overallAttendanceRate: number;
  departmentAttendance: Record<string, number>;
}

export interface TimeTrackingStatistics {
  totalTimeEntries: number;
  averageWorkHours: number;
  totalOvertimeHours: number;
  pendingApprovals: number;
  violations: number;
  clockInRate: number;
}

export interface LeaveStatistics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  averageLeavePerEmployee: number;
  mostUsedLeaveType: string;
}

export interface OvertimeStatistics {
  totalOvertimeRequests: number;
  approvedOvertimeHours: number;
  rejectedOvertimeRequests: number;
  averageOvertimePerEmployee: number;
  topOvertimeUsers: string[];
}

export interface TimeAttendanceTrends {
  attendanceTrend: Array<{ period: string; value: number }>;
  overtimeTrend: Array<{ period: string; value: number }>;
  leaveTrend: Array<{ period: string; value: number }>;
  punctualityTrend: Array<{ period: string; value: number }>;
}

// Dashboard Types
export interface TimeAttendanceDashboard {
  todayStats: DailyStats;
  weekStats: WeeklyStats;
  monthStats: MonthlyStats;
  alerts: Alert[];
  quickActions: QuickAction[];
}

export interface DailyStats {
  clockedIn: number;
  clockedOut: number;
  onBreak: number;
  late: number;
  overtime: number;
  absent: number;
}

export interface WeeklyStats {
  totalHours: number;
  overtime: number;
  averageClockIn: string;
  averageClockOut: string;
  attendanceRate: number;
}

export interface MonthlyStats {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  totalOvertimeHours: number;
  punctualityScore: number;
}

export interface Alert {
  id: string;
  type: 'WARNING' | 'ERROR' | 'INFO';
  title: string;
  message: string;
  action?: string;
  timestamp: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  action: string;
  icon: string;
  enabled: boolean;
}
