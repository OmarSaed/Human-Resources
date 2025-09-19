import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('performance-metric-service');

export interface PerformanceMetricData {
  employeeId: string;
  metricName: string;
  metricType: 'QUANTITY' | 'QUALITY' | 'EFFICIENCY' | 'REVENUE' | 'COST' | 'SATISFACTION' | 'OTHER';
  value: number;
  target?: number;
  unit?: string;
  period: string;
  recordedAt: Date;
  recordedBy: string;
  notes?: string;
}

export interface MetricValueData {
  metricId: string;
  employeeId: string;
  value: number;
  period: string;
  notes?: string;
  recordedBy: string;
}

export interface ListMetricsOptions {
  type?: string;
  category?: string;
  isActive?: boolean;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface GetMetricValuesOptions {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  period?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface GetEmployeeMetricsOptions {
  category?: string;
  type?: string;
  period?: string;
  includeInactive: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface MetricAnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
  departmentId?: string;
  includeComparisons: boolean;
  requestingUserId: string;
}

export interface MetricTrendsOptions {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  aggregation: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  requestingUserId: string;
}

export interface CompareEmployeeMetricsOptions {
  employeeIds: string[];
  metricIds?: string[];
  period?: string;
  requestingUserId: string;
}

export interface MetricTargetData {
  employeeId?: string;
  departmentId?: string;
  period: string;
  targetValue: number;
  minimumValue?: number;
  maximumValue?: number;
  notes?: string;
}

export interface GenerateReportOptions {
  metricIds?: string[];
  employeeIds?: string[];
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  format: 'json' | 'csv' | 'xlsx';
  requestingUserId: string;
}

export interface MetricAnalytics {
  totalValues: number;
  averageValue: number;
  minimumValue: number;
  maximumValue: number;
  standardDeviation: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  achievementRate: number;
  valueDistribution: Record<string, number>;
  topPerformers: Array<{
    employeeId: string;
    averageValue: number;
    valueCount: number;
  }>;
  periodComparisons?: Array<{
    period: string;
    averageValue: number;
    valueCount: number;
  }>;
}

export class PerformanceMetricService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new performance metric
   */
  async createMetric(data: PerformanceMetricData): Promise<any> {
    try {
      // Check if metric with same name exists
      const existingMetric = await this.prisma.performanceMetric.findFirst({
        where: {
          metricName: {
            equals: data.metricName,
            mode: 'insensitive',
          },
        },
      });

      if (existingMetric) {
        throw new Error('A performance metric with this name already exists');
      }

      const metric = await this.prisma.performanceMetric.create({
        data: {
          employeeId: data.employeeId,
          metricName: data.metricName,
          metricType: data.metricType,
          value: data.value,
          target: data.target,
          unit: data.unit,
          period: data.period,
          recordedAt: data.recordedAt,
          recordedBy: data.recordedBy,
          notes: data.notes,
        },
      });

      logger.info('Performance metric created successfully', {
        metricId: metric.id,
        metricName: metric.metricName,
        metricType: metric.metricType,
        employeeId: metric.employeeId,
      });

      return metric;
    } catch (error) {
      logger.error('Failed to create performance metric', error as Error);
      throw error;
    }
  }

  /**
   * Get performance metric by ID
   */
  async getMetric(metricId: string, requestingUserId: string): Promise<any | null> {
    try {
      const metric = await this.prisma.performanceMetric.findUnique({
        where: { id: metricId },
        include: {
          values: {
            take: 5,
            orderBy: { recordDate: 'desc' },
          },
          targets: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return metric;
    } catch (error) {
      logger.error(`Failed to get performance metric ${metricId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update performance metric
   */
  async updateMetric(
    metricId: string,
    updates: Partial<PerformanceMetricData>,
    requestingUserId: string
  ): Promise<any> {
    try {
      const metric = await this.prisma.performanceMetric.findUnique({
        where: { id: metricId },
      });

      if (!metric) {
        throw new Error('Performance metric not found');
      }


      const updatedMetric = await this.prisma.performanceMetric.update({
        where: { id: metricId },
        data: {
          ...updates,
        },
      });

      logger.info('Performance metric updated successfully', {
        metricId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedMetric;
    } catch (error) {
      logger.error(`Failed to update performance metric ${metricId}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete performance metric
   */
  async deleteMetric(metricId: string, requestingUserId: string): Promise<void> {
    try {
      const metric = await this.prisma.performanceMetric.findUnique({
        where: { id: metricId },
        include: {
          values: true,
          targets: true,
        },
      });

      if (!metric) {
        throw new Error('Performance metric not found');
      }

      // Check if metric has values
      if (metric.values.length > 0) {
        throw new Error('Cannot delete metric with recorded values. Deactivate it instead.');
      }

      // Delete targets first
      await this.prisma.metricTarget.deleteMany({
        where: { metricId },
      });

      await this.prisma.performanceMetric.delete({
        where: { id: metricId },
      });

      logger.info('Performance metric deleted successfully', { metricId, requestingUserId });
    } catch (error) {
      logger.error(`Failed to delete performance metric ${metricId}`, error as Error);
      throw error;
    }
  }

  /**
   * List performance metrics
   */
  async listMetrics(options: ListMetricsOptions): Promise<{
    metrics: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        type,
        category,
        isActive,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (type) where.type = type;
      if (category) where.category = category;
      if (isActive !== undefined) where.isActive = isActive;

      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            tags: {
              has: search,
            },
          },
        ];
      }

      const [metrics, total] = await Promise.all([
        this.prisma.performanceMetric.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                values: true,
                targets: true,
              },
            },
          },
        }),
        this.prisma.performanceMetric.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        metrics,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list performance metrics', error as Error);
      throw error;
    }
  }

  /**
   * Record metric value
   */
  async recordMetricValue(data: MetricValueData): Promise<any> {
    try {
      const metric = await this.prisma.performanceMetric.findUnique({
        where: { id: data.metricId },
      });

      if (!metric) {
        throw new Error('Performance metric not found');
      }
      // Check if value for same employee and period already exists
      const existingValue = await this.prisma.metricValue.findFirst({
        where: {
          metricId: data.metricId,
          employeeId: data.employeeId,
          period: data.period,
        },
      });

      if (existingValue) {
        throw new Error('A value for this employee and period already exists. Update the existing value instead.');
      }

      const metricValue = await this.prisma.metricValue.create({
        data: {
          metricId: data.metricId,
          employeeId: data.employeeId,
          value: data.value,
          period: data.period,
          notes: data.notes,
          recordDate: new Date(),
          recordedBy: data.recordedBy,
        },
        include: {
          metric: {
            select: {
              id: true,
              metricName: true,
              unit: true,
              metricType: true,
            },
          },
        },
      });

      logger.info('Metric value recorded successfully', {
        metricId: data.metricId,
        employeeId: data.employeeId,
        value: data.value,
        period: data.period,
      });

      return metricValue;
    } catch (error) {
      logger.error('Failed to record metric value', error as Error);
      throw error;
    }
  }

  /**
   * Get metric values
   */
  async getMetricValues(
    metricId: string,
    options: GetMetricValuesOptions
  ): Promise<{
    values: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        employeeId,
        startDate,
        endDate,
        period,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = { metricId };

      if (employeeId) where.employeeId = employeeId;
      if (period) where.period = period;

      if (startDate || endDate) {
        where.recordDate = {};
        if (startDate) where.recordDate.gte = startDate;
        if (endDate) where.recordDate.lte = endDate;
      }

      const [values, total] = await Promise.all([
        this.prisma.metricValue.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            metric: {
              select: {
                id: true,
                metricName: true,
                unit: true,
                metricType: true,
              },
            },
          },
        }),
        this.prisma.metricValue.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        values,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error(`Failed to get metric values ${metricId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get employee metrics
   */
  async getEmployeeMetrics(
    employeeId: string,
    options: GetEmployeeMetricsOptions
  ): Promise<{
    metrics: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        category,
        type,
        period,
        includeInactive,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (category) where.category = category;
      if (type) where.type = type;
      if (!includeInactive) where.isActive = true;

      const [metrics, total] = await Promise.all([
        this.prisma.performanceMetric.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            values: {
              where: {
                employeeId,
                ...(period && { period }),
              },
              orderBy: { recordDate: 'desc' },
              take: 1,
            },
            targets: {
              where: {
                OR: [
                  { employeeId },
                  { employeeId: null }, // Global targets
                ],
                ...(period && { period }),
              },
              take: 1,
            },
            _count: {
              select: {
                values: {
                  where: { employeeId },
                },
              },
            },
          },
        }),
        this.prisma.performanceMetric.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        metrics,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error(`Failed to get employee metrics ${employeeId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get metric analytics
   */
  async getMetricAnalytics(metricId: string, options: MetricAnalyticsOptions): Promise<MetricAnalytics> {
    try {
      const { startDate, endDate, departmentId, includeComparisons } = options;

      const where: any = { metricId };

      if (startDate || endDate) {
        where.recordDate = {};
        if (startDate) where.recordDate.gte = startDate;
        if (endDate) where.recordDate.lte = endDate;
      }

      // Add department filter if needed (would require employee relationship)
      if (departmentId) {
        // This would require joining with employee table
        // For now, we'll skip this filter
      }

      const [metric, values] = await Promise.all([
        this.prisma.performanceMetric.findUnique({
          where: { id: metricId },
        }),
        this.prisma.metricValue.findMany({
          where,
          select: {
            value: true,
            employeeId: true,
            period: true,
            recordDate: true,
          },
        }),
      ]);

      if (!metric) {
        throw new Error('Performance metric not found');
      }

      const valueNumbers = values.map(v => Number(v.value));
      const totalValues = values.length;

      if (totalValues === 0) {
        return {
          totalValues: 0,
          averageValue: 0,
          minimumValue: 0,
          maximumValue: 0,
          standardDeviation: 0,
          trend: 'STABLE',
          achievementRate: 0,
          valueDistribution: {},
          topPerformers: [],
        };
      }

      const averageValue = valueNumbers.reduce((sum, val) => sum + val, 0) / totalValues;
      const minimumValue = Math.min(...valueNumbers);
      const maximumValue = Math.max(...valueNumbers);

      // Calculate standard deviation
      const variance = valueNumbers.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / totalValues;
      const standardDeviation = Math.sqrt(variance);

      // Calculate achievement rate (if target is defined)
      let achievementRate = 0;
      if (metric.targetValue) {
        const achievedValues = valueNumbers.filter(val => {
          if (metric.direction === 'HIGHER_IS_BETTER') {
            return val >= Number(metric.targetValue!);
          } else if (metric.direction === 'LOWER_IS_BETTER') {
            return val <= Number(metric.targetValue!);
          } else {
            // TARGET_RANGE
            return val >= Number(metric.minimumValue || 0) && val <= Number(metric.maximumValue || 100);
          }
        });
        achievementRate = (achievedValues.length / totalValues) * 100;
      }

      // Value distribution (simplified)
      const valueDistribution: Record<string, number> = {};
      const ranges = ['0-25', '26-50', '51-75', '76-100'];
      ranges.forEach(range => {
        valueDistribution[range] = 0;
      });

      valueNumbers.forEach(val => {
        const percentage = metric.maximumValue ? (val / Number(metric.maximumValue)) * 100 : val;
        if (percentage <= 25) valueDistribution['0-25']++;
        else if (percentage <= 50) valueDistribution['26-50']++;
        else if (percentage <= 75) valueDistribution['51-75']++;
        else valueDistribution['76-100']++;
      });

      // Top performers
      const employeeValues: Record<string, number[]> = {};
      values.forEach(val => {
        if (!employeeValues[val.employeeId]) {
          employeeValues[val.employeeId] = [];
        }
        employeeValues[val.employeeId].push(Number(val.value));
      });

      const topPerformers = Object.entries(employeeValues)
        .map(([employeeId, vals]) => ({
          employeeId,
          averageValue: vals.reduce((sum, val) => sum + val, 0) / vals.length,
          valueCount: vals.length,
        }))
        .sort((a, b) => b.averageValue - a.averageValue)
        .slice(0, 10);

      // Simple trend calculation (last month vs previous month)
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);

      const lastMonthValues = values.filter(v => v.recordDate >= lastMonth).map(v => v.value);
      const previousMonthValues = values.filter(v => 
        v.recordDate >= previousMonth && v.recordDate < lastMonth
      ).map(v => v.value);

      let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
      if (lastMonthValues.length > 0 && previousMonthValues.length > 0) {
        const lastMonthAvg = lastMonthValues.reduce((sum, val) => sum + Number(val), 0) / lastMonthValues.length;
        const previousMonthAvg = previousMonthValues.reduce((sum, val) => sum + Number(val), 0) / previousMonthValues.length;
        
        const changePercent = ((lastMonthAvg - previousMonthAvg) / previousMonthAvg) * 100;
        
        if (Math.abs(changePercent) > 5) {
          if (metric.direction === 'HIGHER_IS_BETTER') {
            trend = changePercent > 0 ? 'IMPROVING' : 'DECLINING';
          } else {
            trend = changePercent < 0 ? 'IMPROVING' : 'DECLINING';
          }
        }
      }

      const analytics: MetricAnalytics = {
        totalValues,
        averageValue,
        minimumValue,
        maximumValue,
        standardDeviation,
        trend,
        achievementRate,
        valueDistribution,
        topPerformers,
      };

      // Add period comparisons if requested
      if (includeComparisons) {
        const periodComparisons = this.calculatePeriodComparisons(values);
        analytics.periodComparisons = periodComparisons;
      }

      return analytics;
    } catch (error) {
      logger.error(`Failed to get metric analytics ${metricId}`, error as Error);
      throw error;
    }
  }

  /**
   * Bulk record metric values
   */
  async bulkRecordMetricValues(
    metricValues: MetricValueData[],
    recordedBy: string
  ): Promise<{ successful: number; failed: number; results: any[] }> {
    try {
      let successful = 0;
      let failed = 0;
      const results = [];

      for (const metricValueData of metricValues) {
        try {
          const metricValue = await this.recordMetricValue({
            ...metricValueData,
            recordedBy,
          });
          
          results.push({
            success: true,
            metricValueId: metricValue.id,
            data: metricValueData,
          });
          successful++;
        } catch (error) {
          results.push({
            success: false,
            error: (error as Error).message,
            data: metricValueData,
          });
          failed++;
        }
      }

      logger.info('Bulk metric values recorded', {
        total: metricValues.length,
        successful,
        failed,
        recordedBy,
      });

      return { successful, failed, results };
    } catch (error) {
      logger.error('Failed to bulk record metric values', error as Error);
      throw error;
    }
  }

  /**
   * Get metric trends
   */
  async getMetricTrends(metricId: string, options: MetricTrendsOptions): Promise<any> {
    try {
      const { employeeId, startDate, endDate, aggregation } = options;

      const where: any = { metricId };
      if (employeeId) where.employeeId = employeeId;
      if (startDate || endDate) {
        where.recordDate = {};
        if (startDate) where.recordDate.gte = startDate;
        if (endDate) where.recordDate.lte = endDate;
      }

      const values = await this.prisma.metricValue.findMany({
        where,
        orderBy: { recordDate: 'asc' },
        select: {
          value: true,
          recordDate: true,
          period: true,
        },
      });

      // Aggregate values based on aggregation type
      const aggregatedData = this.aggregateValues(values, aggregation);

      return {
        metricId,
        employeeId,
        aggregation,
        trends: aggregatedData,
        totalDataPoints: values.length,
      };
    } catch (error) {
      logger.error(`Failed to get metric trends ${metricId}`, error as Error);
      throw error;
    }
  }

  /**
   * Compare employee metrics
   */
  async compareEmployeeMetrics(options: CompareEmployeeMetricsOptions): Promise<any> {
    try {
      const { employeeIds, metricIds, period } = options;

      const where: any = {
        employeeId: { in: employeeIds },
      };

      if (metricIds && metricIds.length > 0) {
        where.metricId = { in: metricIds };
      }

      if (period) {
        where.period = period;
      }

      const values = await this.prisma.metricValue.findMany({
        where,
        include: {
          metric: {
            select: {
              id: true,
              metricName: true,
              unit: true,
              metricType: true,
            },
          },
        },
        orderBy: { recordDate: 'desc' },
      });

      // Group by employee and metric
      const comparison: Record<string, Record<string, any>> = {};

      employeeIds.forEach(employeeId => {
        comparison[employeeId] = {};
      });

      values.forEach(value => {
        const employeeId = value.employeeId;
        const metricName = value.metric.metricName;

        if (!comparison[employeeId][metricName]) {
          comparison[employeeId][metricName] = {
            values: [],
            average: 0,
            latest: null,
            metric: value.metric,
          };
        }

        comparison[employeeId][metricName].values.push(value);
        if (!comparison[employeeId][metricName].latest || 
            value.recordDate > comparison[employeeId][metricName].latest.recordDate) {
          comparison[employeeId][metricName].latest = value;
        }
      });

      // Calculate averages
      Object.keys(comparison).forEach(employeeId => {
        Object.keys(comparison[employeeId]).forEach(metricName => {
          const metricData = comparison[employeeId][metricName];
          if (metricData.values.length > 0) {
            metricData.average = metricData.values.reduce((sum: number, val: any) => sum + val.value, 0) / metricData.values.length;
          }
        });
      });

      return {
        employeeIds,
        metricIds,
        period,
        comparison,
        totalDataPoints: values.length,
      };
    } catch (error) {
      logger.error('Failed to compare employee metrics', error as Error);
      throw error;
    }
  }

  /**
   * Set metric targets
   */
  async setMetricTargets(metricId: string, targets: MetricTargetData[], requestingUserId: string): Promise<any[]> {
    try {
      const metric = await this.prisma.performanceMetric.findUnique({
        where: { id: metricId },
      });

      if (!metric) {
        throw new Error('Performance metric not found');
      }

      const createdTargets = [];

      for (const targetData of targets) {
        // Delete existing target if it exists
        await this.prisma.metricTarget.deleteMany({
          where: {
            metricId,
            employeeId: targetData.employeeId,
            period: targetData.period,
          },
        });

        // Create new target
        const target = await this.prisma.metricTarget.create({
          data: {
            metricId,
            employeeId: targetData.employeeId,
            period: targetData.period,
            targetValue: targetData.targetValue,
            minValue: targetData.minimumValue,
            maxValue: targetData.maximumValue,
            createdBy: 'system', // Required field - TODO: Pass actual user ID
            // notes: targetData.notes, // TODO: Add notes field to MetricTarget model if needed
          },
        });

        createdTargets.push(target);
      }

      logger.info('Metric targets set successfully', {
        metricId,
        targetsCount: targets.length,
        requestingUserId,
      });

      return createdTargets;
    } catch (error) {
      logger.error(`Failed to set metric targets ${metricId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get metric targets
   */
  async getMetricTargets(options: {
    metricId: string;
    employeeId?: string;
    period?: string;
    requestingUserId: string;
  }): Promise<any[]> {
    try {
      const { metricId, employeeId, period } = options;

      const where: any = { metricId };
      if (employeeId) where.employeeId = employeeId;
      if (period) where.period = period;

      const targets = await this.prisma.metricTarget.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return targets;
    } catch (error) {
      logger.error('Failed to get metric targets', error as Error);
      throw error;
    }
  }

  /**
   * Generate metric report
   */
  async generateMetricReport(options: GenerateReportOptions): Promise<any> {
    try {
      const { metricIds, employeeIds, departmentId, startDate, endDate, format } = options;

      const where: any = {};

      if (metricIds && metricIds.length > 0) {
        where.metricId = { in: metricIds };
      }

      if (employeeIds && employeeIds.length > 0) {
        where.employeeId = { in: employeeIds };
      }

      if (startDate || endDate) {
        where.recordDate = {};
        if (startDate) where.recordDate.gte = startDate;
        if (endDate) where.recordDate.lte = endDate;
      }

      const values = await this.prisma.metricValue.findMany({
        where,
        include: {
          metric: {
            select: {
              id: true,
              metricName: true,
              unit: true,
              metricType: true,
            },
          },
        },
        orderBy: [
          { metric: { metricName: 'asc' } },
          { employeeId: 'asc' },
          { recordDate: 'desc' },
        ],
      });

      if (format === 'json') {
        return {
          reportGenerated: new Date().toISOString(),
          filters: options,
          totalValues: values.length,
          values,
        };
      } else if (format === 'csv') {
        const headers = ['Metric Name', 'Employee ID', 'Value', 'Unit', 'Period', 'Record Date', 'Category', 'Type'];
        const rows = values.map(val => [
          val.metric?.metricName || 'Unknown',
          val.employeeId,
          val.value.toString(),
          val.metric?.unit || '',
          val.period,
          val.recordDate.toISOString(),
          'N/A', // category not available
          val.metric?.metricType || 'OTHER',
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
      }

      throw new Error('Unsupported report format');
    } catch (error) {
      logger.error('Failed to generate metric report', error as Error);
      throw error;
    }
  }

  // Private helper methods

  private calculatePeriodComparisons(values: any[]): Array<{
    period: string;
    averageValue: number;
    valueCount: number;
  }> {
    const periodData: Record<string, number[]> = {};

    values.forEach(value => {
      if (!periodData[value.period]) {
        periodData[value.period] = [];
      }
      periodData[value.period].push(value.value);
    });

    return Object.entries(periodData).map(([period, vals]) => ({
      period,
      averageValue: vals.reduce((sum, val) => sum + val, 0) / vals.length,
      valueCount: vals.length,
    })).sort((a, b) => a.period.localeCompare(b.period));
  }

  private aggregateValues(values: any[], aggregation: string): any[] {
    // Simplified aggregation logic
    const aggregated: Record<string, { values: number[]; date: Date }> = {};

    values.forEach(value => {
      let key: string;
      const date = new Date(value.recordDate);

      switch (aggregation) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarterly':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!aggregated[key]) {
        aggregated[key] = { values: [], date };
      }
      aggregated[key].values.push(value.value);
    });

    return Object.entries(aggregated).map(([period, data]) => ({
      period,
      averageValue: data.values.reduce((sum, val) => sum + val, 0) / data.values.length,
      totalValue: data.values.reduce((sum, val) => sum + val, 0),
      valueCount: data.values.length,
      date: data.date,
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
