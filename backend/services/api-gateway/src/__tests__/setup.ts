// Test setup file for API Gateway
import { getServiceConfig } from '@hrms/shared';

const config = getServiceConfig('api-gateway');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.GATEWAY_PORT = '3001';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.AUTH_SERVICE_URL = 'http://localhost:3001';
process.env.EMPLOYEE_SERVICE_URL = 'http://localhost:3002';

// Test timeout
jest.setTimeout(30000);

// Global test hooks
beforeAll(async () => {
  // Global setup before all tests
});

afterAll(async () => {
  // Global cleanup after all tests
});

beforeEach(() => {
  // Setup before each test
});

afterEach(() => {
  // Cleanup after each test
});
