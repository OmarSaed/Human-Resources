import { 
  PerformanceReview, 
  Goal, 
  GoalMilestone,
  GoalUpdate,
  ReviewFeedback,
  DevelopmentPlan,
  DevelopmentActivity,
  CompetencyFramework,
  CompetencyAssessment,
  PerformanceMetric,
  ReviewType,
  ReviewStatus,
  GoalCategory,
  Priority,
  GoalStatus,
  MilestoneStatus,
  FeedbackType,
  FeedbackStatus,
  PlanStatus,
  ActivityType,
  ActivityStatus,
  MetricType
} from '@prisma/client';

// Re-export Prisma types
export {
  PerformanceReview,
  Goal,
  GoalMilestone,
  GoalUpdate,
  ReviewFeedback,
  DevelopmentPlan,
  DevelopmentActivity,
  CompetencyFramework,
  CompetencyAssessment,
  PerformanceMetric,
  ReviewType,
  ReviewStatus,
  GoalCategory,
  Priority,
  GoalStatus,
  MilestoneStatus,
  FeedbackType,
  FeedbackStatus,
  PlanStatus,
  ActivityType,
  ActivityStatus,
  MetricType
};

// Performance Review Types

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
  reviewFeedback?: ReviewFeedbackResponse[];
  progress?: ReviewProgress;
}

export interface ReviewProgress {
  completionPercentage: number;
  pendingTasks: string[];
  nextSteps: string[];
}

// Goal Types

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
  updates?: GoalUpdateResponse[];
  progressAnalysis?: GoalProgressAnalysis;
}

export interface GoalProgressAnalysis {
  onTrack: boolean;
  daysToTarget: number;
  progressRate: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestions: string[];
}

// Goal Milestone Types

export interface GoalMilestoneCreateRequest {
  goalId: string;
  title: string;
  description?: string;
  targetDate: string;
  weight?: number;
}

export interface GoalMilestoneUpdateRequest {
  title?: string;
  description?: string;
  targetDate?: string;
  completedDate?: string;
  status?: MilestoneStatus;
  weight?: number;
}

export interface GoalMilestoneResponse extends GoalMilestone {
  goal?: GoalResponse;
}

// Goal Update Types

export interface GoalUpdateCreateRequest {
  goalId: string;
  updatedBy: string;
  newProgress: number;
  comment?: string;
  evidenceUrls?: string[];
}

export interface GoalUpdateResponse extends GoalUpdate {
  goal?: GoalResponse;
  updatedByEmployee?: EmployeeInfo;
}

// Review Feedback Types

export interface ReviewFeedbackCreateRequest {
  reviewId: string;
  feedbackType: FeedbackType;
  providedBy: string;
  recipientId: string;
  content: string;
  rating?: number;
  competencies?: CompetencyRating[];
  isAnonymous?: boolean;
}

export interface ReviewFeedbackUpdateRequest {
  content?: string;
  rating?: number;
  competencies?: CompetencyRating[];
  status?: FeedbackStatus;
}

export interface ReviewFeedbackResponse extends ReviewFeedback {
  review?: PerformanceReviewResponse;
  provider?: EmployeeInfo;
  recipient?: EmployeeInfo;
}

// Development Plan Types

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

export interface DevelopmentPlanUpdateRequest {
  title?: string;
  description?: string;
  objectives?: DevelopmentObjective[];
  skills?: SkillDevelopment[];
  resources?: LearningResource[];
  timeline?: DevelopmentTimeline;
  budget?: number;
  status?: PlanStatus;
  startDate?: string;
  endDate?: string;
  progress?: number;
  notes?: string;
}

export interface DevelopmentPlanResponse extends DevelopmentPlan {
  employee?: EmployeeInfo;
  manager?: EmployeeInfo;
  activities?: DevelopmentActivityResponse[];
  progressSummary?: PlanProgressSummary;
}

export interface PlanProgressSummary {
  totalActivities: number;
  completedActivities: number;
  inProgressActivities: number;
  upcomingActivities: number;
  overallProgress: number;
  budgetUtilization: number;
}

// Development Activity Types

export interface DevelopmentActivityCreateRequest {
  planId: string;
  title: string;
  description?: string;
  type: ActivityType;
  provider?: string;
  cost?: number;
  duration?: number;
  startDate: string;
  endDate?: string;
}

export interface DevelopmentActivityUpdateRequest {
  title?: string;
  description?: string;
  type?: ActivityType;
  provider?: string;
  cost?: number;
  duration?: number;
  startDate?: string;
  endDate?: string;
  status?: ActivityStatus;
  completionRate?: number;
  certificateUrl?: string;
  feedback?: string;
  rating?: number;
}

export interface DevelopmentActivityResponse extends DevelopmentActivity {
  plan?: DevelopmentPlanResponse;
}

// Competency Types

export interface CompetencyFrameworkCreateRequest {
  name: string;
  description?: string;
  version?: string;
  competencies: CompetencyDefinition[];
  createdBy: string;
}

export interface CompetencyFrameworkUpdateRequest {
  name?: string;
  description?: string;
  version?: string;
  competencies?: CompetencyDefinition[];
  isActive?: boolean;
}

export interface CompetencyFrameworkResponse extends CompetencyFramework {
  assessments?: CompetencyAssessmentResponse[];
  usageStats?: FrameworkUsageStats;
}

export interface FrameworkUsageStats {
  totalAssessments: number;
  activeAssessments: number;
  averageScore: number;
  lastUsed: Date;
}

export interface CompetencyAssessmentCreateRequest {
  employeeId: string;
  frameworkId: string;
  reviewId?: string;
  assessorId: string;
  scores: CompetencyScore[];
  gaps?: SkillGap[];
  recommendations?: DevelopmentRecommendation[];
  assessmentDate: string;
  validUntil?: string;
  notes?: string;
}

export interface CompetencyAssessmentUpdateRequest {
  scores?: CompetencyScore[];
  gaps?: SkillGap[];
  recommendations?: DevelopmentRecommendation[];
  assessmentDate?: string;
  validUntil?: string;
  notes?: string;
}

export interface CompetencyAssessmentResponse extends CompetencyAssessment {
  employee?: EmployeeInfo;
  framework?: CompetencyFrameworkResponse;
  assessor?: EmployeeInfo;
  analysis?: AssessmentAnalysis;
}

export interface AssessmentAnalysis {
  strengthAreas: string[];
  developmentAreas: string[];
  overallScore: number;
  benchmarkComparison: BenchmarkComparison;
}

export interface BenchmarkComparison {
  industry: number;
  role: number;
  level: number;
}

// Performance Metric Types

export interface PerformanceMetricCreateRequest {
  employeeId: string;
  metricName: string;
  metricType: MetricType;
  value: number;
  target?: number;
  unit?: string;
  period: string;
  recordedAt: string;
  recordedBy: string;
  notes?: string;
}

export interface PerformanceMetricUpdateRequest {
  value?: number;
  target?: number;
  unit?: string;
  notes?: string;
}

export interface PerformanceMetricResponse extends PerformanceMetric {
  employee?: EmployeeInfo;
  trend?: MetricTrend;
  variance?: MetricVariance;
}

export interface MetricTrend {
  direction: 'UP' | 'DOWN' | 'STABLE';
  percentage: number;
  periods: number;
}

export interface MetricVariance {
  fromTarget: number;
  fromAverage: number;
  percentile: number;
}

// Supporting Interfaces

export interface EmployeeInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeNumber: string;
  department?: string;
  position?: string;
  manager?: string;
}

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

export interface CompetencyRating {
  competencyId: string;
  competencyName: string;
  rating: number;
  maxRating: number;
  comments?: string;
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

export interface CompetencyScore {
  competencyId: string;
  level: number;
  score: number;
  evidence?: string[];
  comments?: string;
}

export interface SkillGap {
  competencyId: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  priority: Priority;
}

export interface DevelopmentRecommendation {
  competencyId: string;
  type: string;
  title: string;
  description: string;
  resources: string[];
  timeline: string;
  priority: Priority;
}

// Search and Filter Types

export interface PerformanceReviewSearchParams {
  employeeId?: string;
  reviewerId?: string;
  reviewType?: ReviewType;
  status?: ReviewStatus;
  reviewPeriod?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  completedFrom?: string;
  completedTo?: string;
  overallRatingMin?: number;
  overallRatingMax?: number;
}

export interface GoalSearchParams {
  employeeId?: string;
  reviewId?: string;
  category?: GoalCategory;
  status?: GoalStatus;
  priority?: Priority;
  targetDateFrom?: string;
  targetDateTo?: string;
  progressMin?: number;
  progressMax?: number;
  assignedBy?: string;
}

export interface DevelopmentPlanSearchParams {
  employeeId?: string;
  managerId?: string;
  status?: PlanStatus;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  budgetMin?: number;
  budgetMax?: number;
}

// Analytics and Reporting Types

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

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercentage: number;
}

// Error Types

export interface PerformanceError {
  code: string;
  message: string;
  field?: string;
}

export interface PerformanceValidationError extends PerformanceError {
  field: string;
  value?: any;
}

// API Response Types

export interface PerformanceApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: PerformanceError;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metadata?: Record<string, any>;
}
