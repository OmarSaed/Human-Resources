// Jest setup file for auth service tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/hrms_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = '';
process.env.SESSION_SECRET = 'test-session-secret';

// Global test timeout
jest.setTimeout(30000);

// Mock Redis for tests
jest.mock('redis', () => ({
  createClient: () => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
  }),
}));

// Mock email service for tests
jest.mock('../services/email.service', () => ({
  EmailService: {
    initialize: jest.fn(),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendLoginAlert: jest.fn().mockResolvedValue(undefined),
    sendPasswordChangedNotification: jest.fn().mockResolvedValue(undefined),
    sendAccountLockedNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

// Global setup
beforeAll(async () => {
  // Global test setup
});

afterAll(async () => {
  // Global test cleanup
});

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});
