/**
 * Learning Path-related interfaces and models for learning service
 */

export interface CreateLearningPathData {
  title: string;
  description?: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedDuration: number; // in hours
  prerequisites?: string[];
  courseIds: string[];
  skillIds?: string[];
  objectives?: string[];
  isActive?: boolean;
  createdBy: string;
}

export interface UpdateLearningPathData {
  title?: string;
  description?: string;
  category?: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedDuration?: number;
  prerequisites?: string[];
  courseIds?: string[];
  skillIds?: string[];
  objectives?: string[];
  isActive?: boolean;
  updatedBy: string;
}

export interface LearningPathFilters {
  category?: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  isActive?: boolean;
  search?: string;
}

export interface LearningPathProgress {
  pathId: string;
  employeeId: string;
  totalCourses: number;
  completedCourses: number;
  progressPercentage: number;
  currentCourseId?: string;
  estimatedCompletionDate?: Date;
  startedAt: Date;
  lastActivity?: Date;
}

export interface LearningPathAnalytics {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  averageCompletionTime: number;
  completionRate: number;
  popularPaths: Array<{
    pathId: string;
    pathTitle: string;
    enrollments: number;
    completionRate: number;
  }>;
  skillsAcquired: Array<{
    skill: string;
    count: number;
  }>;
}

export interface LearningPathRecommendation {
  path: any; // LearningPath from Prisma
  score: number;
  reasons: string[];
  matchingSkills: string[];
  difficulty: 'EASY' | 'MODERATE' | 'CHALLENGING';
}
