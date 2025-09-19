/**
 * Evaluation-related interfaces and models for recruitment service
 */

export interface EvaluationData {
  applicationId: string;
  candidateId: string;
  type: 'RESUME_REVIEW' | 'PHONE_SCREEN' | 'TECHNICAL_ASSESSMENT' | 'INTERVIEW_FEEDBACK' | 'REFERENCE_CHECK' | 'FINAL_EVALUATION';
  evaluatorId: string;
  title: string;
  criteria?: any;
  scores?: any;
  overallScore: number;
  rating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BELOW_AVERAGE' | 'POOR';
  recommendation: 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO_HIRE' | 'STRONG_NO_HIRE';
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  comments?: string;
}

export interface EvaluationSubmissionData {
  scores: Record<string, number>;
  overallScore: number;
  recommendation: 'STRONG_HIRE' | 'HIRE' | 'NO_HIRE' | 'HOLD' | 'STRONG_NO_HIRE';
  comments?: string;
  submittedBy: string;
}

export interface ListEvaluationsOptions {
  candidateId?: string;
  jobPostingId?: string;
  type?: string;
  status?: string;
  evaluatorId?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface EvaluationAnalyticsOptions {
  candidateId?: string;
  jobPostingId?: string;
  startDate?: Date;
  endDate?: Date;
  evaluatorId?: string;
  type?: string;
}

export interface EvaluationAnalytics {
  totalEvaluations: number;
  completedEvaluations: number;
  averageScore: number;
  evaluationsByType: Record<string, number>;
  evaluationsByRating: Record<string, number>;
  recommendationDistribution: Record<string, number>;
  evaluatorPerformance: Array<{
    evaluatorId: string;
    evaluationsCount: number;
    averageScore: number;
    consistency: number;
  }>;
  scoreDistribution: Array<{
    range: string;
    count: number;
  }>;
  timeToComplete: {
    average: number;
    median: number;
  };
}

export interface GenerateReportOptions {
  candidateId?: string;
  jobPostingId?: string;
  startDate?: Date;
  endDate?: Date;
  format: 'PDF' | 'EXCEL' | 'CSV';
  includeDetails?: boolean;
  includeCharts?: boolean;
}

export interface CandidateRankingOptions {
  jobPostingId: string;
  criteria?: string[];
  weights?: Record<string, number>;
  includeInterviews?: boolean;
  includeAssessments?: boolean;
}
