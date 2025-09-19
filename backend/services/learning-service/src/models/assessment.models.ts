/**
 * Assessment-related interfaces and models for learning service
 */

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
    questionText: string;
    correctAnswers: number;
    totalAnswers: number;
    accuracy: number;
  }>;
  scoreDistribution: Record<string, number>;
  difficultyAnalysis: {
    easy: number;
    medium: number;
    hard: number;
  };
}
