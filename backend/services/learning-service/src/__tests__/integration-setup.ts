import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { testDb } from './setup';

const logger = createLogger('integration-test-setup');

// Integration test utilities
export class IntegrationTestHelper {
  private app: Express;
  private authToken: string = '';

  constructor(app: Express) {
    this.app = app;
  }

  // Authentication helper
  async authenticate(userCredentials = { email: 'test@example.com', password: 'testpass123' }) {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiRU1QTE9ZRUUiLCJpYXQiOjE2Mzk1NzgwMDAsImV4cCI6OTk5OTk5OTk5OX0.test-signature';
    this.authToken = mockToken;
    return mockToken;
  }

  // API request helper with authentication
  request() {
    return request(this.app).set('Authorization', `Bearer ${this.authToken}`);
  }

  // Create test course with dependencies
  async createTestCourse(courseData = {}) {
    const defaultCourse = {
      title: 'Integration Test Course',
      description: 'Course for integration testing',
      category: 'TECHNICAL' as any,
      difficulty: 'BEGINNER' as any,
      duration: 120,
      estimatedHours: 2.0,
      language: 'en',
      authorId: 'test-author-id',
      status: 'PUBLISHED' as any,
      isPublished: true,
      syllabus: {}, // Add required syllabus field
      ...courseData,
    };

    const course = await testDb.course.create({
      data: defaultCourse,
    });

    // Create a test module
    const module = await testDb.courseModule.create({
      data: {
        courseId: course.id,
        title: 'Test Module',
        description: 'Test module for integration testing',
        order: 1,
        duration: 60,
        content: { type: 'text', body: 'Test content' },
        isPublished: true,
      },
    });

    // Create a test lesson
    const lesson = await testDb.lesson.create({
      data: {
        moduleId: module.id,
        title: 'Test Lesson',
        description: 'Test lesson for integration testing',
        order: 1,
        duration: 30,
        type: 'VIDEO',
        content: { videoUrl: 'https://example.com/video.mp4' },
        isPublished: true,
      },
    });

    return { course, module, lesson };
  }

  // Create test user enrollment
  async createTestEnrollment(userId: string, courseId: string) {
    return testDb.enrollment.create({
      data: {
        userId,
        courseId,
        status: 'ENROLLED',
        progress: 0,
        enrolledAt: new Date(),
      },
    });
  }

  // Create test learning path
  async createTestLearningPath(pathData = {}) {
    const defaultPath = {
      title: 'Integration Test Path',
      description: 'Learning path for integration testing',
      difficulty: 'BEGINNER' as any,
      estimatedHours: 10.0,
      estimatedDuration: 10.0, // Add required estimatedDuration field
      category: 'TECHNICAL' as any,
      tags: ['testing', 'integration'],
      courses: [{ courseId: 'test-course-id', order: 1, isRequired: true }],
      isPublished: true,
      authorId: 'test-author-id',
      ...pathData,
    };

    return testDb.learningPath.create({
      data: defaultPath,
    });
  }

  // API test helpers
  async testGetEndpoint(endpoint: string, expectedStatus = 200) {
    const response = await this.request().get(endpoint);
    expect(response.status).toBe(expectedStatus);
    return response;
  }

  async testPostEndpoint(endpoint: string, data: any, expectedStatus = 201) {
    const response = await this.request().post(endpoint).send(data);
    expect(response.status).toBe(expectedStatus);
    return response;
  }

  async testPutEndpoint(endpoint: string, data: any, expectedStatus = 200) {
    const response = await this.request().put(endpoint).send(data);
    expect(response.status).toBe(expectedStatus);
    return response;
  }

  async testDeleteEndpoint(endpoint: string, expectedStatus = 204) {
    const response = await this.request().delete(endpoint);
    expect(response.status).toBe(expectedStatus);
    return response;
  }

  // Pagination testing helper
  async testPaginationEndpoint(endpoint: string, expectedMinItems = 1) {
    // Test default pagination
    const page1 = await this.request().get(endpoint);
    expect(page1.status).toBe(200);
    expect(page1.body.data).toBeInstanceOf(Array);
    expect(page1.body.meta.pagination).toBeDefined();

    // Test with custom pagination
    const page2 = await this.request()
      .get(endpoint)
      .query({ page: 1, limit: 5 });
    expect(page2.status).toBe(200);
    expect(page2.body.meta.pagination.limit).toBe(5);

    return { page1, page2 };
  }

  // Search testing helper
  async testSearchEndpoint(endpoint: string, searchTerm: string) {
    const response = await this.request()
      .get(endpoint)
      .query({ search: searchTerm });
    
    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);
    return response;
  }

  // Filter testing helper
  async testFilterEndpoint(endpoint: string, filters: Record<string, any>) {
    const response = await this.request()
      .get(endpoint)
      .query(filters);
    
    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);
    return response;
  }

  // Performance testing helper
  async testEndpointPerformance(endpoint: string, maxResponseTime = 1000) {
    const startTime = Date.now();
    const response = await this.request().get(endpoint);
    const responseTime = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(maxResponseTime);

    logger.info(`Endpoint ${endpoint} responded in ${responseTime}ms`);
    return { response, responseTime };
  }

  // Validation testing helper
  async testValidationErrors(endpoint: string, method: 'POST' | 'PUT', invalidData: any) {
    const requestFn = method === 'POST' 
      ? this.request().post(endpoint)
      : this.request().put(endpoint);

    const response = await requestFn.send(invalidData);
    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.length).toBeGreaterThan(0);
    return response;
  }

  // Authentication testing helper
  async testUnauthorizedAccess(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET') {
    const req = request(this.app);
    let response;

    switch (method) {
      case 'GET':
        response = await req.get(endpoint);
        break;
      case 'POST':
        response = await req.post(endpoint).send({});
        break;
      case 'PUT':
        response = await req.put(endpoint).send({});
        break;
      case 'DELETE':
        response = await req.delete(endpoint);
        break;
    }

    expect(response.status).toBe(401);
    return response;
  }

  // Rate limiting testing helper
  async testRateLimit(endpoint: string, maxRequests = 100) {
    const requests = [];
    for (let i = 0; i < maxRequests + 10; i++) {
      requests.push(this.request().get(endpoint));
    }

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
    return responses;
  }

  // Database state verification helper
  async verifyDatabaseState(tableName: string, expectedCount: number, whereClause = {}) {
    const count = await (testDb as any)[tableName].count({ where: whereClause });
    expect(count).toBe(expectedCount);
    return count;
  }

  // Cleanup helper
  async cleanup() {
    // This is handled by the main setup.ts beforeEach
    logger.info('Integration test cleanup completed');
  }
}

// Export integration test utilities
export const createIntegrationTestHelper = (app: Express) => {
  return new IntegrationTestHelper(app);
};

// Mock external service responses
export const mockExternalServices = {
  employeeService: {
    getUserById: jest.fn().mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      departmentId: 'test-dept-id',
    }),
    validateUser: jest.fn().mockResolvedValue(true),
  },
  authService: {
    validateToken: jest.fn().mockResolvedValue({
      userId: 'test-user-id',
      role: 'EMPLOYEE',
      permissions: ['learning.read', 'learning.enroll'],
    }),
  },
  notificationService: {
    sendNotification: jest.fn().mockResolvedValue({ success: true }),
  },
};

// Test data constants
export const TEST_DATA = {
  VALID_COURSE: {
    title: 'Valid Test Course',
    description: 'A valid course for testing',
    category: 'TECHNICAL',
    difficulty: 'BEGINNER',
    duration: 120,
    estimatedHours: 2.0,
  },
  INVALID_COURSE: {
    title: '', // Invalid: empty title
    description: 'A'.repeat(2001), // Invalid: too long
    category: 'INVALID_CATEGORY', // Invalid: not in enum
    duration: -1, // Invalid: negative duration
  },
  VALID_USER: {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'EMPLOYEE',
  },
};
