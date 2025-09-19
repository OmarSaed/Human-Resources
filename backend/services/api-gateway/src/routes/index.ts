import { Router } from 'express';
import { ServiceDiscovery } from '../services/service-discovery';
import { ProxyService } from '../services/proxy.service';
import { 
  authenticateToken,
  optionalAuth,
  authenticateApiKey,
  protectRoute,
  adminOnly,
  hrStaffOnly 
} from '../middleware/auth.middleware';

const router = Router();

/**
 * Setup API Gateway routes
 */
export function setupRoutes(
  serviceDiscovery: ServiceDiscovery, 
  proxyService: ProxyService
): Router {
  
  // Health check endpoint
  router.get('/health', async (req, res) => {
    try {
      const systemHealth = serviceDiscovery.getSystemHealth();
      const servicesHealth = serviceDiscovery.getHealthSummary();
      
      res.status(systemHealth.status === 'healthy' ? 200 : 503).json({
        success: true,
        data: {
          gateway: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0',
          },
          system: systemHealth,
          services: servicesHealth,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Gateway metrics endpoint (admin only)
  router.get('/metrics', adminOnly, async (req, res) => {
    try {
      const metrics = {
        gateway: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
        },
        services: serviceDiscovery.getHealthSummary(),
        requests: proxyService.getRequestMetrics(),
        timestamp: new Date().toISOString(),
      };

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get metrics',
      });
    }
  });

  // Service discovery endpoints (admin only)
  router.post('/admin/services/refresh', adminOnly, async (req, res) => {
    try {
      await serviceDiscovery.refreshHealthChecks();
      res.json({
        success: true,
        message: 'Service health checks refreshed',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to refresh health checks',
      });
    }
  });

  router.get('/admin/services', adminOnly, (req, res) => {
    const services = serviceDiscovery.getHealthSummary();
    res.json({
      success: true,
      data: services,
    });
  });

  // ================================
  // PUBLIC ROUTES (No Authentication)
  // ================================

  // Authentication service routes (public)
  router.use('/api/v1/auth/health', proxyService.createServiceProxy('auth'));
  router.use('/api/v1/auth/login', proxyService.createServiceProxy('auth'));
  router.use('/api/v1/auth/register', proxyService.createServiceProxy('auth'));
  router.use('/api/v1/auth/refresh-token', proxyService.createServiceProxy('auth'));
  router.use('/api/v1/auth/forgot-password', proxyService.createServiceProxy('auth'));
  router.use('/api/v1/auth/reset-password', proxyService.createServiceProxy('auth'));
  router.use('/api/v1/auth/verify-email', proxyService.createServiceProxy('auth'));

  // Public endpoints for job listings (no auth required)
  router.use('/api/v1/jobs/public', optionalAuth, proxyService.createServiceProxy('recruitment'));

  // ================================
  // PROTECTED ROUTES (Authentication Required)
  // ================================

  // Apply authentication to all remaining routes
  router.use('/api/v1', authenticateToken);

  // Authentication service routes (protected)
  router.use('/api/v1/auth', proxyService.createServiceProxy('auth'));

  // Employee service routes
  router.use('/api/v1/employees', protectRoute, proxyService.createServiceProxy('employee'));
  router.use('/api/v1/departments', protectRoute, proxyService.createServiceProxy('employee'));
  router.use('/api/v1/positions', protectRoute, proxyService.createServiceProxy('employee'));

  // Recruitment service routes
  router.use('/api/v1/candidates', protectRoute, proxyService.createServiceProxy('recruitment'));
  router.use('/api/v1/jobs', protectRoute, proxyService.createServiceProxy('recruitment'));
  router.use('/api/v1/applications', protectRoute, proxyService.createServiceProxy('recruitment'));

  // Performance service routes
  router.use('/api/v1/performance', protectRoute, proxyService.createServiceProxy('performance'));
  router.use('/api/v1/reviews', protectRoute, proxyService.createServiceProxy('performance'));
  router.use('/api/v1/goals', protectRoute, proxyService.createServiceProxy('performance'));

  // Learning service routes
  router.use('/api/v1/learning', protectRoute, proxyService.createServiceProxy('learning'));
  router.use('/api/v1/courses', protectRoute, proxyService.createServiceProxy('learning'));
  router.use('/api/v1/training', protectRoute, proxyService.createServiceProxy('learning'));

  // Notification service routes
  router.use('/api/v1/notifications', proxyService.createServiceProxy('notification'));

  // Analytics service routes (managers and above)
  router.use('/api/v1/analytics', protectRoute, proxyService.createServiceProxy('analytics'));
  router.use('/api/v1/reports', protectRoute, proxyService.createServiceProxy('analytics'));

  // ================================
  // ADMIN ROUTES (Admin Only)
  // ================================

  router.use('/api/v1/admin', adminOnly, proxyService.createServiceProxy('auth'));

  // ================================
  // API KEY ROUTES (External Integration)
  // ================================

  // API key authenticated routes for external systems
  router.use('/api/external/v1', authenticateApiKey, proxyService.createDynamicProxy());

  // ================================
  // NOTE: All API v1 routes are handled by specific service routes above
  // If additional services are added, add their routes explicitly above
  // ================================

  return router;
}
