/**
 * Analytics-related interfaces and models for learning service
 */

export interface LearningAnalytics {
  overview: {
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    averageCompletionRate: number;
    totalTimeSpent: number;
    averageTimePerCourse: number;
  };
  trends: {
    enrollmentsByMonth: Array<{
      month: string;
      enrollments: number;
      completions: number;
    }>;
    timeSpentByMonth: Array<{
      month: string;
      totalTime: number;
      averageTime: number;
    }>;
    popularCourses: Array<{
      courseId: string;
      courseTitle: string;
      enrollments: number;
      completionRate: number;
      averageRating: number;
    }>;
  };
  performance: {
    topPerformers: Array<{
      employeeId: string;
      employeeName?: string;
      coursesCompleted: number;
      totalTimeSpent: number;
      averageScore: number;
    }>;
    skillsAcquired: Array<{
      skill: string;
      count: number;
      averageTime: number;
    }>;
    certificatesEarned: Array<{
      certificateType: string;
      count: number;
      averageTime: number;
    }>;
  };
  engagement: {
    dailyActiveUsers: Array<{
      date: string;
      activeUsers: number;
      sessionsCount: number;
      averageSessionLength: number;
    }>;
    retentionRates: {
      week1: number;
      week2: number;
      month1: number;
      month3: number;
    };
    dropoffAnalysis: Array<{
      courseId: string;
      courseTitle: string;
      enrollments: number;
      dropoffRate: number;
      commonDropoffPoint: string;
    }>;
  };
}

export interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  overview: {
    totalEnrollments: number;
    completions: number;
    completionRate: number;
    averageTimeToComplete: number;
    averageRating: number;
    totalTimeSpent: number;
  };
  progress: {
    progressDistribution: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    averageProgressByWeek: Array<{
      week: number;
      averageProgress: number;
      enrollmentCount: number;
    }>;
  };
  engagement: {
    dailyActivity: Array<{
      date: string;
      activeUsers: number;
      totalTimeSpent: number;
    }>;
    chapterCompletionRates: Array<{
      chapter: string;
      completionRate: number;
      averageTimeSpent: number;
    }>;
  };
  feedback: {
    ratingDistribution: Array<{
      rating: number;
      count: number;
    }>;
    averageRating: number;
    totalReviews: number;
    commonFeedback: Array<{
      category: string;
      mentions: number;
    }>;
  };
}

export interface EmployeeAnalytics {
  employeeId: string;
  overview: {
    totalEnrollments: number;
    completedCourses: number;
    inProgressCourses: number;
    totalTimeSpent: number;
    averageScore: number;
    certificatesEarned: number;
  };
  learning: {
    monthlyProgress: Array<{
      month: string;
      coursesStarted: number;
      coursesCompleted: number;
      timeSpent: number;
    }>;
    skillsDeveloped: Array<{
      skill: string;
      proficiencyLevel: string;
      coursesCompleted: number;
      timeInvested: number;
    }>;
    learningPaths: Array<{
      pathId: string;
      pathTitle: string;
      progress: number;
      estimatedCompletion: Date;
    }>;
  };
  performance: {
    averageScores: Array<{
      courseId: string;
      courseTitle: string;
      score: number;
      completedAt: Date;
    }>;
    streaks: {
      currentStreak: number;
      longestStreak: number;
      lastActivity: Date;
    };
    goals: Array<{
      goalId: string;
      description: string;
      targetDate: Date;
      progress: number;
    }>;
  };
}
