/**
 * Progress-related interfaces and models for learning service
 */

export interface LearningProgress {
  enrollmentId: string;
  courseId: string;
  employeeId: string;
  progressPercentage: number;
  timeSpent: number; // in minutes
  currentChapter?: string;
  currentLesson?: string;
  lastAccessedAt: Date;
  estimatedTimeRemaining: number; // in minutes
  milestones: ProgressMilestone[];
}

export interface ProgressMilestone {
  id: string;
  title: string;
  description?: string;
  targetPercentage: number;
  achievedAt?: Date;
  isCompleted: boolean;
}

export interface ProgressSummary {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalTimeSpent: number;
  averageProgress: number;
  certificatesEarned: number;
  skillsAcquired: string[];
  recentActivity: Array<{
    courseTitle: string;
    activity: string;
    timestamp: Date;
  }>;
}

export interface ProgressAnalytics {
  dailyProgress: Array<{
    date: string;
    timeSpent: number;
    progressGained: number;
  }>;
  weeklyStats: {
    coursesStarted: number;
    coursesCompleted: number;
    totalTimeSpent: number;
    averageSessionLength: number;
  };
  monthlyTrends: {
    completionRate: number;
    engagementScore: number;
    learningVelocity: number;
  };
  trends: {
    progressTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    engagementScore: number;
    consistencyScore: number;
  };
}
