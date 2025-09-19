/**
 * Review feedback and related interfaces
 */

export interface ReviewFeedbackData {
  reviewId: string;
  requesterId: string;
  respondentId: string;
  feedbackType: 'UPWARD' | 'DOWNWARD' | 'PEER' | 'SELF' | 'CUSTOMER' | '360_DEGREE';
  questions: Array<{
    question: string;
    type: 'RATING' | 'TEXT' | 'MULTIPLE_CHOICE';
    required: boolean;
  }>;
  dueDate?: Date;
  anonymousResponse?: boolean;
  instructions?: string;
}

export interface GetReviewFeedbackOptions {
  reviewId?: string;
  requesterId?: string;
  respondentId?: string;
  feedbackType?: string;
  status?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface GetPendingRequestsOptions {
  respondentId: string;
  overdue?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface FeedbackRequestData {
  respondentIds: string[];
  feedbackType: string;
  customQuestions?: Array<any>;
  dueDate?: Date;
  instructions?: string;
}

export interface FeedbackResponseData {
  responses: Array<{
    questionId: string;
    answer: any;
  }>;
  overallRating?: number;
  additionalComments?: string;
}

export interface UserFeedbackSummaryOptions {
  employeeId: string;
  startDate?: Date;
  endDate?: Date;
  feedbackType?: string;
  requestingUserId: string;
}

export interface GenerateFeedbackReportOptions {
  reviewId: string;
  includeIndividualResponses?: boolean;
  includeAnalytics?: boolean;
  format?: 'PDF' | 'EXCEL';
  anonymize?: boolean;
  requestingUserId: string;
}

export interface FeedbackAnalytics {
  totalRequests: number;
  completedResponses: number;
  responseRate: number;
  averageRating: number;
  ratingDistribution: Record<string, number>;
  feedbackTrends: Array<{
    period: string;
    averageRating: number;
    responseCount: number;
  }>;
  topRatedAreas: Array<{
    area: string;
    averageRating: number;
  }>;
  improvementAreas: Array<{
    area: string;
    averageRating: number;
    suggestionCount: number;
  }>;
}
