// Performance domain types - shared across services

import { BaseEntity, PaginationParams, EmployeeInfo, Priority, Status, DateRangeFilter, NumberRangeFilter, TrendData } from './common';

// Performance Review Types
export interface PerformanceReview extends BaseEntity {
  employeeId: string;
  reviewerId: string;
  reviewPeriod: string;
  reviewType: ReviewType;
  overallRating?: number;
  goals?: Record<string, any>;
  strengths?: string;
  areasForImprovement?: string;
  developmentPlan?: string;
  managerComments?: string;
  employeeComments?: string;
  hrComments?: string;
  status: ReviewStatus;
  dueDate: Date;
  completedAt?: Date;
}

export interface Goal extends BaseEntity {
  employeeId: string;
  reviewId?: string;
  title: string;
  description?: string;
  category: GoalCategory;
  priority: Priority;
  status: GoalStatus;
  progress: number;
  targetDate: Date;
  achievedDate?: Date;
  metrics?: Record<string, any>;
  notes?: string;
  weight?: number;
  assignedBy?: string;
}

export interface GoalMilestone extends BaseEntity {
  goalId: string;
  title: string;
  description?: string;
  targetDate: Date;
  completedDate?: Date;
  status: MilestoneStatus;
  weight?: number;
}

export interface DevelopmentPlan extends BaseEntity {
  employeeId: string;
  managerId: string;
  reviewId?: string;
  title: string;
  description?: string;
  objectives: Record<string, any>;
  skills?: Record<string, any>;
  resources?: Record<string, any>;
  timeline?: Record<string, any>;
  budget?: number;
  status: PlanStatus;
  startDate: Date;
  endDate: Date;
  progress: number;
  notes?: string;
}

export interface CompetencyFramework extends BaseEntity {
  name: string;
  description?: string;
  version?: string;
  competencies: Record<string, any>;
  isActive: boolean;
  createdBy: string;
}

export interface CompetencyAssessment extends BaseEntity {
  employeeId: string;
  frameworkId: string;
  reviewId?: string;
  assessorId: string;
  scores: Record<string, any>;
  gaps?: Record<string, any>;
  recommendations?: Record<string, any>;
  assessmentDate: Date;
  validUntil?: Date;
  notes?: string;
}

// Enums
export enum ReviewType {
  ANNUAL = 'ANNUAL',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  QUARTERLY = 'QUARTERLY',
  PROBATIONARY = 'PROBATIONARY',
  PROJECT_BASED = 'PROJECT_BASED'
}

export enum ReviewStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED'
}

export enum GoalCategory {
  PERFORMANCE = 'PERFORMANCE',
  DEVELOPMENT = 'DEVELOPMENT',
  CAREER = 'CAREER',
  PROJECT = 'PROJECT',
  PERSONAL = 'PERSONAL'
}

export enum GoalStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED'
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export enum PlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED'
}

export enum FeedbackType {
  SELF_REVIEW = 'SELF_REVIEW',
  MANAGER_REVIEW = 'MANAGER_REVIEW',
  PEER_REVIEW = 'PEER_REVIEW',
  SUBORDINATE_REVIEW = 'SUBORDINATE_REVIEW',
  CUSTOMER_REVIEW = 'CUSTOMER_REVIEW'
}

export enum ActivityType {
  TRAINING = 'TRAINING',
  MENTORING = 'MENTORING',
  PROJECT = 'PROJECT',
  CERTIFICATION = 'CERTIFICATION',
  CONFERENCE = 'CONFERENCE',
  WORKSHOP = 'WORKSHOP',
  READING = 'READING',
  OTHER = 'OTHER'
}

export enum MetricType {
  QUANTITATIVE = 'QUANTITATIVE',
  QUALITATIVE = 'QUALITATIVE',
  BEHAVIORAL = 'BEHAVIORAL',
  TECHNICAL = 'TECHNICAL'
}

// Request/Response Types
export interface PerformanceReviewCreateRequest {
  employeeId: string;
  reviewerId: string;
  reviewPeriod: string;
  reviewType: ReviewType;
  dueDate: string;
  goals?: GoalInfo[];
  metadata?: Record<string, any>;
}

export interface PerformanceReviewUpdateRequest {
  reviewerId?: string;
  overallRating?: number;
  goals?: GoalInfo[];
  strengths?: string;
  areasForImprovement?: string;
  developmentPlan?: string;
  managerComments?: string;
  employeeComments?: string;
  hrComments?: string;
  status?: ReviewStatus;
  metadata?: Record<string, any>;
}

export interface PerformanceReviewResponse extends PerformanceReview {
  employee?: EmployeeInfo;
  reviewer?: EmployeeInfo;
  goals_relation?: GoalResponse[];
  progress?: ReviewProgress;
}

export interface GoalCreateRequest {
  employeeId: string;
  reviewId?: string;
  title: string;
  description?: string;
  category: GoalCategory;
  priority: Priority;
  targetDate: string;
  startDate?: string;
  metrics?: GoalMetric[];
  weight?: number;
  assignedBy?: string;
}

export interface GoalUpdateRequest {
  title?: string;
  description?: string;
  category?: GoalCategory;
  priority?: Priority;
  status?: GoalStatus;
  progress?: number;
  targetDate?: string;
  achievedDate?: string;
  metrics?: GoalMetric[];
  notes?: string;
  weight?: number;
}

export interface GoalResponse extends Goal {
  employee?: EmployeeInfo;
  review?: PerformanceReviewResponse;
  milestones?: GoalMilestoneResponse[];
  progressAnalysis?: GoalProgressAnalysis;
}

export interface DevelopmentPlanCreateRequest {
  employeeId: string;
  managerId: string;
  reviewId?: string;
  title: string;
  description?: string;
  objectives: DevelopmentObjective[];
  skills?: SkillDevelopment[];
  resources?: LearningResource[];
  timeline?: DevelopmentTimeline;
  budget?: number;
  startDate: string;
  endDate: string;
}

export interface DevelopmentPlanResponse extends DevelopmentPlan {
  employee?: EmployeeInfo;
  manager?: EmployeeInfo;
  progressSummary?: PlanProgressSummary;
}

// Supporting Interfaces
export interface GoalInfo {
  title: string;
  description?: string;
  target: string;
  achieved?: string;
  rating?: number;
  weight?: number;
}

export interface GoalMetric {
  name: string;
  target: string | number;
  current?: string | number;
  unit?: string;
  measurement?: string;
}

export interface ReviewProgress {
  completionPercentage: number;
  pendingTasks: string[];
  nextSteps: string[];
}

export interface GoalProgressAnalysis {
  onTrack: boolean;
  daysToTarget: number;
  progressRate: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestions: string[];
}

export interface GoalMilestoneResponse extends GoalMilestone {
  goal?: GoalResponse;
}

export interface DevelopmentObjective {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  targetDate: string;
  status: string;
  progress: number;
}

export interface SkillDevelopment {
  skillName: string;
  currentLevel: number;
  targetLevel: number;
  priority: Priority;
  resources: string[];
}

export interface LearningResource {
  type: string;
  title: string;
  description?: string;
  url?: string;
  cost?: number;
  duration?: number;
  priority: Priority;
}

export interface DevelopmentTimeline {
  phases: DevelopmentPhase[];
  milestones: TimelineMilestone[];
}

export interface DevelopmentPhase {
  name: string;
  startDate: string;
  endDate: string;
  activities: string[];
  deliverables: string[];
}

export interface TimelineMilestone {
  name: string;
  date: string;
  description?: string;
  criteria: string[];
}

export interface PlanProgressSummary {
  totalActivities: number;
  completedActivities: number;
  inProgressActivities: number;
  upcomingActivities: number;
  overallProgress: number;
  budgetUtilization: number;
}

export interface CompetencyDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  levels: CompetencyLevel[];
  weight?: number;
}

export interface CompetencyLevel {
  level: number;
  title: string;
  description: string;
  behaviors: string[];
}

export interface CompetencyRating {
  competencyId: string;
  competencyName: string;
  rating: number;
  maxRating: number;
  comments?: string;
}

// Search and Filter Types
export interface PerformanceReviewSearchParams extends PaginationParams {
  employeeId?: string;
  reviewerId?: string;
  reviewType?: ReviewType;
  status?: ReviewStatus;
  reviewPeriod?: string;
  dueDate?: DateRangeFilter;
  completedDate?: DateRangeFilter;
  overallRating?: NumberRangeFilter;
}

export interface GoalSearchParams extends PaginationParams {
  employeeId?: string;
  reviewId?: string;
  category?: GoalCategory;
  status?: GoalStatus;
  priority?: Priority;
  targetDate?: DateRangeFilter;
  progress?: NumberRangeFilter;
  assignedBy?: string;
}

export interface DevelopmentPlanSearchParams extends PaginationParams {
  employeeId?: string;
  managerId?: string;
  status?: PlanStatus;
  startDate?: DateRangeFilter;
  endDate?: DateRangeFilter;
  budget?: NumberRangeFilter;
}

// Analytics Types
export interface PerformanceAnalytics {
  reviewStats: ReviewStatistics;
  goalStats: GoalStatistics;
  competencyStats: CompetencyStatistics;
  developmentStats: DevelopmentStatistics;
  trends: PerformanceTrends;
}

export interface ReviewStatistics {
  totalReviews: number;
  completedReviews: number;
  averageRating: number;
  onTimeCompletion: number;
  overdue: number;
  byStatus: Record<ReviewStatus, number>;
  byType: Record<ReviewType, number>;
}

export interface GoalStatistics {
  totalGoals: number;
  completedGoals: number;
  onTrackGoals: number;
  atRiskGoals: number;
  overdueGoals: number;
  averageProgress: number;
  byCategory: Record<GoalCategory, number>;
  byStatus: Record<GoalStatus, number>;
}

export interface CompetencyStatistics {
  totalAssessments: number;
  averageScore: number;
  topCompetencies: string[];
  developmentAreas: string[];
  byFramework: Record<string, number>;
}

export interface DevelopmentStatistics {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalBudget: number;
  budgetUtilized: number;
  averageProgress: number;
  byActivity: Record<ActivityType, number>;
}

export interface PerformanceTrends {
  ratingTrends: TrendData[];
  goalCompletionTrends: TrendData[];
  competencyTrends: TrendData[];
  developmentTrends: TrendData[];
}
