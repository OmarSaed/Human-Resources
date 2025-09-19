import express from 'express';
import { PerformanceMetricController } from '../controllers/performance-metric.controller';
import { authMiddleware, requirePermission } from '../middleware';

export function createPerformanceMetricRoutes(performanceMetricController: PerformanceMetricController): express.Router {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware);

  // Metric CRUD operations
  router.post(
    '/',
    requirePermission('performance_metric.create'),
    performanceMetricController.createMetric
  );

  router.get(
    '/',
    performanceMetricController.listMetrics
  );

  router.get(
    '/:id',
    performanceMetricController.getMetric
  );

  router.put(
    '/:id',
    requirePermission('performance_metric.update'),
    performanceMetricController.updateMetric
  );

  router.delete(
    '/:id',
    requirePermission('performance_metric.delete'),
    performanceMetricController.deleteMetric
  );

  // Metric value operations
  router.post(
    '/:id/values',
    requirePermission('performance_metric.record_value'),
    performanceMetricController.recordMetricValue
  );

  router.get(
    '/:id/values',
    performanceMetricController.getMetricValues
  );

  // Employee metrics
  router.get(
    '/employees/:employeeId',
    performanceMetricController.getEmployeeMetrics
  );

  // Metric analytics
  router.get(
    '/:id/analytics',
    requirePermission('performance_metric.analytics'),
    performanceMetricController.getMetricAnalytics
  );

  router.get(
    '/:id/trends',
    performanceMetricController.getMetricTrends
  );

  // Metric targets
  router.post(
    '/:id/targets',
    requirePermission('performance_metric.set_targets'),
    performanceMetricController.setMetricTargets
  );

  router.get(
    '/:id/targets',
    performanceMetricController.getMetricTargets
  );

  // Bulk operations
  router.post(
    '/bulk-record-values',
    requirePermission('performance_metric.bulk_record'),
    performanceMetricController.bulkRecordMetricValues
  );

  // Comparisons and reports
  router.post(
    '/compare-employees',
    requirePermission('performance_metric.compare'),
    performanceMetricController.compareEmployeeMetrics
  );

  router.post(
    '/generate-report',
    requirePermission('performance_metric.report'),
    performanceMetricController.generateMetricReport
  );

  return router;
}
