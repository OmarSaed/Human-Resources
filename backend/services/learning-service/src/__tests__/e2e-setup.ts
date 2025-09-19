import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { IntegrationTestHelper } from './integration-setup';
import { testDb } from './setup';

const logger = createLogger('e2e-test-setup');

// E2E Test Scenarios Helper
export class E2ETestHelper extends IntegrationTestHelper {
  constructor(app: Express) {
    super(app);
  }

  // Complete course creation and enrollment workflow
  async testCourseCreationWorkflow() {
    logger.info('Starting course creation workflow test');

    // Step 1: Authenticate as instructor/admin
    await this.authenticate();

    // Step 2: Create a course
    const courseResponse = await this.testPostEndpoint('/api/v1/courses', {
      title: 'E2E Test Course',
      description: 'Course created for E2E testing workflow',
      category: 'TECHNICAL',
      difficulty: 'BEGINNER',
      duration: 180,
      estimatedHours: 3.0,
      language: 'en',
      tags: ['e2e', 'testing', 'workflow'],
      learningObjectives: [
        'Understand E2E testing',
        'Complete workflow validation',
      ],
    });

    const course = courseResponse.body.data;
    expect(course.id).toBeDefined();

    // Step 3: Add modules to the course
    const moduleResponse = await this.testPostEndpoint(`/api/v1/courses/${course.id}/modules`, {
      title: 'Introduction Module',
      description: 'First module of the course',
      order: 1,
      duration: 60,
      content: { type: 'text', body: 'Introduction content' },
    });

    const module = moduleResponse.body.data;

    // Step 4: Add lessons to the module
    const lessonResponse = await this.testPostEndpoint(`/api/v1/modules/${module.id}/lessons`, {
      title: 'First Lesson',
      description: 'Introduction lesson',
      order: 1,
      duration: 30,
      type: 'VIDEO',
      content: { videoUrl: 'https://example.com/intro-video.mp4' },
    });

    const lesson = lessonResponse.body.data;

    // Step 5: Add assessment
    const assessmentResponse = await this.testPostEndpoint(`/api/v1/modules/${module.id}/assessments`, {
      title: 'Module Assessment',
      description: 'Test your knowledge',
      type: 'QUIZ',
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: 'What is E2E testing?',
          options: ['End-to-End testing', 'Error testing', 'Endpoint testing', 'None'],
          correctAnswer: 0,
          points: 10,
        },
      ],
      timeLimit: 30,
      passingScore: 70,
    });

    // Step 6: Publish the course
    await this.testPostEndpoint(`/api/v1/courses/${course.id}/publish`, {});

    // Step 7: Verify course is published
    const publishedCourse = await this.testGetEndpoint(`/api/v1/courses/${course.id}`);
    expect(publishedCourse.body.data.status).toBe('PUBLISHED');
    expect(publishedCourse.body.data.isPublished).toBe(true);

    logger.info('Course creation workflow test completed successfully');
    return { course, module, lesson, assessment: assessmentResponse.body.data };
  }

  // Complete learning workflow from enrollment to completion
  async testLearningWorkflow() {
    logger.info('Starting learning workflow test');

    // Create a course first
    const { course, module, lesson, assessment } = await this.testCourseCreationWorkflow();

    // Step 1: Authenticate as learner
    await this.authenticate({ email: 'learner@example.com', password: 'learnerpass123' });

    // Step 2: Browse available courses
    const coursesResponse = await this.testGetEndpoint('/api/v1/courses');
    expect(coursesResponse.body.data.length).toBeGreaterThan(0);

    // Step 3: Enroll in the course
    const enrollmentResponse = await this.testPostEndpoint(`/api/v1/courses/${course.id}/enroll`, {});
    const enrollment = enrollmentResponse.body.data;
    expect(enrollment.status).toBe('ENROLLED');

    // Step 4: Start learning - access first lesson
    const lessonAccessResponse = await this.testGetEndpoint(`/api/v1/lessons/${lesson.id}`);
    expect(lessonAccessResponse.status).toBe(200);

    // Step 5: Track progress - mark lesson as started
    await this.testPostEndpoint(`/api/v1/progress/lessons/${lesson.id}/start`, {});

    // Step 6: Complete the lesson
    const progressResponse = await this.testPostEndpoint(`/api/v1/progress/lessons/${lesson.id}/complete`, {
      timeSpent: 1800, // 30 minutes
      watchTime: 1800,
    });

    // Step 7: Take the assessment
    const attemptResponse = await this.testPostEndpoint(`/api/v1/assessments/${assessment.id}/attempt`, {});
    const attempt = attemptResponse.body.data;

    // Step 8: Submit assessment answers
    const submissionResponse = await this.testPostEndpoint(`/api/v1/assessments/attempts/${attempt.id}/submit`, {
      responses: [
        {
          questionId: 'q1',
          selectedAnswer: 0, // Correct answer
        },
      ],
    });

    expect(submissionResponse.body.data.score).toBeGreaterThanOrEqual(70);
    expect(submissionResponse.body.data.passed).toBe(true);

    // Step 9: Verify course completion
    const completionResponse = await this.testGetEndpoint(`/api/v1/enrollments/${enrollment.id}`);
    expect(completionResponse.body.data.status).toBe('COMPLETED');
    expect(completionResponse.body.data.progress).toBe(100);

    // Step 10: Check if certificate is generated
    const certificateResponse = await this.testGetEndpoint(`/api/v1/enrollments/${enrollment.id}/certificate`);
    expect(certificateResponse.status).toBe(200);
    expect(certificateResponse.body.data.certificateNumber).toBeDefined();

    logger.info('Learning workflow test completed successfully');
    return { enrollment, attempt: submissionResponse.body.data, certificate: certificateResponse.body.data };
  }

  // Learning path workflow
  async testLearningPathWorkflow() {
    logger.info('Starting learning path workflow test');

    // Step 1: Create multiple courses
    const course1 = await this.createTestCourse({ title: 'Path Course 1', order: 1 });
    const course2 = await this.createTestCourse({ title: 'Path Course 2', order: 2 });

    // Step 2: Create learning path
    const pathResponse = await this.testPostEndpoint('/api/v1/learning-paths', {
      title: 'E2E Learning Path',
      description: 'Complete learning path for E2E testing',
      difficulty: 'INTERMEDIATE',
      estimatedHours: 6.0,
      category: 'TECHNICAL',
      courses: [
        { courseId: course1.course.id, order: 1, isRequired: true },
        { courseId: course2.course.id, order: 2, isRequired: false },
      ],
    });

    const learningPath = pathResponse.body.data;

    // Step 3: Enroll in learning path
    const pathEnrollmentResponse = await this.testPostEndpoint(`/api/v1/learning-paths/${learningPath.id}/enroll`, {});
    const pathEnrollment = pathEnrollmentResponse.body.data;

    // Step 4: Complete first course
    await this.testPostEndpoint(`/api/v1/courses/${course1.course.id}/enroll`, {});
    // ... complete course workflow ...

    // Step 5: Progress to second course
    const progressResponse = await this.testGetEndpoint(`/api/v1/learning-paths/${learningPath.id}/progress`);
    expect(progressResponse.body.data.currentCourseId).toBe(course2.course.id);

    logger.info('Learning path workflow test completed successfully');
    return { learningPath, pathEnrollment };
  }

  // Instructor workflow
  async testInstructorWorkflow() {
    logger.info('Starting instructor workflow test');

    // Step 1: Authenticate as instructor
    await this.authenticate({ email: 'instructor@example.com', password: 'testpass123' });

    // Step 2: Create course content
    const { course } = await this.testCourseCreationWorkflow();

    // Step 3: Monitor learner progress
    const progressResponse = await this.testGetEndpoint(`/api/v1/courses/${course.id}/analytics`);
    expect(progressResponse.status).toBe(200);

    // Step 4: View course statistics
    const statsResponse = await this.testGetEndpoint(`/api/v1/courses/${course.id}/statistics`);
    expect(statsResponse.status).toBe(200);

    // Step 5: Generate reports
    const reportResponse = await this.testPostEndpoint('/api/v1/reports/generate', {
      type: 'course_completion',
      courseId: course.id,
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(),
      },
    });

    expect(reportResponse.status).toBe(201);

    logger.info('Instructor workflow test completed successfully');
    return { course };
  }

  // Manager workflow
  async testManagerWorkflow() {
    logger.info('Starting manager workflow test');

    // Step 1: Authenticate as manager
    await this.authenticate({ email: 'manager@example.com', password: 'testpass123' });

    // Step 2: View team learning progress
    const teamProgressResponse = await this.testGetEndpoint('/api/v1/analytics/team-progress');
    expect(teamProgressResponse.status).toBe(200);

    // Step 3: Assign mandatory training
    const assignmentResponse = await this.testPostEndpoint('/api/v1/assignments/bulk', {
      userIds: ['employee1', 'employee2'],
      courseIds: ['course1', 'course2'],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isRequired: true,
    });

    expect(assignmentResponse.status).toBe(201);

    // Step 4: View compliance dashboard
    const complianceResponse = await this.testGetEndpoint('/api/v1/analytics/compliance');
    expect(complianceResponse.status).toBe(200);

    logger.info('Manager workflow test completed successfully');
    return { teamProgress: teamProgressResponse.body.data };
  }

  // Performance and stress testing
  async testSystemPerformance() {
    logger.info('Starting system performance test');

    // Test concurrent enrollments
    const concurrentRequests = 50;
    const { course } = await this.testCourseCreationWorkflow();

    const enrollmentPromises = Array.from({ length: concurrentRequests }, (_, i) => 
      this.testPostEndpoint(`/api/v1/courses/${course.id}/enroll`, {}, 201)
    );

    const startTime = Date.now();
    const results = await Promise.allSettled(enrollmentPromises);
    const duration = Date.now() - startTime;

    const successfulEnrollments = results.filter(r => r.status === 'fulfilled').length;
    
    logger.info(`Processed ${successfulEnrollments}/${concurrentRequests} enrollments in ${duration}ms`);
    expect(successfulEnrollments).toBeGreaterThan(concurrentRequests * 0.8); // 80% success rate
    expect(duration).toBeLessThan(10000); // Under 10 seconds

    return { successfulEnrollments, duration, totalRequests: concurrentRequests };
  }

  // Data consistency test
  async testDataConsistency() {
    logger.info('Starting data consistency test');

    const { course } = await this.testCourseCreationWorkflow();
    const { enrollment } = await this.testLearningWorkflow();

    // Verify database consistency
    const dbCourse = await testDb.course.findUnique({
      where: { id: course.id },
      include: {
        modules: {
          include: {
            lessons: true,
            assessments: true,
          },
        },
        enrollments: true,
      },
    });

    expect(dbCourse).toBeDefined();
    expect(dbCourse!.modules.length).toBeGreaterThan(0);
    expect(dbCourse!.enrollments.length).toBeGreaterThan(0);

    // Verify API consistency
    const apiCourse = await this.testGetEndpoint(`/api/v1/courses/${course.id}`);
    expect(apiCourse.body.data.id).toBe(dbCourse!.id);
    expect(apiCourse.body.data.totalEnrollments).toBe(dbCourse!.enrollments.length);

    logger.info('Data consistency test completed successfully');
    return { dbCourse, apiCourse: apiCourse.body.data };
  }

  // Security testing
  async testSecurity() {
    logger.info('Starting security test');

    // Test unauthorized access
    await this.testUnauthorizedAccess('/api/v1/courses', 'GET');
    await this.testUnauthorizedAccess('/api/v1/courses', 'POST');

    // Test role-based access
    await this.authenticate();
    
    // Employee should not be able to create courses
    const unauthorizedCreateResponse = await this.request()
      .post('/api/v1/courses')
      .send({ title: 'Unauthorized Course' });
    expect(unauthorizedCreateResponse.status).toBe(403);

    // Test SQL injection prevention
    const maliciousResponse = await this.request()
      .get('/api/v1/courses')
      .query({ search: "'; DROP TABLE courses; --" });
    expect(maliciousResponse.status).toBe(200); // Should not crash

    logger.info('Security test completed successfully');
  }
}

// Export E2E test utilities
export const createE2ETestHelper = (app: Express) => {
  return new E2ETestHelper(app);
};

// E2E test scenarios
export const E2E_SCENARIOS = {
  COMPLETE_LEARNING_JOURNEY: 'complete_learning_journey',
  INSTRUCTOR_COURSE_MANAGEMENT: 'instructor_course_management',
  MANAGER_TEAM_OVERSIGHT: 'manager_team_oversight',
  PERFORMANCE_UNDER_LOAD: 'performance_under_load',
  DATA_CONSISTENCY: 'data_consistency',
  SECURITY_VALIDATION: 'security_validation',
};
