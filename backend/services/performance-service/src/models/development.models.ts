/**
 * Development plans and activities related interfaces
 */

export interface DevelopmentPlanData {
  employeeId: string;
  managerId?: string;
  title: string;
  description?: string;
  objectives: string[];
  targetSkills: string[];
  startDate?: Date;
  targetCompletionDate?: Date;
  budget?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  reviewSchedule?: string;
}

export interface DevelopmentActivityData {
  planId: string;
  title: string;
  description?: string;
  type: 'TRAINING' | 'MENTORING' | 'PROJECT' | 'READING' | 'CONFERENCE' | 'CERTIFICATION' | 'COACHING' | 'OTHER';
  provider?: string;
  duration?: number;
  cost?: number;
  startDate?: Date;
  endDate?: Date;
  status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface ListDevelopmentPlansOptions {
  employeeId?: string;
  managerId?: string;
  status?: string;
  priority?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface DevelopmentPlanStatistics {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  averageCompletionTime: number;
  plansByStatus: Record<string, number>;
  plansByPriority: Record<string, number>;
  budgetUtilization: {
    totalBudget: number;
    usedBudget: number;
    utilizationRate: number;
  };
  skillDevelopmentTrends: Array<{
    skill: string;
    planCount: number;
    completionRate: number;
  }>;
}
