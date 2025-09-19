/**
 * Goals and objectives related interfaces
 */

export interface GoalData {
  title: string;
  description?: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  startDate?: Date;
  targetDate: Date;
  employeeId: string;
  managerId?: string;
  keyResults?: KeyResult[];
}

export interface KeyResult {
  title: string;
  description?: string;
  targetValue: number;
  currentValue?: number;
  unit: string;
  weight?: number;
}

export interface GoalProgress {
  progressPercentage: number;
  currentValue?: number;
  lastUpdated: Date;
  notes?: string;
}

export interface GoalComment {
  comment: string;
  authorId: string;
  visibility?: 'PRIVATE' | 'MANAGER' | 'TEAM' | 'PUBLIC';
}

export interface ListGoalsOptions {
  employeeId?: string;
  managerId?: string;
  category?: string;
  priority?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface GoalStatistics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  overdueGoals: number;
  averageProgress: number;
  goalsByPriority: Record<string, number>;
  goalsByCategory: Record<string, number>;
  recentActivity: Array<{
    goalId: string;
    goalTitle: string;
    activity: string;
    timestamp: Date;
  }>;
}
