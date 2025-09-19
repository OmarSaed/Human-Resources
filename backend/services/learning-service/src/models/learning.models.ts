/**
 * General learning-related interfaces and models for learning service
 */

export interface LearningMetrics {
  totalCourses: number;
  activeCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completionRate: number;
  averageRating: number;
  totalCertificates: number;
  skillsTracked: number;
  learningHours: number;
}

export interface UserLearningProfile {
  userId: string;
  enrollments: {
    total: number;
    inProgress: number;
    completed: number;
  };
  certificates: number;
  skills: any[];
  learningHours: number;
  averageScore: number;
  streak: number; // Days of continuous learning
  lastActivity: Date;
}

export interface LearningRecommendation {
  type: 'course' | 'skill' | 'learning_path';
  id: string;
  title: string;
  reason: string;
  confidence: number; // 0-1 scale
  estimatedHours: number;
}
