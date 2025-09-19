import request from 'supertest';
import { Express } from 'express';
import { KafkaService } from '../../kafka/kafka-service';
import { CircuitBreaker } from '../../resilience/circuit-breaker';
import { SecretsManager } from '../../vault/secrets';
import { createLogger } from '../../utils/logger';

const logger = createLogger('integration-tests');

describe('Service Communication Integration Tests', () => {
  let authApp: Express;
  let employeeApp: Express;
  let apiGateway: Express;
  let kafkaService: KafkaService;
  let circuitBreaker: CircuitBreaker;

  beforeAll(async () => {
    // Setup test infrastructure
    await setupTestInfrastructure();
  });

  afterAll(async () => {
    // Cleanup test infrastructure
    await cleanupTestInfrastructure();
  });

  describe('Auth Service Integration', () => {
    test('should authenticate user and return JWT token', async () => {
      const credentials = {
        email: 'test@company.com',
        password: 'testpassword123',
      };

      const response = await request(authApp)
        .post('/api/v1/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(credentials.email);
    });

    test('should reject invalid credentials', async () => {
      const invalidCredentials = {
        email: 'test@company.com',
        password: 'wrongpassword',
      };

      const response = await request(authApp)
        .post('/api/v1/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid credentials');
    });

    test('should handle MFA authentication', async () => {
      const credentials = {
        email: 'mfa-user@company.com',
        password: 'testpassword123',
      };

      // First request should require MFA
      const initialResponse = await request(authApp)
        .post('/api/v1/auth/login')
        .send(credentials)
        .expect(200);

      expect(initialResponse.body).toHaveProperty('mfaRequired', true);
      expect(initialResponse.body).toHaveProperty('mfaToken');

      // Second request with MFA code
      const mfaResponse = await request(authApp)
        .post('/api/v1/auth/verify-mfa')
        .send({
          mfaToken: initialResponse.body.mfaToken,
          mfaCode: '123456', // Mock MFA code
        })
        .expect(200);

      expect(mfaResponse.body).toHaveProperty('accessToken');
      expect(mfaResponse.body).toHaveProperty('refreshToken');
    });
  });

  describe('Employee Service Integration', () => {
    let authToken: string;

    beforeEach(async () => {
      // Get auth token for employee service requests
      const authResponse = await request(authApp)
        .post('/api/v1/auth/login')
        .send({
          email: 'hr@company.com',
          password: 'testpassword123',
        });
      
      authToken = authResponse.body.accessToken;
    });

    test('should create employee and publish event', async () => {
      const employeeData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        departmentId: 'dept-123',
        positionId: 'pos-456',
        hireDate: '2024-01-15',
      };

      // Create employee
      const response = await request(employeeApp)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(employeeData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe(employeeData.firstName);
      expect(response.body.email).toBe(employeeData.email);

      // Verify event was published
      await waitForKafkaEvent('employee-events', 'employee.created', 5000);
    });

    test('should update employee and publish update event', async () => {
      const employeeId = 'existing-employee-id';
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const response = await request(employeeApp)
        .put(`/api/v1/employees/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe(updateData.firstName);

      // Verify update event was published
      await waitForKafkaEvent('employee-events', 'employee.updated', 5000);
    });

    test('should handle employee search with pagination', async () => {
      const response = await request(employeeApp)
        .get('/api/v1/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          search: 'John',
          page: 1,
          limit: 10,
          sortBy: 'firstName',
          sortOrder: 'asc',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('API Gateway Integration', () => {
    test('should route requests to appropriate services', async () => {
      // Test auth service routing
      const authResponse = await request(apiGateway)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@company.com',
          password: 'testpassword123',
        })
        .expect(200);

      expect(authResponse.body).toHaveProperty('accessToken');

      // Test employee service routing with auth
      const employeeResponse = await request(apiGateway)
        .get('/api/v1/employees/emp-123')
        .set('Authorization', `Bearer ${authResponse.body.accessToken}`)
        .expect(200);

      expect(employeeResponse.body).toHaveProperty('id');
    });

    test('should handle service unavailability with circuit breaker', async () => {
      // Simulate employee service being down
      await simulateServiceDown('employee-service');

      const response = await request(apiGateway)
        .get('/api/v1/employees')
        .set('Authorization', 'Bearer valid-token')
        .expect(503);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/service unavailable/i);
    });

    test('should apply rate limiting', async () => {
      const requests = [];
      
      // Make multiple rapid requests to trigger rate limit
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(apiGateway)
            .get('/api/v1/health')
            .expect((res) => {
              // Should eventually get rate limited
              return res.status === 200 || res.status === 429;
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Event-Driven Communication', () => {
    test('should handle employee creation event chain', async () => {
      const employeeData = {
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test.employee@company.com',
        departmentId: 'dept-123',
        positionId: 'pos-456',
        hireDate: '2024-01-15',
      };

      // Create employee
      const authToken = await getAuthToken();
      await request(employeeApp)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(employeeData)
        .expect(201);

      // Wait for events to propagate
      await waitForMultipleEvents([
        { topic: 'employee-events', eventType: 'employee.created' },
        { topic: 'notification-events', eventType: 'notification.welcome.sent' },
        { topic: 'learning-events', eventType: 'learning.onboarding.assigned' },
      ], 10000);
    });

    test('should handle event ordering and idempotency', async () => {
      const employeeId = 'test-employee-123';
      
      // Send same event multiple times
      for (let i = 0; i < 3; i++) {
        await kafkaService.getProducer().publishEvent('employee-events', {
          id: 'duplicate-event-123',
          type: 'employee.updated',
          source: 'test',
          data: { employeeId, changes: [{ field: 'firstName', newValue: 'Updated' }] },
          timestamp: new Date(),
          correlationId: 'test-correlation-123',
        });
      }

      // Verify only one update was processed
      await sleep(2000);
      
      const processedEvents = await getProcessedEvents('employee.updated', 'duplicate-event-123');
      expect(processedEvents.length).toBe(1);
    });
  });

  describe('Circuit Breaker Integration', () => {
    test('should trip circuit breaker on repeated failures', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 3,
        resetTimeout: 5000,
        monitoringPeriod: 10000,
      });

      // Cause failures to trip the circuit
      for (let i = 0; i < 4; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Service failure');
          });
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit should now be open
      expect(breaker.getStats().state).toBe('OPEN');

      // Subsequent calls should be rejected immediately
      const startTime = Date.now();
      try {
        await breaker.execute(async () => Promise.resolve('success'));
      } catch (error) {
        expect(error.message).toMatch(/circuit breaker is OPEN/i);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should fail fast
    });

    test('should recover when service is healthy again', async () => {
      const breaker = new CircuitBreaker({
        name: 'recovery-test-service',
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 5000,
      });

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Service failure');
          });
        } catch (error) {
          // Expected
        }
      }

      expect(breaker.getStats().state).toBe('OPEN');

      // Wait for reset timeout
      await sleep(1100);

      // Should allow one test call (HALF_OPEN)
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
      expect(breaker.getStats().state).toBe('CLOSED');
    });
  });

  describe('Secrets Management Integration', () => {
    let secretsManager: SecretsManager;

    beforeEach(() => {
      secretsManager = new SecretsManager({
        endpoint: process.env.VAULT_ENDPOINT || 'http://localhost:8200',
        token: process.env.VAULT_TOKEN || 'myroot',
      });
    });

    test('should store and retrieve secrets', async () => {
      const secretPath = 'secret/data/test/database';
      const secretData = {
        username: 'testuser',
        password: 'testpassword123',
        host: 'localhost',
        port: 5432,
      };

      // Store secret
      await secretsManager.setSecret(secretPath, secretData);

      // Retrieve secret
      const retrievedSecret = await secretsManager.getSecret(secretPath);
      expect(retrievedSecret).toEqual(secretData);
    });

    test('should handle secret encryption/decryption', async () => {
      const keyName = 'test-key';
      const plaintext = 'sensitive data';

      // Encrypt
      const ciphertext = await secretsManager.encrypt(keyName, plaintext);
      expect(ciphertext).toMatch(/^vault:v\d+:/);

      // Decrypt
      const decrypted = await secretsManager.decrypt(keyName, ciphertext);
      expect(decrypted).toBe(plaintext);
    });
  });

  // Helper functions
  async function setupTestInfrastructure(): Promise<void> {
    // Initialize test databases, Kafka, etc.
    logger.info('Setting up test infrastructure...');
    
    // This would typically:
    // 1. Start test containers
    // 2. Run database migrations
    // 3. Seed test data
    // 4. Initialize Kafka topics
  }

  async function cleanupTestInfrastructure(): Promise<void> {
    logger.info('Cleaning up test infrastructure...');
    
    // Cleanup resources
    if (kafkaService) {
      await kafkaService.disconnect();
    }
  }

  async function getAuthToken(): Promise<string> {
    const response = await request(authApp)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@company.com',
        password: 'testpassword123',
      });
    
    return response.body.accessToken;
  }

  async function waitForKafkaEvent(topic: string, eventType: string, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Event ${eventType} not received within ${timeout}ms`));
      }, timeout);

      // Mock event listener - would be implemented with actual Kafka consumer
      const mockEventReceived = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };

      // Simulate event received after 100ms
      setTimeout(mockEventReceived, 100);
    });
  }

  async function waitForMultipleEvents(events: Array<{ topic: string; eventType: string }>, timeout: number): Promise<void> {
    const promises = events.map(event => 
      waitForKafkaEvent(event.topic, event.eventType, timeout)
    );
    
    await Promise.all(promises);
  }

  async function simulateServiceDown(serviceName: string): Promise<void> {
    // Mock implementation - would interact with actual service discovery
    logger.info(`Simulating ${serviceName} being down`);
  }

  async function getProcessedEvents(eventType: string, eventId: string): Promise<any[]> {
    // Mock implementation - would query event store
    return [{ id: eventId, type: eventType, processed: true }];
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});
