/**
 * Shared interfaces and models used across recruitment service
 */

export interface OnboardingTaskData {
  candidateId: string;
  title: string;
  description: string;
  category: 'DOCUMENTATION' | 'IT_SETUP' | 'ORIENTATION' | 'TRAINING' | 'MEETINGS' | 'COMPLIANCE' | 'BENEFITS' | 'WORKSPACE_SETUP';
  type?: 'MANUAL' | 'AUTOMATED' | 'FORM_SUBMISSION' | 'DOCUMENT_UPLOAD' | 'MEETING' | 'TRAINING' | 'SYSTEM_ACCESS';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignedBy: string;
  assignedTo?: string;
  dueDate: Date;
  estimatedHours?: number;
  instructions?: string;
  attachments?: string[];
  dependencies?: string[];
  isRequired?: boolean;
}
export interface KafkaMessage {
  id: string;
  type: string;
  source: string;
  data: any;
  timestamp: Date;
  correlationId?: string;
}

export interface RecruitmentMetrics {
  totalJobPostings: number;
  activeJobPostings: number;
  totalCandidates: number;
  activeCandidates: number;
  totalApplications: number;
  interviewsScheduled: number;
  offersExtended: number;
  hiresCompleted: number;
  averageTimeToHire: number;
  conversionRates: {
    applicationToInterview: number;
    interviewToOffer: number;
    offerToHire: number;
  };
}

export interface RecruitmentPipeline {
  jobId: string;
  jobTitle: string;
  applications: {
    total: number;
    byStage: Record<string, number>;
    byStatus: Record<string, number>;
  };
  interviews: {
    scheduled: number;
    completed: number;
    avgRating: number;
  };
  offers: {
    extended: number;
    accepted: number;
    declined: number;
    pending: number;
  };
  timeMetrics?: {
    avgTimeToFirstInterview: number;
    avgTimeToOffer: number;
    avgTimeToHire: number;
  };
}
