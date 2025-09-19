/**
 * Interview-related interfaces and models for recruitment service
 */

export interface InterviewData {
  applicationId: string;
  candidateId: string;
  jobPostingId: string;
  type: 'PHONE_SCREEN' | 'VIDEO_CALL' | 'TECHNICAL_INTERVIEW' | 'BEHAVIORAL_INTERVIEW' | 'PANEL_INTERVIEW' | 'ONSITE_INTERVIEW' | 'FINAL_INTERVIEW' | 'CULTURAL_FIT' | 'TECHNICAL_ASSESSMENT';
  title: string;
  description?: string;
  scheduledAt: Date;
  duration: number;
  location?: string;
  timezone?: string;
  interviewerId: string;
  interviewers?: string[];
  round?: number;
}

export interface ListInterviewsOptions {
  applicationId?: string;
  candidateId?: string;
  jobPostingId?: string;
  interviewerId?: string;
  status?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface InterviewFeedback {
  rating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BELOW_AVERAGE' | 'POOR';
  recommendation: 'STRONG_HIRE' | 'HIRE' | 'MAYBE' | 'NO_HIRE' | 'STRONG_NO_HIRE';
  strengths: string[];
  improvements: string[];
  comments: string;
  technicalSkills?: Record<string, number>;
  softSkills?: Record<string, number>;
  culturalFit?: number;
  communicationSkills?: number;
  problemSolving?: number;
  overallScore: number;
}

export interface InterviewAnalytics {
  totalInterviews: number;
  completedInterviews: number;
  averageRating: number;
  interviewsByType: Record<string, number>;
  interviewsByStatus: Record<string, number>;
  averageDuration: number;
  passRate: number;
  feedbackMetrics: {
    averageScores: Record<string, number>;
    topStrengths: string[];
    commonImprovements: string[];
  };
}
