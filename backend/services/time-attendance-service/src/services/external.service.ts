import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import { Kafka, Producer, Consumer } from 'kafkajs';

// Simple logger fallback
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] external-service: ${message}`, data),
  error: (message: string, error?: Error) => console.error(`[ERROR] external-service: ${message}`, error),
  debug: (message: string, data?: any) => console.log(`[DEBUG] external-service: ${message}`, data),
  warn: (message: string, data?: any) => console.warn(`[WARN] external-service: ${message}`, data),
};

interface EmployeeInfo {
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
  status?: string;
  hireDate?: string;
}

interface EmployeeRequestEvent {
  id: string;
  type: 'EMPLOYEE_FETCH_REQUEST';
  source: 'time-attendance-service';
  version: '1.0';
  data: {
    employeeIds: string[];
    requestId: string;
    requestedBy: string;
    requestedAt: string;
  };
  correlationId: string;
  timestamp: string;
}

interface EmployeeResponseEvent {
  id: string;
  type: 'EMPLOYEE_FETCH_RESPONSE';
  source: 'employee-service';
  version: '1.0';
  data: {
    employees: EmployeeInfo[];
    requestId: string;
    foundCount: number;
  };
  correlationId: string;
  timestamp: string;
}

interface ScheduleRequestEvent {
  id: string;
  type: 'SCHEDULE_FETCH_REQUEST';
  source: 'time-attendance-service';
  version: '1.0';
  data: {
    employeeIds: string[];
    date: string;
    requestId: string;
  };
  correlationId: string;
  timestamp: string;
}

interface AttendanceNotificationEvent {
  id: string;
  type: 'ATTENDANCE_NOTIFICATION';
  source: 'time-attendance-service';
  version: '1.0';
  data: {
    employeeId: string;
    notificationType: 'CLOCK_IN_REMINDER' | 'CLOCK_OUT_REMINDER' | 'LEAVE_APPROVED' | 'OVERTIME_APPROVED' | 'ATTENDANCE_ALERT';
    message: string;
    metadata?: Record<string, any>;
  };
  correlationId: string;
  timestamp: string;
}

export class ExternalService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected: boolean = false;
  private pendingRequests: Map<string, {
    resolve: (data: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
    
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    
    this.consumer = this.kafka.consumer({
      groupId: `${config.kafka.groupId}-external`,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000,
      allowAutoTopicCreation: true,
    });
  }

  /**
   * Initialize Kafka connections
   */
  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.producer.connect(),
        this.consumer.connect()
      ]);

      await this.consumer.subscribe({ 
        topics: ['employee-responses', 'schedule-responses'] 
      });
      
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.handleMessage(message);
        },
      });

      this.isConnected = true;
      logger.info('External service Kafka integration initialized');
    } catch (error) {
      logger.error('Failed to initialize external service Kafka integration', error as Error);
      throw error;
    }
  }

  /**
   * Cleanup Kafka connections
   */
  async cleanup(): Promise<void> {
    try {
      // Clear any pending requests
      for (const [requestId, request] of this.pendingRequests) {
        clearTimeout(request.timeout);
        request.reject(new Error('Service shutting down'));
      }
      this.pendingRequests.clear();

      await Promise.all([
        this.producer.disconnect(),
        this.consumer.disconnect()
      ]);

      this.isConnected = false;
      logger.info('External service Kafka integration cleaned up');
    } catch (error) {
      logger.error('Error cleaning up external service Kafka integration', error as Error);
    }
  }

  /**
   * Handle incoming Kafka messages
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      if (!message.value) {
        logger.warn('Received message with no value');
        return;
      }

      const event = JSON.parse(message.value.toString());
      
      if (event.type === 'EMPLOYEE_FETCH_RESPONSE') {
        await this.handleEmployeeResponse(event as EmployeeResponseEvent);
      } else if (event.type === 'SCHEDULE_FETCH_RESPONSE') {
        await this.handleScheduleResponse(event);
      }
    } catch (error) {
      logger.error('Error handling Kafka message', error as Error);
    }
  }

  /**
   * Handle employee data response
   */
  private async handleEmployeeResponse(event: EmployeeResponseEvent): Promise<void> {
    const { requestId, employees } = event.data;
    const pendingRequest = this.pendingRequests.get(requestId);

    if (pendingRequest) {
      clearTimeout(pendingRequest.timeout);
      this.pendingRequests.delete(requestId);
      pendingRequest.resolve(employees);

      logger.debug('Employee fetch response received', {
        requestId,
        employeeCount: employees.length,
      });
    } else {
      logger.warn('Received response for unknown employee request', { requestId });
    }
  }

  /**
   * Handle schedule response
   */
  private async handleScheduleResponse(event: any): Promise<void> {
    const { requestId, schedules } = event.data;
    const pendingRequest = this.pendingRequests.get(requestId);

    if (pendingRequest) {
      clearTimeout(pendingRequest.timeout);
      this.pendingRequests.delete(requestId);
      pendingRequest.resolve(schedules);

      logger.debug('Schedule fetch response received', {
        requestId,
        scheduleCount: schedules?.length || 0,
      });
    } else {
      logger.warn('Received response for unknown schedule request', { requestId });
    }
  }

  /**
   * Get employee information via Kafka
   */
  async getEmployee(employeeId: string): Promise<EmployeeInfo | null> {
    try {
      const employees = await this.getEmployees([employeeId]);
      return employees.length > 0 ? employees[0] : null;
    } catch (error) {
      logger.error('Failed to get employee information', error as Error);
      return null;
    }
  }

  /**
   * Get multiple employees via Kafka
   */
  async getEmployees(employeeIds: string[]): Promise<EmployeeInfo[]> {
    if (employeeIds.length === 0) {
      return [];
    }

    const requestId = uuidv4();
    const correlationId = uuidv4();

    try {
      logger.debug('Requesting employee information via Kafka', {
        requestId,
        employeeIds,
        employeeCount: employeeIds.length,
      });

      // Create promise that will be resolved when response is received
      const responsePromise = new Promise<EmployeeInfo[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Employee fetch request timeout: ${requestId}`));
        }, 10000); // 10 second timeout

        this.pendingRequests.set(requestId, {
          resolve,
          reject,
          timeout,
        });
      });

      // Publish employee fetch request event
      const requestEvent: EmployeeRequestEvent = {
        id: uuidv4(),
        type: 'EMPLOYEE_FETCH_REQUEST',
        source: 'time-attendance-service',
        version: '1.0',
        data: {
          employeeIds,
          requestId,
          requestedBy: 'time-attendance-service',
          requestedAt: new Date().toISOString(),
        },
        correlationId,
        timestamp: new Date().toISOString(),
      };

      await this.producer.send({
        topic: 'employee-requests',
        messages: [{
          key: requestEvent.id,
          value: JSON.stringify(requestEvent),
          headers: {
            eventType: requestEvent.type,
            source: requestEvent.source,
            version: requestEvent.version,
            correlationId: requestEvent.correlationId,
          },
        }],
      });

      // Wait for response
      const employees = await responsePromise;

      logger.info('Employee information retrieved successfully', {
        requestId,
        requestedCount: employeeIds.length,
        receivedCount: employees.length,
      });

      return employees;
    } catch (error) {
      // Clean up pending request on error
      const pendingRequest = this.pendingRequests.get(requestId);
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        this.pendingRequests.delete(requestId);
      }

      logger.error('Failed to get employees information via Kafka: ' + (error as Error).message);
      return [];
    }
  }

  /**
   * Get work schedules for employees
   */
  async getEmployeeSchedules(employeeIds: string[], date: string): Promise<any[]> {
    if (employeeIds.length === 0) {
      return [];
    }

    const requestId = uuidv4();
    const correlationId = uuidv4();

    try {
      logger.debug('Requesting schedule information via Kafka', {
        requestId,
        employeeIds,
        date,
      });

      // Create promise for response
      const responsePromise = new Promise<any[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Schedule fetch request timeout: ${requestId}`));
        }, 10000);

        this.pendingRequests.set(requestId, {
          resolve,
          reject,
          timeout,
        });
      });

      // Publish schedule fetch request
      const requestEvent: ScheduleRequestEvent = {
        id: uuidv4(),
        type: 'SCHEDULE_FETCH_REQUEST',
        source: 'time-attendance-service',
        version: '1.0',
        data: {
          employeeIds,
          date,
          requestId,
        },
        correlationId,
        timestamp: new Date().toISOString(),
      };

      await this.producer.send({
        topic: 'schedule-requests',
        messages: [{
          key: requestEvent.id,
          value: JSON.stringify(requestEvent),
          headers: {
            eventType: requestEvent.type,
            source: requestEvent.source,
            version: requestEvent.version,
            correlationId: requestEvent.correlationId,
          },
        }],
      });

      // Wait for response
      const schedules = await responsePromise;

      logger.info('Schedule information retrieved successfully', {
        requestId,
        requestedCount: employeeIds.length,
        receivedCount: schedules.length,
      });

      return schedules;
    } catch (error) {
      const pendingRequest = this.pendingRequests.get(requestId);
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        this.pendingRequests.delete(requestId);
      }

      logger.error('Failed to get schedule information via Kafka: ' + (error as Error).message);
      return [];
    }
  }

  /**
   * Send attendance notification
   */
  async sendAttendanceNotification(
    employeeId: string,
    notificationType: 'CLOCK_IN_REMINDER' | 'CLOCK_OUT_REMINDER' | 'LEAVE_APPROVED' | 'OVERTIME_APPROVED' | 'ATTENDANCE_ALERT',
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const notificationEvent: AttendanceNotificationEvent = {
        id: uuidv4(),
        type: 'ATTENDANCE_NOTIFICATION',
        source: 'time-attendance-service',
        version: '1.0',
        data: {
          employeeId,
          notificationType,
          message,
          metadata,
        },
        correlationId: uuidv4(),
        timestamp: new Date().toISOString(),
      };

      await this.producer.send({
        topic: 'attendance-notifications',
        messages: [{
          key: notificationEvent.id,
          value: JSON.stringify(notificationEvent),
          headers: {
            eventType: notificationEvent.type,
            source: notificationEvent.source,
            employeeId,
            notificationType,
          },
        }],
      });

      logger.debug('Attendance notification sent', {
        employeeId,
        notificationType,
        message,
      });
    } catch (error) {
      logger.error('Failed to send attendance notification', error as Error);
    }
  }

  /**
   * Validate user authentication
   */
  async validateUser(userId: string, token: string): Promise<boolean> {
    try {
      // Basic validation - in production this would go through Kafka to auth service
      if (!token || !userId) {
        return false;
      }

      // Basic token format validation
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return false;
      }

      // UUID validation for userId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate user', error as Error);
      return false;
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      // Basic permissions - in production this would be fetched via Kafka
      const basicPermissions = [
        'time.read',
        'time.create',
        'time.update',
        'attendance.read',
        'leave.read',
        'leave.create',
        'overtime.read',
        'overtime.create',
      ];

      return basicPermissions;
    } catch (error) {
      logger.error('Failed to get user permissions', error as Error);
      return [];
    }
  }

  /**
   * Health check for external service connections
   */
  isHealthy(): boolean {
    return this.isConnected;
  }
}
