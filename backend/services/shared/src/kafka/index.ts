import { KafkaProducer } from './producer';
import { KafkaConsumer } from './consumer';
import { KafkaConfig } from '../types';
import { logger } from '../utils/logger';

export * from './producer';
export * from './consumer';

export class KafkaService {
  private static instance: KafkaService;
  private producer: KafkaProducer | null = null;
  private consumer: KafkaConsumer | null = null;
  private config: KafkaConfig;

  private constructor(config: KafkaConfig) {
    this.config = config;
  }

  static getInstance(config: KafkaConfig): KafkaService {
    if (!KafkaService.instance) {
      KafkaService.instance = new KafkaService(config);
    }
    return KafkaService.instance;
  }

  async initializeProducer(): Promise<KafkaProducer> {
    if (!this.producer) {
      this.producer = await KafkaProducer.initialize(this.config.clientId, this.config.brokers);
    }
    return this.producer;
  }

  async initializeConsumer(): Promise<KafkaConsumer> {
    if (!this.consumer) {
      this.consumer = new KafkaConsumer(
        this.config.clientId,
        this.config.groupId,
        this.config.brokers
      );
      await this.consumer.connect();
    }
    return this.consumer;
  }

  getProducer(): KafkaProducer | null {
    return this.producer;
  }

  async getOrInitializeProducer(): Promise<KafkaProducer> {
    if (!this.producer) {
      await this.initializeProducer();
    }
    return this.producer!;
  }

  getConsumer(): KafkaConsumer {
    if (!this.consumer) {
      throw new Error('Consumer not initialized. Call initializeConsumer() first.');
    }
    return this.consumer;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Kafka services...');
    
    const promises: Promise<void>[] = [];
    
    if (this.producer) {
      promises.push(this.producer.disconnect());
    }
    
    if (this.consumer) {
      promises.push(this.consumer.shutdown());
    }
    
    await Promise.all(promises);
    
    this.producer = null;
    this.consumer = null;
    
    logger.info('Kafka services shutdown completed');
  }

  async healthCheck(): Promise<boolean> {
    const producerHealthy = this.producer ? this.producer.isHealthy() : true;
    const consumerHealthy = this.consumer ? this.consumer.isHealthy() : true;
    
    return producerHealthy && consumerHealthy;
  }
}

// Topic constants
export const TOPICS = {
  EMPLOYEE_EVENTS: 'employee-events',
  RECRUITMENT_EVENTS: 'recruitment-events',
  PERFORMANCE_EVENTS: 'performance-events',
  LEARNING_EVENTS: 'learning-events',
  NOTIFICATION_EVENTS: 'notification-events',
  AUDIT_EVENTS: 'audit-events',
} as const;

// System-level event type constants (cross-service events)
export const SYSTEM_EVENT_TYPES = {
  // Authentication Events
  USER_AUTHENTICATED: 'user.authenticated',
  USER_LOGGED_OUT: 'user.logged_out',
  USER_PASSWORD_CHANGED: 'user.password.changed',
  
  // Notification Events
  NOTIFICATION_REQUESTED: 'notification.requested',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  
  // Audit Events
  AUDIT_LOG_CREATED: 'audit.log.created',
  
  // System Events
  SERVICE_STARTED: 'service.started',
  SERVICE_STOPPED: 'service.stopped',
  HEALTH_CHECK_FAILED: 'health.check.failed',
} as const;

// Service-specific event patterns (services define their own detailed events)
export const SERVICE_EVENT_PATTERNS = {
  EMPLOYEE: 'employee.*',
  RECRUITMENT: 'recruitment.*',
  PERFORMANCE: 'performance.*',
  LEARNING: 'learning.*',
  ATTENDANCE: 'attendance.*',
  PAYROLL: 'payroll.*',
} as const;
