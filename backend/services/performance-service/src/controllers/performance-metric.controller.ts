import { Request, Response } from 'express';
import { createLogger } from '@hrms/shared';
import { PerformanceMetricService } from '../services/performance-metric.service';

const logger = createLogger('performance-metric-controller');

export class PerformanceMetricController {
  constructor(private performanceMetricService: PerformanceMetricService) {}

  /**
   * Create a new performance metric
   */
  createMetric = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const metricData = req.body;

      const metric = await this.performanceMetricService.createMetric({
        ...metricData,
        createdBy: userId,
      });

      logger.info('Performance metric created successfully', {
        metricId: metric.id,
        name: metric.name,
        type: metric.type,
        category: metric.category,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        metric,
        message: 'Performance metric created successfully',
      });
    } catch (error) {
      logger.error('Failed to create performance metric', error as Error);
      res.status(500).json({
        error: 'Failed to create performance metric',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get performance metric by ID
   */
  getMetric = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      const metric = await this.performanceMetricService.getMetric(id, userId);

      if (!metric) {
        res.status(404).json({
          error: 'Performance metric not found',
          message: 'The requested performance metric was not found or you do not have access to it',
        });
        return;
      }

      res.json({
        success: true,
        metric,
      });
    } catch (error) {
      logger.error(`Failed to get performance metric ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve performance metric',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Update performance metric
   */
  updateMetric = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const updates = req.body;

      const metric = await this.performanceMetricService.updateMetric(id, updates, userId);

      logger.info('Performance metric updated successfully', {
        metricId: id,
        userId,
        updates: Object.keys(updates),
      });

      res.json({
        success: true,
        metric,
        message: 'Performance metric updated successfully',
      });
    } catch (error) {
      logger.error(`Failed to update performance metric ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to update performance metric',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Delete performance metric
   */
  deleteMetric = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;

      await this.performanceMetricService.deleteMetric(id, userId);

      logger.info('Performance metric deleted successfully', { metricId: id, userId });

      res.json({
        success: true,
        message: 'Performance metric deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete performance metric ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to delete performance metric',
        message: (error as Error).message,
      });
    }
  };

  /**
   * List performance metrics
   */
  listMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        type,
        category,
        isActive,
        search,
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc',
      } = req.query;

      const options = {
        type: type as string,
        category: category as string,
        isActive: isActive ? isActive === 'true' : undefined,
        search: search as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.performanceMetricService.listMetrics(options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to list performance metrics', error as Error);
      res.status(500).json({
        error: 'Failed to list performance metrics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Record metric value
   */
  recordMetricValue = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { employeeId, value, period, notes } = req.body;

      const metricValue = await this.performanceMetricService.recordMetricValue({
        metricId: id,
        employeeId,
        value,
        period,
        notes,
        recordedBy: userId,
      });

      logger.info('Metric value recorded successfully', {
        metricId: id,
        employeeId,
        value,
        period,
        recordedBy: userId,
      });

      res.status(201).json({
        success: true,
        metricValue,
        message: 'Metric value recorded successfully',
      });
    } catch (error) {
      logger.error(`Failed to record metric value ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to record metric value',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get metric values
   */
  getMetricValues = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        employeeId,
        startDate,
        endDate,
        period,
        page = 1,
        limit = 50,
        sortBy = 'recordDate',
        sortOrder = 'desc',
      } = req.query;

      const options = {
        employeeId: employeeId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        period: period as string,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.performanceMetricService.getMetricValues(id, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Failed to get metric values ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to get metric values',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get employee metrics
   */
  getEmployeeMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { employeeId } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        category,
        type,
        period,
        includeInactive,
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc',
      } = req.query;

      const options = {
        category: category as string,
        type: type as string,
        period: period as string,
        includeInactive: includeInactive === 'true',
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        requestingUserId: userId,
      };

      const result = await this.performanceMetricService.getEmployeeMetrics(employeeId, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Failed to get employee metrics ${req.params.employeeId}`, error as Error);
      res.status(500).json({
        error: 'Failed to get employee metrics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get metric analytics
   */
  getMetricAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        startDate,
        endDate,
        departmentId,
        includeComparisons,
      } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        departmentId: departmentId as string,
        includeComparisons: includeComparisons === 'true',
        requestingUserId: userId,
      };

      const analytics = await this.performanceMetricService.getMetricAnalytics(id, options);

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      logger.error(`Failed to get metric analytics ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to get metric analytics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Bulk record metric values
   */
  bulkRecordMetricValues = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { metricValues } = req.body;

      const result = await this.performanceMetricService.bulkRecordMetricValues(metricValues, userId);

      logger.info('Bulk metric values recorded', {
        totalRequested: metricValues.length,
        successful: result.successful,
        failed: result.failed,
        recordedBy: userId,
      });

      res.json({
        success: true,
        result,
        message: `${result.successful} metric values recorded successfully, ${result.failed} failed`,
      });
    } catch (error) {
      logger.error('Failed to bulk record metric values', error as Error);
      res.status(500).json({
        error: 'Failed to bulk record metric values',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get metric trends
   */
  getMetricTrends = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const {
        employeeId,
        startDate,
        endDate,
        aggregation = 'monthly',
      } = req.query;

      const options = {
        employeeId: employeeId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        aggregation: aggregation as 'daily' | 'weekly' | 'monthly' | 'quarterly',
        requestingUserId: userId,
      };

      const trends = await this.performanceMetricService.getMetricTrends(id, options);

      res.json({
        success: true,
        trends,
      });
    } catch (error) {
      logger.error(`Failed to get metric trends ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to get metric trends',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Compare employee metrics
   */
  compareEmployeeMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const { employeeIds, metricIds, period } = req.body;

      const comparison = await this.performanceMetricService.compareEmployeeMetrics({
        employeeIds,
        metricIds,
        period,
        requestingUserId: userId,
      });

      res.json({
        success: true,
        comparison,
      });
    } catch (error) {
      logger.error('Failed to compare employee metrics', error as Error);
      res.status(500).json({
        error: 'Failed to compare employee metrics',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Set metric targets
   */
  setMetricTargets = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { targets } = req.body;

      const result = await this.performanceMetricService.setMetricTargets(id, targets, userId);

      logger.info('Metric targets set', {
        metricId: id,
        targetsCount: targets.length,
        setBy: userId,
      });

      res.json({
        success: true,
        targets: result,
        message: 'Metric targets set successfully',
      });
    } catch (error) {
      logger.error(`Failed to set metric targets ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to set metric targets',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Get metric targets
   */
  getMetricTargets = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.headers['x-user-id'] as string;
      const { employeeId, period } = req.query;

      const targets = await this.performanceMetricService.getMetricTargets({
        metricId: id,
        employeeId: employeeId as string,
        period: period as string,
        requestingUserId: userId,
      });

      res.json({
        success: true,
        targets,
      });
    } catch (error) {
      logger.error(`Failed to get metric targets ${req.params.id}`, error as Error);
      res.status(500).json({
        error: 'Failed to get metric targets',
        message: (error as Error).message,
      });
    }
  };

  /**
   * Generate metric report
   */
  generateMetricReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const {
        metricIds,
        employeeIds,
        departmentId,
        startDate,
        endDate,
        format = 'json',
      } = req.body;

      const report = await this.performanceMetricService.generateMetricReport({
        metricIds,
        employeeIds,
        departmentId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        format,
        requestingUserId: userId,
      });

      if (format === 'json') {
        res.json({
          success: true,
          report,
        });
      } else {
        const filename = `performance-metrics-report-${new Date().toISOString().split('T')[0]}.${format}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
        } else if (format === 'xlsx') {
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        }
        
        res.send(report);
      }
    } catch (error) {
      logger.error('Failed to generate metric report', error as Error);
      res.status(500).json({
        error: 'Failed to generate metric report',
        message: (error as Error).message,
      });
    }
  };
}
