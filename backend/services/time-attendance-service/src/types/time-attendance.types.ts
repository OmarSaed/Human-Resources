import { 
  TimeEntry, 
  TimeCorrection,
  AttendanceRecord,
  LeaveRequest,
  LeaveType,
  LeaveBalance,
  WorkSchedule,
  ScheduleRule,
  OvertimeRequest,
  Holiday,
  Shift,
  ShiftAssignment,
  ShiftSwapRequest,
  TimeReport,
  AttendancePolicy,
  TimeEntryStatus,
  CorrectionStatus,
  AttendanceStatus,
  LeaveStatus,
  OvertimeStatus,
  HolidayType,
  ShiftStatus,
  SwapStatus,
  ReportType,
  ReportStatus
} from '@prisma/client';

// Re-export Prisma types
export {
  TimeEntry,
  TimeCorrection,
  AttendanceRecord,
  LeaveRequest,
  LeaveType,
  LeaveBalance,
  WorkSchedule,
  ScheduleRule,
  OvertimeRequest,
  Holiday,
  Shift,
  ShiftAssignment,
  ShiftSwapRequest,
  TimeReport,
  AttendancePolicy,
  TimeEntryStatus,
  CorrectionStatus,
  AttendanceStatus,
  LeaveStatus,
  OvertimeStatus,
  HolidayType,
  ShiftStatus,
  SwapStatus,
  ReportType,
  ReportStatus
};

// Time Entry Types

export interface TimeEntryCreateRequest {
  employeeId: string;
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
  corrections?: TimeCorrectionResponse[];
  calculatedHours?: CalculatedHours;
  violations?: TimeViolation[];
}

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

// Time Correction Types

export interface TimeCorrectionCreateRequest {
  timeEntryId: string;
  employeeId: string;
  requestedBy: string;
  newClockIn?: string;
  newClockOut?: string;
  reason: string;
  justification?: string;
}

export interface TimeCorrectionUpdateRequest {
  status?: CorrectionStatus;
  rejectionReason?: string;
}

export interface TimeCorrectionResponse extends TimeCorrection {
  timeEntry?: TimeEntryResponse;
  requestedByEmployee?: EmployeeInfo;
  approvedByEmployee?: EmployeeInfo;
}

// Attendance Types

export interface AttendanceRecordCreateRequest {
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  clockIn?: string;
  clockOut?: string;
  scheduledIn?: string;
  scheduledOut?: string;
  workLocation?: string;
  notes?: string;
  leaveRequestId?: string;
}

export interface AttendanceRecordUpdateRequest {
  status?: AttendanceStatus;
  clockIn?: string;
  clockOut?: string;
  workLocation?: string;
  notes?: string;
}

export interface AttendanceRecordResponse extends AttendanceRecord {
  employee?: EmployeeInfo;
  leaveRequest?: LeaveRequestResponse;
  summary?: AttendanceSummary;
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

// Leave Management Types

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

export interface LeaveTypeCreateRequest {
  name: string;
  description?: string;
  allowance: number;
  carryForward?: number;
  maxConsecutive?: number;
  minAdvanceNotice?: number;
  requiresApproval?: boolean;
  isPaid?: boolean;
  applicableGender?: string;
  minServiceMonths?: number;
  color?: string;
}

export interface LeaveTypeUpdateRequest {
  name?: string;
  description?: string;
  allowance?: number;
  carryForward?: number;
  maxConsecutive?: number;
  minAdvanceNotice?: number;
  requiresApproval?: boolean;
  isPaid?: boolean;
  isActive?: boolean;
  applicableGender?: string;
  minServiceMonths?: number;
  color?: string;
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

// Schedule Types

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

export interface WorkScheduleUpdateRequest {
  name?: string;
  description?: string;
  timezone?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  weeklyHours?: number;
  scheduleRules?: ScheduleRuleCreateRequest[];
}

export interface WorkScheduleResponse extends WorkSchedule {
  scheduleRules?: ScheduleRuleResponse[];
  employee?: EmployeeInfo;
  isCurrentlyActive?: boolean;
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

export interface ScheduleRuleResponse extends ScheduleRule {
  dailyHours?: number;
  isCurrentDay?: boolean;
}

// Overtime Types

export interface OvertimeRequestCreateRequest {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  description?: string;
}

export interface OvertimeRequestUpdateRequest {
  startTime?: string;
  endTime?: string;
  reason?: string;
  description?: string;
  status?: OvertimeStatus;
  rejectionReason?: string;
  rate?: number;
}

export interface OvertimeRequestResponse extends OvertimeRequest {
  employee?: EmployeeInfo;
  approvedByEmployee?: EmployeeInfo;
  calculatedAmount?: number;
  exceedsPolicy?: boolean;
}

// Holiday Types

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

export interface HolidayUpdateRequest {
  name?: string;
  date?: string;
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

// Shift Types

export interface ShiftCreateRequest {
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  color?: string;
  overtimeRate?: number;
  nightShiftRate?: number;
}

export interface ShiftUpdateRequest {
  name?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  color?: string;
  isActive?: boolean;
  overtimeRate?: number;
  nightShiftRate?: number;
}

export interface ShiftResponse extends Shift {
  assignments?: ShiftAssignmentResponse[];
  activeAssignments?: number;
  isCurrentShift?: boolean;
}

export interface ShiftAssignmentCreateRequest {
  employeeId: string;
  shiftId: string;
  date: string;
  notes?: string;
}

export interface ShiftAssignmentUpdateRequest {
  status?: ShiftStatus;
  notes?: string;
}

export interface ShiftAssignmentResponse extends ShiftAssignment {
  employee?: EmployeeInfo;
  shift?: ShiftResponse;
  assignedByEmployee?: EmployeeInfo;
}

export interface ShiftSwapRequestCreateRequest {
  requesterId: string;
  targetId: string;
  requesterShiftDate: string;
  targetShiftDate: string;
  reason: string;
}

export interface ShiftSwapRequestUpdateRequest {
  status?: SwapStatus;
  requesterApproval?: boolean;
  targetApproval?: boolean;
  managerApproval?: boolean;
  rejectionReason?: string;
}

export interface ShiftSwapRequestResponse extends ShiftSwapRequest {
  requester?: EmployeeInfo;
  target?: EmployeeInfo;
  approvedByEmployee?: EmployeeInfo;
  canApprove?: boolean;
}

// Reporting Types

export interface TimeReportCreateRequest {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  reportType: ReportType;
}

export interface TimeReportResponse extends TimeReport {
  employee?: EmployeeInfo;
  generatedByEmployee?: EmployeeInfo;
  approvedByEmployee?: EmployeeInfo;
  reportSummary?: ReportSummary;
}

export interface ReportSummary {
  totalDays: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  holidayDays: number;
  leaveDays: number;
  attendanceRate: number;
  averageWorkHours: number;
  totalOvertimeHours: number;
  punctualityScore: number;
}

// Policy Types

export interface AttendancePolicyCreateRequest {
  name: string;
  description?: string;
  graceMinutes?: number;
  maxDailyHours?: number;
  minDailyHours?: number;
  overtimeThreshold?: number;
  maxBreakMinutes?: number;
  requiresApproval?: boolean;
  autoClockOut?: boolean;
  gpsTracking?: boolean;
  ipRestriction?: boolean;
  allowedIPs?: string[];
  workLocations?: string[];
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface AttendancePolicyUpdateRequest {
  name?: string;
  description?: string;
  graceMinutes?: number;
  maxDailyHours?: number;
  minDailyHours?: number;
  overtimeThreshold?: number;
  maxBreakMinutes?: number;
  requiresApproval?: boolean;
  autoClockOut?: boolean;
  gpsTracking?: boolean;
  ipRestriction?: boolean;
  allowedIPs?: string[];
  workLocations?: string[];
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface AttendancePolicyResponse extends AttendancePolicy {
  affectedEmployees?: number;
  complianceRate?: number;
}

// Supporting Interfaces

export interface EmployeeInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  department?: string;
  position?: string;
  manager?: string;
  workSchedule?: string;
  timezone?: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: string; // mobile, desktop, biometric, etc.
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

export interface TimeEntrySearchParams {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: TimeEntryStatus;
  workLocation?: string;
  hasViolations?: boolean;
  page?: number;
  limit?: number;
}

export interface AttendanceSearchParams {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus[];
  department?: string;
  isLate?: boolean;
}

export interface LeaveRequestSearchParams {
  employeeId?: string;
  leaveTypeId?: string;
  status?: LeaveStatus;
  startDate?: string;
  endDate?: string;
  isEmergency?: boolean;
  department?: string;
}

export interface OvertimeSearchParams {
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
  attendanceTrend: TrendData[];
  overtimeTrend: TrendData[];
  leaveTrend: TrendData[];
  punctualityTrend: TrendData[];
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercentage: number;
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

// Error Types

export interface TimeAttendanceError {
  code: string;
  message: string;
  field?: string;
}

export interface TimeAttendanceValidationError extends TimeAttendanceError {
  field: string;
  value?: any;
}

// API Response Types

export interface TimeAttendanceApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: TimeAttendanceError;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metadata?: Record<string, any>;
}

// Additional Types for Service Layer

export interface TimeEntryCreateData {
  employeeId: string;
  workLocation?: string;
  gpsLocation?: any;
  deviceInfo?: any;
  ipAddress?: string;
  notes?: string;
}

export interface TimeEntryUpdateData {
  clockIn?: Date;
  clockOut?: Date;
  breakStart?: Date;
  breakEnd?: Date;
  totalHours?: number;
  regularHours?: number;
  overtimeHours?: number;
  breakDuration?: number;
  workLocation?: string;
  notes?: string;
  status?: TimeEntryStatus;
  gpsLocation?: any;
}

export interface TimeEntryFilters {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: TimeEntryStatus;
  workLocation?: string;
  page: number;
  limit: number;
}

export interface TimeEntryCorrectionData {
  requestedBy: string;
  newClockIn?: Date;
  newClockOut?: Date;
  reason: string;
  justification?: string;
}

export interface TimeEntryCorrectionRequest {
  timeEntryId: string;
  requestedBy: string;
  newClockIn?: Date;
  newClockOut?: Date;
  reason: string;
  justification?: string;
}

export interface PaginatedTimeEntries {
  timeEntries: TimeEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}