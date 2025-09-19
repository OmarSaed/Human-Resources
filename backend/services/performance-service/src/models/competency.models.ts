/**
 * Competency assessment and framework related interfaces
 */

export interface CompetencyAssessmentData {
  competencyId: string;
  assesseeId: string;
  assessorId: string;
  assessmentType?: 'SELF' | 'MANAGER' | 'PEER' | '360_DEGREE' | 'PERFORMANCE_REVIEW';
  assessmentDate?: Date;
  dueDate?: Date;
  notes?: string;
}

export interface ListAssessmentsOptions {
  competencyId?: string;
  assesseeId?: string;
  assessorId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface GetUserAssessmentsOptions {
  competencyId?: string;
  status?: string;
  frameworkId?: string;
  includeHistory: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface AssessmentSubmissionData {
  score: number;
  evidenceNotes?: string;
  feedback?: string;
  submittedBy: string;
}

export interface AssessmentAnalyticsOptions {
  competencyId?: string;
  frameworkId?: string;
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  requestingUserId: string;
}

export interface CompetencyScoresSummaryOptions {
  assesseeId: string;
  frameworkId?: string;
  requestingUserId: string;
}

export interface AssessmentAnalytics {
  totalAssessments: number;
  completedAssessments: number;
  pendingAssessments: number;
  averageScore: number;
  scoreDistribution: Record<string, number>;
  assessmentsByType: Record<string, number>;
  competencyTrends: Array<{
    competencyName: string;
    averageScore: number;
    assessmentCount: number;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  }>;
  topPerformers: Array<{
    assesseeId: string;
    averageScore: number;
    completedAssessments: number;
  }>;
}

export interface CompetencyFrameworkData {
  name: string;
  description?: string;
  version?: string;
  isActive?: boolean;
  competencies: CompetencyData[];
}

export interface CompetencyData {
  name: string;
  description?: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  skillDefinitions: Record<string, any>;
  behavioralIndicators: string[];
  assessmentCriteria?: Record<string, any>;
  relatedCompetencies?: string[];
  isCore?: boolean;
  isActive?: boolean;
}

export interface ListFrameworksOptions {
  isActive?: boolean;
  search?: string;
  category?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface GetFrameworkCompetenciesOptions {
  level?: string;
  category?: string;
  isCore?: boolean;
  isActive?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface FrameworkRoleAssignment {
  roleId: string;
  competencyIds: string[];
  requiredLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
}

export interface FrameworkAnalytics {
  totalFrameworks: number;
  activeFrameworks: number;
  totalCompetencies: number;
  competenciesByLevel: Record<string, number>;
  frameworkUsage: Array<{
    frameworkId: string;
    frameworkName: string;
    assessmentCount: number;
    employeeCount: number;
  }>;
}
