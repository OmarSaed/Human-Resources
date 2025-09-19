import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('assessment-service');

export interface AssessmentData {
  moduleId?: string;
  courseId?: string;
  title: string;
  description?: string;
  type: 'QUIZ' | 'EXAM' | 'ASSIGNMENT' | 'PROJECT' | 'PRACTICAL' | 'SURVEY';
  questions: any[];
  timeLimit?: number;
  attempts?: number;
  passingScore?: number;
  randomizeQuestions?: boolean;
  randomizeAnswers?: boolean;
  questionPool?: number;
  availableFrom?: Date;
  availableUntil?: Date;
  createdBy: string;
}

export interface ListAssessmentsOptions {
  moduleId?: string;
  courseId?: string;
  type?: string;
  isPublished?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface AssessmentAttemptOptions {
  enrollmentId?: string;
  status?: string;
  page: number;
  limit: number;
  requestingUserId: string;
}

export interface AssessmentAnalytics {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  passRate: number;
  averageTimeSpent: number;
  questionAnalytics: Array<{
    questionId: string;
    correctAnswers: number;
    totalAnswers: number;
    difficulty: number;
  }>;
  scoreDistribution: Record<string, number>;
}

export class AssessmentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new assessment
   */
  async createAssessment(data: AssessmentData): Promise<any> {
    try {
      // Validate module or course exists
      if (data.moduleId) {
        const module = await this.prisma.courseModule.findUnique({
          where: { id: data.moduleId },
        });
        if (!module) {
          throw new Error('Module not found');
        }
      }

      if (data.courseId) {
        const course = await this.prisma.course.findUnique({
          where: { id: data.courseId },
        });
        if (!course) {
          throw new Error('Course not found');
        }
      }

      const assessment = await this.prisma.assessment.create({
        data: {
          moduleId: data.moduleId,
          courseId: data.courseId,
          title: data.title,
          description: data.description,
          type: data.type,
          questions: data.questions,
          timeLimit: data.timeLimit,
          attempts: data.attempts || 3,
          passingScore: data.passingScore || 70,
          randomizeQuestions: data.randomizeQuestions || false,
          randomizeAnswers: data.randomizeAnswers || false,
          questionPool: data.questionPool,
          availableFrom: data.availableFrom,
          availableUntil: data.availableUntil,
          isPublished: false,
        },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              courseId: true,
            },
          },
          _count: {
            select: {
              // attempts: true, // No attempts count in current schema
            },
          },
        },
      });

      logger.info('Assessment created successfully', {
        assessmentId: assessment.id,
        title: assessment.title,
        type: assessment.type,
        moduleId: data.moduleId,
        courseId: data.courseId,
      });

      return assessment;
    } catch (error) {
      logger.error('Failed to create assessment', error as Error);
      throw error;
    }
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(assessmentId: string, requestingUserId: string): Promise<any | null> {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              courseId: true,
              course: {
                select: {
                  id: true,
                  title: true,
                  instructorId: true,
                  authorId: true,
                },
              },
            },
          },
          _count: {
            select: {
              // attempts: true, // No attempts count in current schema
            },
          },
        },
      });

      if (!assessment) {
        return null;
      }

      // Check access permissions
      const hasAccess = await this.checkAssessmentAccess(assessment, requestingUserId);
      if (!hasAccess) {
        return null;
      }

      return assessment;
    } catch (error) {
      logger.error('Failed to get assessment', error as Error);
      throw error;
    }
  }

  /**
   * Update assessment
   */
  async updateAssessment(
    assessmentId: string, 
    updates: Partial<AssessmentData>, 
    requestingUserId: string
  ): Promise<any> {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          module: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      const canEdit = await this.checkEditPermission(assessment, requestingUserId);
      if (!canEdit) {
        throw new Error('You do not have permission to edit this assessment');
      }

      // Check if assessment has attempts - restrict certain updates
      const attemptCount = await this.prisma.assessmentAttempt.count({
        where: { assessmentId },
      });

      if (attemptCount > 0 && (updates.questions || updates.passingScore)) {
        throw new Error('Cannot modify questions or passing score for assessment with existing attempts');
      }

      const updatedAssessment = await this.prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              courseId: true,
            },
          },
          _count: {
            select: {
              // attempts: true, // No attempts count in current schema
            },
          },
        },
      });

      logger.info('Assessment updated successfully', {
        assessmentId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedAssessment;
    } catch (error) {
      logger.error('Failed to update assessment', error as Error);
      throw error;
    }
  }

  /**
   * Delete assessment
   */
  async deleteAssessment(assessmentId: string, requestingUserId: string): Promise<void> {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          module: {
            include: {
              course: true,
            },
          },
          // attempts: true, // No attempts relation in current schema
        },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      const canDelete = await this.checkEditPermission(assessment, requestingUserId);
      if (!canDelete) {
        throw new Error('You do not have permission to delete this assessment');
      }

      // Check if assessment has attempts
      const attemptCount = await this.prisma.assessmentAttempt.count({
        where: { assessmentId },
      });
      
      if (attemptCount > 0) {
        throw new Error('Cannot delete assessment with existing attempts. Archive it instead.');
      }

      await this.prisma.assessment.delete({
        where: { id: assessmentId },
      });

      logger.info('Assessment deleted successfully', { assessmentId, requestingUserId });
    } catch (error) {
      logger.error('Failed to delete assessment', error as Error);
      throw error;
    }
  }

  /**
   * List assessments with filtering and pagination
   */
  async listAssessments(options: ListAssessmentsOptions): Promise<{
    assessments: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        moduleId,
        courseId,
        type,
        isPublished,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (moduleId) where.moduleId = moduleId;
      if (courseId) where.courseId = courseId;
      if (type) where.type = type;
      if (isPublished !== undefined) where.isPublished = isPublished;

      const [assessments, total] = await Promise.all([
        this.prisma.assessment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            module: {
              select: {
                id: true,
                title: true,
                courseId: true,
              },
            },
            _count: {
              select: {
                // attempts: true, // No attempts count in current schema
              },
            },
          },
        }),
        this.prisma.assessment.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        assessments,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list assessments', error as Error);
      throw error;
    }
  }

  /**
   * Publish assessment
   */
  async publishAssessment(assessmentId: string, requestingUserId: string): Promise<any> {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          module: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      const canPublish = await this.checkEditPermission(assessment, requestingUserId);
      if (!canPublish) {
        throw new Error('You do not have permission to publish this assessment');
      }

      // Validate assessment before publishing
      const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
      if (!assessment.questions || questions.length === 0) {
        throw new Error('Assessment must have at least one question to be published');
      }

      const updatedAssessment = await this.prisma.assessment.update({
        where: { id: assessmentId },
        data: {
          isPublished: true,
          updatedAt: new Date(),
        },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              courseId: true,
            },
          },
          _count: {
            select: {
              assessmentAttempts: true, // No attempts count in current schema
            },
          },
        },
      });

      logger.info('Assessment published', { assessmentId, requestingUserId });

      return updatedAssessment;
    } catch (error) {
      logger.error('Failed to publish assessment', error as Error);
      throw error;
    }
  }

  /**
   * Start assessment attempt
   */
  async startAttempt(assessmentId: string, enrollmentId: string, userId: string): Promise<any> {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      if (!assessment.isPublished) {
        throw new Error('Assessment is not published');
      }

      // Check if assessment is available
      const now = new Date();
      if (assessment.availableFrom && now < assessment.availableFrom) {
        throw new Error('Assessment is not yet available');
      }
      if (assessment.availableUntil && now > assessment.availableUntil) {
        throw new Error('Assessment is no longer available');
      }

      // Check enrollment
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { id: enrollmentId },
      });

      if (!enrollment || enrollment.userId !== userId) {
        throw new Error('Invalid enrollment');
      }

      // Check attempt limit
      const existingAttempts = await this.prisma.assessmentAttempt.count({
        where: { assessmentId, enrollmentId },
      });

      if (existingAttempts >= assessment.attempts) {
        throw new Error('Maximum attempts reached');
      }

      const attempt = await this.prisma.assessmentAttempt.create({
        data: {
          enrollmentId,
          assessmentId,
          attemptNumber: existingAttempts + 1,
          status: 'IN_PROGRESS',
          responses: {},
        },
        include: {
          assessment: {
            select: {
              id: true,
              title: true,
              type: true,
              timeLimit: true,
              questions: true,
              randomizeQuestions: true,
              randomizeAnswers: true,
              questionPool: true,
            },
          },
          enrollment: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      logger.info('Assessment attempt started', {
        assessmentId,
        attemptId: attempt.id,
        enrollmentId,
        userId,
      });

      return attempt;
    } catch (error) {
      logger.error('Failed to start assessment attempt', error as Error);
      throw error;
    }
  }

  /**
   * Submit assessment attempt
   */
  async submitAttempt(attemptId: string, responses: any, userId: string): Promise<any> {
    try {
      const attempt = await this.prisma.assessmentAttempt.findUnique({
        where: { id: attemptId },
        include: {
          assessment: true,
          enrollment: true,
        },
      });

      if (!attempt) {
        throw new Error('Attempt not found');
      }

      if (attempt.enrollment.userId !== userId) {
        throw new Error('You do not have permission to submit this attempt');
      }

      if (attempt.status !== 'IN_PROGRESS') {
        throw new Error('Attempt is not in progress');
      }

      // Calculate score
      const questions = Array.isArray(attempt.assessment.questions) ? attempt.assessment.questions : [];
      const { score, feedback } = this.calculateScore(questions, responses);

      const passed = score >= attempt.assessment.passingScore;

      const updatedAttempt = await this.prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'COMPLETED',
          responses,
          score,
          passed,
          feedback,
          submittedAt: new Date(),
          timeSpent: Math.floor((new Date().getTime() - attempt.startedAt.getTime()) / 1000),
        },
        include: {
          assessment: {
            select: {
              id: true,
              title: true,
              type: true,
              passingScore: true,
            },
          },
          enrollment: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      logger.info('Assessment attempt submitted', {
        attemptId,
        score,
        passed,
        userId,
      });

      return updatedAttempt;
    } catch (error) {
      logger.error('Failed to submit assessment attempt', error as Error);
      throw error;
    }
  }

  /**
   * Get assessment attempts
   */
  async getAssessmentAttempts(
    assessmentId: string,
    options: AssessmentAttemptOptions
  ): Promise<{
    attempts: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { enrollmentId, status, page, limit } = options;
      const skip = (page - 1) * limit;

      const where: any = { assessmentId };
      if (enrollmentId) where.enrollmentId = enrollmentId;
      if (status) where.status = status;

      const [attempts, total] = await Promise.all([
        this.prisma.assessmentAttempt.findMany({
          where,
          skip,
          take: limit,
          orderBy: { startedAt: 'desc' },
          include: {
            enrollment: {
              select: {
                id: true,
                userId: true,
              },
            },
            assessment: {
              select: {
                id: true,
                title: true,
                type: true,
                passingScore: true,
              },
            },
          },
        }),
        this.prisma.assessmentAttempt.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        attempts,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to get assessment attempts', error as Error);
      throw error;
    }
  }

  /**
   * Get attempt details
   */
  async getAttemptDetails(attemptId: string, requestingUserId: string): Promise<any | null> {
    try {
      const attempt = await this.prisma.assessmentAttempt.findUnique({
        where: { id: attemptId },
        include: {
          assessment: {
            include: {
              module: {
                include: {
                  course: true,
                },
              },
            },
          },
          enrollment: true,
        },
      });

      if (!attempt) {
        return null;
      }

      // Check access permissions
      const hasAccess = 
        attempt.enrollment.userId === requestingUserId ||
        attempt.assessment.module?.course?.instructorId === requestingUserId ||
        attempt.assessment.module?.course?.authorId === requestingUserId;

      if (!hasAccess) {
        return null;
      }

      return attempt;
    } catch (error) {
      logger.error('Failed to get attempt details', error as Error);
      throw error;
    }
  }

  /**
   * Get assessment analytics
   */
  async getAssessmentAnalytics(assessmentId: string, requestingUserId: string): Promise<AssessmentAnalytics> {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          module: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      const canView = await this.checkEditPermission(assessment, requestingUserId);
      if (!canView) {
        throw new Error('You do not have permission to view analytics for this assessment');
      }

      const [
        totalAttempts,
        completedAttempts,
        allAttempts,
      ] = await Promise.all([
        this.prisma.assessmentAttempt.count({ where: { assessmentId } }),
        this.prisma.assessmentAttempt.count({ where: { assessmentId, status: 'COMPLETED' } }),
        this.prisma.assessmentAttempt.findMany({
          where: { assessmentId, status: 'COMPLETED' },
          select: {
            score: true,
            timeSpent: true,
            passed: true,
          },
        }),
      ]);

      const scores = allAttempts.map(attempt => attempt.score || 0);
      const timeSpents = allAttempts.map(attempt => attempt.timeSpent || 0);
      const passedCount = allAttempts.filter(attempt => attempt.passed).length;

      const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      const passRate = completedAttempts > 0 ? (passedCount / completedAttempts) * 100 : 0;
      const averageTimeSpent = timeSpents.length > 0 ? timeSpents.reduce((sum, time) => sum + time, 0) / timeSpents.length : 0;

      // Score distribution
      const scoreDistribution: Record<string, number> = {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0,
      };

      scores.forEach(score => {
        if (score <= 20) scoreDistribution['0-20']++;
        else if (score <= 40) scoreDistribution['21-40']++;
        else if (score <= 60) scoreDistribution['41-60']++;
        else if (score <= 80) scoreDistribution['61-80']++;
        else scoreDistribution['81-100']++;
      });

      // Question analytics (simplified)
      const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
      const questionAnalytics = questions.map((question: any, index: number) => ({
        questionId: question.id || `question-${index}`,
        correctAnswers: 0, // This would require detailed response analysis
        totalAnswers: completedAttempts,
        difficulty: 0.5, // This would be calculated based on success rate
      }));

      return {
        totalAttempts,
        completedAttempts,
        averageScore,
        passRate,
        averageTimeSpent,
        questionAnalytics,
        scoreDistribution,
      };
    } catch (error) {
      logger.error('Failed to get assessment analytics', error as Error);
      throw error;
    }
  }

  /**
   * Grade assessment manually
   */
  async gradeAssessment(
    attemptId: string,
    grading: { score: number; feedback?: any; gradedBy: string }
  ): Promise<any> {
    try {
      const attempt = await this.prisma.assessmentAttempt.findUnique({
        where: { id: attemptId },
        include: {
          assessment: true,
        },
      });

      if (!attempt) {
        throw new Error('Attempt not found');
      }

      if (attempt.status !== 'COMPLETED') {
        throw new Error('Can only grade completed attempts');
      }

      const passed = grading.score >= attempt.assessment.passingScore;

      const updatedAttempt = await this.prisma.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          score: grading.score,
          passed,
          feedback: grading.feedback,
          updatedAt: new Date(),
        },
        include: {
          assessment: {
            select: {
              id: true,
              title: true,
              type: true,
              passingScore: true,
            },
          },
          enrollment: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      logger.info('Assessment graded manually', {
        attemptId,
        score: grading.score,
        gradedBy: grading.gradedBy,
      });

      return updatedAttempt;
    } catch (error) {
      logger.error('Failed to grade assessment', error as Error);
      throw error;
    }
  }

  /**
   * Preview assessment for instructors
   */
  async previewAssessment(assessmentId: string, requestingUserId: string): Promise<any> {
    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          module: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!assessment) {
        throw new Error('Assessment not found');
      }

      const canPreview = await this.checkEditPermission(assessment, requestingUserId);
      if (!canPreview) {
        throw new Error('You do not have permission to preview this assessment');
      }

      return assessment;
    } catch (error) {
      logger.error('Failed to preview assessment', error as Error);
      throw error;
    }
  }

  /**
   * Check if user has access to assessment
   */
  private async checkAssessmentAccess(assessment: any, userId: string): Promise<boolean> {
    // Students can access published assessments in courses they're enrolled in
    if (assessment.isPublished) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId,
          courseId: assessment.module?.courseId || assessment.courseId,
        },
      });
      if (enrollment) return true;
    }

    // Instructors and authors can access their assessments
    return this.checkEditPermission(assessment, userId);
  }

  /**
   * Check if user can edit assessment
   */
  private async checkEditPermission(assessment: any, userId: string): Promise<boolean> {
    return (
      assessment.module?.course?.instructorId === userId ||
      assessment.module?.course?.authorId === userId
    );
  }

  /**
   * Calculate assessment score
   */
  private calculateScore(questions: any[], responses: any): { score: number; feedback: any } {
    if (!questions || questions.length === 0) {
      return { score: 0, feedback: {} };
    }

    let correctAnswers = 0;
    const feedback: any = {};

    questions.forEach((question, index) => {
      const questionId = question.id || `question-${index}`;
      const userResponse = responses[questionId];
      
      // Simple scoring logic - this would be more complex in real implementation
      if (question.type === 'multiple_choice') {
        if (userResponse === question.correctAnswer) {
          correctAnswers++;
          feedback[questionId] = { correct: true };
        } else {
          feedback[questionId] = { 
            correct: false, 
            correctAnswer: question.correctAnswer 
          };
        }
      }
      // Add more question types as needed
    });

    const score = Math.round((correctAnswers / questions.length) * 100);
    return { score, feedback };
  }
}
