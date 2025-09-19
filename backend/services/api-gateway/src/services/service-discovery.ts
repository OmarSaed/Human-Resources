import axios from 'axios';
import { EventEmitter } from 'events';
import { createLogger } from '@hrms/shared';
import { getServiceConfig } from '@hrms/shared';

const gatewayConfig = getServiceConfig('api-gateway');

const logger = createLogger('service-discovery');

export interface ServiceInstance {
  id: string;
  name: string;
  url: string;
  healthy: boolean;
  lastHealthCheck: Date;
  responseTime: number;
  failureCount: number;
  metadata?: Record<string, any>;
}

export interface ServiceRegistry {
  [serviceName: string]: ServiceInstance[];
}

/**
 * Service Discovery and Health Monitoring
 */
export class ServiceDiscovery extends EventEmitter {
  private services: ServiceRegistry = {};
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor() {
    super();
    this.initializeServices();
  }

  /**
   * Initialize services from configuration
   */
  private initializeServices(): void {
    for (const [serviceName, serviceConfig] of Object.entries(gatewayConfig.services)) {
      this.services[serviceName] = [{
        id: `${serviceName}-1`,
        name: serviceName,
        url: (serviceConfig as any).url,
        healthy: false,
        lastHealthCheck: new Date(),
        responseTime: 0,
        failureCount: 0,
      }];
    }

    logger.info('Services initialized', {
      services: Object.keys(this.services),
      totalInstances: Object.values(this.services).flat().length,
    });
  }

  /**
   * Start health monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Service monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.performHealthChecks(); // Initial check
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, gatewayConfig.loadBalancing.healthCheckInterval);

    logger.info('Service health monitoring started', {
      interval: gatewayConfig.loadBalancing.healthCheckInterval,
    });
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.isMonitoring = false;
    logger.info('Service health monitoring stopped');
  }

  /**
   * Perform health checks on all service instances
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises: Promise<void>[] = [];

    for (const [serviceName, instances] of Object.entries(this.services)) {
      for (const instance of instances) {
        healthCheckPromises.push(this.checkServiceHealth(serviceName, instance));
      }
    }

    await Promise.allSettled(healthCheckPromises);
    this.emit('health-check-completed', this.getHealthSummary());
  }

  /**
   * Check health of a single service instance
   */
  private async checkServiceHealth(serviceName: string, instance: ServiceInstance): Promise<void> {
    const startTime = Date.now();
    const serviceConfig = gatewayConfig.services[serviceName as keyof typeof gatewayConfig.services];
    const healthUrl = `${instance.url}${serviceConfig.healthPath}`;

    try {
      const response = await axios.get(healthUrl, {
        timeout: serviceConfig.timeout,
        validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx as healthy
      });

      const responseTime = Date.now() - startTime;
      const wasHealthy = instance.healthy;

      // Update instance health
      instance.healthy = response.status < 400;
      instance.lastHealthCheck = new Date();
      instance.responseTime = responseTime;
      instance.failureCount = instance.healthy ? 0 : instance.failureCount + 1;

      // Emit events for health changes
      if (!wasHealthy && instance.healthy) {
        this.emit('service-recovered', { serviceName, instance });
        logger.info('Service recovered', {
          service: serviceName,
          instance: instance.id,
          responseTime,
        });
      }

      if (instance.healthy) {
        logger.debug('Service health check passed', {
          service: serviceName,
          instance: instance.id,
          responseTime,
        });
      }

    } catch (error) {
      const wasHealthy = instance.healthy;
      
      instance.healthy = false;
      instance.lastHealthCheck = new Date();
      instance.responseTime = Date.now() - startTime;
      instance.failureCount += 1;

      if (wasHealthy) {
        this.emit('service-failed', { serviceName, instance, error });
        logger.error('Service health check failed', {
          service: serviceName,
          instance: instance.id,
          error: (error as Error).message,
          failureCount: instance.failureCount,
        });
      }
    }
  }

  /**
   * Get healthy instances for a service
   */
  getHealthyInstances(serviceName: string): ServiceInstance[] {
    const instances = this.services[serviceName] || [];
    return instances.filter(instance => instance.healthy);
  }

  /**
   * Get all instances for a service (healthy and unhealthy)
   */
  getAllInstances(serviceName: string): ServiceInstance[] {
    return this.services[serviceName] || [];
  }

  /**
   * Get the best instance for a service based on load balancing strategy
   */
  getBestInstance(serviceName: string): ServiceInstance | null {
    const healthyInstances = this.getHealthyInstances(serviceName);
    
    if (healthyInstances.length === 0) {
      logger.warn('No healthy instances available', { service: serviceName });
      return null;
    }

    const strategy = gatewayConfig.loadBalancing.strategy;

    switch (strategy) {
      case 'round-robin':
        return this.roundRobinSelection(healthyInstances);
      
      case 'least-connections':
        return this.leastConnectionsSelection(healthyInstances);
      
      case 'fastest-response':
        return this.fastestResponseSelection(healthyInstances);
      
      case 'random':
      default:
        return this.randomSelection(healthyInstances);
    }
  }

  /**
   * Round-robin load balancing
   */
  private roundRobinSelection(instances: ServiceInstance[]): ServiceInstance {
    // Simple round-robin based on current time
    const index = Math.floor(Date.now() / 1000) % instances.length;
    return instances[index];
  }

  /**
   * Random selection
   */
  private randomSelection(instances: ServiceInstance[]): ServiceInstance {
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  /**
   * Least connections (using failure count as proxy)
   */
  private leastConnectionsSelection(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((best, current) => 
      current.failureCount < best.failureCount ? current : best
    );
  }

  /**
   * Fastest response time
   */
  private fastestResponseSelection(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((fastest, current) => 
      current.responseTime < fastest.responseTime ? current : fastest
    );
  }

  /**
   * Register a new service instance
   */
  registerService(serviceName: string, instance: Omit<ServiceInstance, 'id'>): string {
    if (!this.services[serviceName]) {
      this.services[serviceName] = [];
    }

    const serviceInstance: ServiceInstance = {
      ...instance,
      id: `${serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.services[serviceName].push(serviceInstance);
    
    logger.info('Service instance registered', {
      service: serviceName,
      instance: serviceInstance.id,
      url: serviceInstance.url,
    });

    this.emit('service-registered', { serviceName, instance: serviceInstance });
    return serviceInstance.id;
  }

  /**
   * Deregister a service instance
   */
  deregisterService(serviceName: string, instanceId: string): boolean {
    const instances = this.services[serviceName];
    if (!instances) return false;

    const index = instances.findIndex(instance => instance.id === instanceId);
    if (index === -1) return false;

    const removedInstance = instances.splice(index, 1)[0];
    
    logger.info('Service instance deregistered', {
      service: serviceName,
      instance: instanceId,
    });

    this.emit('service-deregistered', { serviceName, instance: removedInstance });
    return true;
  }

  /**
   * Get health summary of all services
   */
  getHealthSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    for (const [serviceName, instances] of Object.entries(this.services)) {
      const healthy = instances.filter(i => i.healthy).length;
      const total = instances.length;
      const avgResponseTime = instances.length > 0 
        ? instances.reduce((sum, i) => sum + i.responseTime, 0) / instances.length 
        : 0;

      summary[serviceName] = {
        healthy,
        total,
        healthRatio: total > 0 ? healthy / total : 0,
        avgResponseTime: Math.round(avgResponseTime),
        instances: instances.map(i => ({
          id: i.id,
          url: i.url,
          healthy: i.healthy,
          responseTime: i.responseTime,
          failureCount: i.failureCount,
          lastHealthCheck: i.lastHealthCheck,
        })),
      };
    }

    return summary;
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: number;
    healthyServices: number;
    totalInstances: number;
    healthyInstances: number;
  } {
    const allInstances = Object.values(this.services).flat();
    const healthyInstances = allInstances.filter(i => i.healthy);
    const services = Object.keys(this.services).length;
    const healthyServices = Object.values(this.services)
      .filter(instances => instances.some(i => i.healthy)).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    const healthRatio = allInstances.length > 0 ? healthyInstances.length / allInstances.length : 0;

    if (healthRatio >= 0.8) {
      status = 'healthy';
    } else if (healthRatio >= 0.5) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services,
      healthyServices,
      totalInstances: allInstances.length,
      healthyInstances: healthyInstances.length,
    };
  }

  /**
   * Force refresh health checks
   */
  async refreshHealthChecks(): Promise<void> {
    logger.info('Forcing health check refresh');
    await this.performHealthChecks();
  }
}
