/**
 * Application-related interfaces and models for recruitment service
 */

export interface ApplicationData {
  candidateId: string;
  jobPostingId: string;
  coverLetter?: string;
  resumeUrl?: string;
  portfolio?: string;
  applicationSource?: string;
  notes?: string;
  appliedAt?: Date;
}

export interface ListApplicationsOptions {
  candidateId?: string;
  jobPostingId?: string;
  status?: string;
  applicationSource?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
