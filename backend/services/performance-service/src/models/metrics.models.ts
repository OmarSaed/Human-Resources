/**
 * Performance metrics and analytics related interfaces
 */

export interface PerformanceMetricData {
  name: string;
  description?: string;
  type: 'QUANTITY' | 'QUALITY' | 'EFFICIENCY' | 'CUSTOMER_SATISFACTION' | 'REVENUE' | 'COST' | 'TIME' | 'CUSTOM';
  unit: string;
  targetValue?: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  category?: string;
  isActive?: boolean;
  formula?: string;
  dataSource?: string;
}

export interface MetricValueData {
  metricId: string;
  employeeId: string;
  value: number;
  period: Date;
  notes?: string;
  verified?: boolean;
  source?: string;
}

export interface ListMetricsOptions {
  type?: string;
  category?: string;
  frequency?: string;
  isActive?: boolean;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface GetMetricValuesOptions {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  verified?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface GetEmployeeMetricsOptions {
  metricIds?: string[];
  startDate?: Date;
  endDate?: Date;
  includeTargets?: boolean;
  includeComparisons?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface MetricAnalyticsOptions {
  employeeIds?: string[];
  departmentIds?: string[];
  startDate?: Date;
  endDate?: Date;
  aggregation?: 'AVERAGE' | 'SUM' | 'MIN' | 'MAX';
}

export interface MetricTrendsOptions {
  employeeIds?: string[];
  period?: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
  startDate?: Date;
  endDate?: Date;
}

export interface CompareEmployeeMetricsOptions {
  employeeIds: string[];
  startDate?: Date;
  endDate?: Date;
  requestingUserId: string;
}

export interface MetricTargetData {
  metricId: string;
  employeeId: string;
  targetValue: number;
  period: Date;
  notes?: string;
  setBy: string;
  approvedBy?: string;
  isStretch?: boolean;
}

export interface GenerateReportOptions {
  employeeIds?: string[];
  metricIds?: string[];
  startDate: Date;
  endDate: Date;
  format: 'PDF' | 'EXCEL' | 'CSV';
  includeCharts?: boolean;
  includeComparisons?: boolean;
  requestingUserId: string;
}

export interface MetricAnalytics {
  totalMetrics: number;
  activeMetrics: number;
  metricsByType: Record<string, number>;
  metricsByCategory: Record<string, number>;
  averagePerformance: number;
  performanceTrends: Array<{
    period: string;
    averageValue: number;
    targetValue?: number;
    achievementRate: number;
  }>;
  topPerformers: Array<{
    employeeId: string;
    employeeName: string;
    averageScore: number;
    achievementRate: number;
  }>;
  improvementOpportunities: Array<{
    metricId: string;
    metricName: string;
    averageGap: number;
    employeesAffected: number;
  }>;
}
