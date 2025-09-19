import { PrismaClient } from '@prisma/client';
import Redis from 'redis';
import { createLogger } from '@hrms/shared';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/hrms_learning_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/15';

const logger = createLogger('test-setup');

// Global test database instance
let testDb: PrismaClient;
let testRedis: Redis.RedisClientType;

// Mock external services
jest.mock('@hrms/shared', () => ({
  ...jest.requireActual('@hrms/shared'),
  KafkaService: {
    getInstance: jest.fn(() => ({
      initializeProducer: jest.fn(),
      initializeConsumer: jest.fn(),
      getProducer: jest.fn(() => ({
        publishEvent: jest.fn(),
      })),
    })),
  },
}));

// Database setup
beforeAll(async () => {
  // Initialize test database
  testDb = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    await testDb.$connect();
    logger.info('Test database connected');
  } catch (error) {
    logger.error('Failed to connect to test database', error as Error);
    throw error;
  }

  // Initialize test Redis
  try {
    testRedis = Redis.createClient({
      url: process.env.REDIS_URL,
    });
    await testRedis.connect();
    logger.info('Test Redis connected');
  } catch (error) {
    logger.warn('Failed to connect to test Redis, using mock', error as Error);
  }
});

// Clean up before each test
beforeEach(async () => {
  if (testDb) {
    // Clear test data in reverse order of dependencies
    await testDb.assessmentAttempt.deleteMany();
    await testDb.lessonProgress.deleteMany();
    await testDb.moduleProgress.deleteMany();
    await testDb.certificate.deleteMany();
    await testDb.enrollment.deleteMany();
    await testDb.courseReview.deleteMany();
    await testDb.learningPathEnrollment.deleteMany();
    await testDb.employeeSkill.deleteMany();
    await testDb.lesson.deleteMany();
    await testDb.assessment.deleteMany();
    await testDb.courseModule.deleteMany();
    await testDb.course.deleteMany();
    await testDb.learningPath.deleteMany();
    await testDb.skill.deleteMany();
  }

  if (testRedis) {
    await testRedis.flushDb();
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (testDb) {
    await testDb.$disconnect();
  }
  if (testRedis) {
    await testRedis.disconnect();
  }
});

// Export test utilities
export { testDb, testRedis };

// Test data factories
export const createTestCourse = (overrides = {}) => ({
  title: 'Test Course',
  description: 'Test course description',
  category: 'TECHNICAL',
  difficulty: 'BEGINNER',
  duration: 60,
  estimatedHours: 1.0,
  language: 'en',
  authorId: 'test-author-id',
  status: 'PUBLISHED',
  isPublished: true,
  ...overrides,
});

export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'EMPLOYEE',
  ...overrides,
});

export const createTestEnrollment = (overrides = {}) => ({
  userId: 'test-user-id',
  courseId: 'test-course-id',
  status: 'ENROLLED',
  progress: 0,
  ...overrides,
});

// Mock authentication middleware
export const mockAuthMiddleware = (user = createTestUser()) => {
  return (req: any, res: any, next: any) => {
    req.user = user;
    next();
  };
};

// Mock request object
export const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: createTestUser(),
  ...overrides,
});

// Mock response object
export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

// Test performance helper
export const measurePerformance = async (fn: () => Promise<any>, expectedMaxTime: number = 1000) => {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(expectedMaxTime);
  return { result, duration };
};

// Database transaction helper for tests
export const withTransaction = async (fn: (db: any) => Promise<any>) => {
  return testDb.$transaction(async (tx) => {
    return fn(tx);
  });
};

// Redis cleanup helper
export const clearRedisNamespace = async (namespace: string) => {
  if (testRedis) {
    const keys = await testRedis.keys(`${namespace}:*`);
    if (keys.length > 0) {
      await testRedis.del(keys);
    }
  }
};

// Error handling for async tests
export const expectAsyncError = async (fn: () => Promise<any>, expectedError?: string | RegExp) => {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        expect((error as Error).message).toContain(expectedError);
      } else {
        expect((error as Error).message).toMatch(expectedError);
      }
    }
    return error;
  }
};

// Wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Test timeout helper
export const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
};
