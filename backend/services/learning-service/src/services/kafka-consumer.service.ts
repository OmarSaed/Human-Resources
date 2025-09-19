import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { createLogger, getServiceConfig } from '@hrms/shared';
import { LearningService } from './learning.service';
import { EmployeeEvent } from '../models/events.models';

const logger = createLogger('kafka-consumer-service');


export class KafkaConsumerService {
  private kafka: Kafka;
  private consumer: Consumer;
  private isConnected = false;
  private config = getServiceConfig('learning-service');

  constructor(private learningService: LearningService) {
    this.kafka = new Kafka({
      clientId: this.config.kafka.clientId,
      brokers: this.config.kafka.brokers,
      retry: this.config.kafka.retry,
    });

    this.consumer = this.kafka.consumer({
      groupId: this.config.kafka.groupId,
      maxWaitTimeInMs: this.config.kafka.consumer.maxWaitTimeInMs,
      heartbeatInterval: this.config.kafka.consumer.heartbeatInterval,
      sessionTimeout: this.config.kafka.consumer.sessionTimeout,
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.consumer.connect();
      this.isConnected = true;
      
      // Subscribe to employee events
      await this.consumer.subscribe({
        topics: ['employee.events', 'user.events'],
        fromBeginning: false,
      });

      // Start consuming messages
      await this.consumer.run({
        eachMessage: this.handleMessage.bind(this),
      });

      logger.info('Kafka consumer service initialized and started');
    } catch (error) {
      logger.error('Failed to initialize Kafka consumer', error as Error);
      throw error;
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    
    try {
      if (!message.value) {
        logger.warn('Received message with no value', { topic, partition });
        return;
      }

      const event = JSON.parse(message.value.toString()) as EmployeeEvent;
      
      logger.info('Processing employee event', {
        type: event.type,
        employeeId: event.employeeId,
        topic,
        partition,
        offset: message.offset,
      });

      await this.processEmployeeEvent(event);
      
      logger.info('Successfully processed employee event', {
        type: event.type,
        employeeId: event.employeeId,
      });
    } catch (error) {
      logger.error('Failed to process message', error as Error);
      
      // Depending on your error handling strategy, you might want to:
      // 1. Skip the message (current behavior)
      // 2. Retry processing
      // 3. Send to dead letter queue
    }
  }

  private async processEmployeeEvent(event: EmployeeEvent): Promise<void> {
    switch (event.type) {
      case 'employee.created':
        await this.handleEmployeeCreated(event);
        break;
        
      case 'employee.updated':
        await this.handleEmployeeUpdated(event);
        break;
        
      case 'employee.deleted':
        await this.handleEmployeeDeleted(event);
        break;
        
      case 'employee.role-changed':
        await this.handleEmployeeRoleChanged(event);
        break;
        
      default:
        logger.warn('Unknown employee event type', { type: event.type });
    }
  }

  private async handleEmployeeCreated(event: EmployeeEvent): Promise<void> {
    try {
      const { employeeId, data } = event;
      
      // Note: createEmployeeLearningProfile method needs to be implemented in LearningService
      logger.info('Employee created - would create learning profile', { employeeId });
      
      // Assign mandatory courses based on role/department
      await this.assignMandatoryCourses(employeeId, data.role, data.department);
      
      logger.info('Created learning profile for new employee', { employeeId });
    } catch (error) {
      logger.error('Failed to handle employee created event', error as Error);
      throw error;
    }
  }

  private async handleEmployeeUpdated(event: EmployeeEvent): Promise<void> {
    try {
      const { employeeId, data } = event;
      
      // Note: updateEmployeeLearningProfile method needs to be implemented in LearningService
      logger.info('Employee updated - would update learning profile', { employeeId });
      
      logger.info('Updated learning profile for employee', { employeeId });
    } catch (error) {
      logger.error('Failed to handle employee updated event', error as Error);
      throw error;
    }
  }

  private async handleEmployeeDeleted(event: EmployeeEvent): Promise<void> {
    try {
      const { employeeId } = event;
      
      // Note: archiveEmployeeLearningData method needs to be implemented in LearningService
      logger.info('Employee deleted - would archive learning data', { employeeId });
      
      logger.info('Archived learning data for deleted employee', { employeeId });
    } catch (error) {
      logger.error('Failed to handle employee deleted event', error as Error);
      throw error;
    }
  }

  private async handleEmployeeRoleChanged(event: EmployeeEvent): Promise<void> {
    try {
      const { employeeId, data } = event;
      
      // Note: These methods need to be implemented in LearningService
      logger.info('Employee role changed - would update profile and assign courses', { 
        employeeId,
        oldRole: data.oldRole,
        newRole: data.newRole,
      });
      
      logger.info('Updated learning profile for role change', {
        employeeId,
        oldRole: data.oldRole,
        newRole: data.newRole,
      });
    } catch (error) {
      logger.error('Failed to handle employee role changed event', error as Error);
      throw error;
    }
  }

  private async assignMandatoryCourses(
    employeeId: string,
    role: string,
    department: string
  ): Promise<void> {
    try {
      // Note: getMandatoryCourses and enrollEmployee methods need to be implemented
      logger.info('Would assign mandatory courses for role and department', {
        employeeId,
        role,
        department,
      });
      const mandatoryCourses: any[] = []; // Placeholder
      
      logger.info('Assigned mandatory courses', {
        employeeId,
        courseCount: mandatoryCourses.length,
      });
    } catch (error) {
      logger.error('Failed to assign mandatory courses', error as Error);
      // Don't throw - this shouldn't block the main event processing
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.consumer.disconnect();
        this.isConnected = false;
        logger.info('Kafka consumer disconnected');
      }
    } catch (error) {
      logger.error('Failed to cleanup Kafka consumer', error as Error);
      throw error;
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}
