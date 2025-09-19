// Export all types (excluding BaseEntity to avoid conflicts)
export * from './types';

// Export Kafka services (specific exports to avoid conflicts)
export { KafkaProducer } from './kafka/producer';
export { KafkaConsumer } from './kafka/consumer';
export { TOPICS, SYSTEM_EVENT_TYPES } from './kafka';

// Export event utilities and contracts (specific exports to avoid conflicts)
export { EventFactory, EventValidator, EventRouter } from './events';

// Export database utilities (BaseEntity will come from here)
export * from './database';

// Export configuration
export * from './config';
export { getServiceConfig, validateServiceConfig } from './config';

// Export utilities
export * from './utils/logger';
export { validate, formatJoiErrors, commonSchemas, employeeSchemas, recruitmentSchemas, performanceSchemas, fileUploadSchema } from './utils/validation';
export * from './utils/storage-helper';

// Export middleware
export * from './middleware';

// Export distributed tracing
export * from './tracing/tracer';

// Export resilience patterns
export * from './resilience/circuit-breaker';

// Export metrics
export * from './metrics/prometheus';

// Export secrets management
export * from './vault/secrets';

// Export API versioning
export * from './middleware/versioning';

// Export shared services
export { AuditService } from './services/audit.service';
export { NotificationService } from './services/notification.service';

// Version
export const version = '2.0.0';
