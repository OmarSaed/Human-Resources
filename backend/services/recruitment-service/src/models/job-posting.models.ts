/**
 * Job posting-related interfaces and models for recruitment service
 */

export interface JobPostingData {
  title: string;
  department: string;
  location: string;
  workType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'FREELANCE';
  workArrangement: 'OFFICE' | 'REMOTE' | 'HYBRID';
  description: string;
  requirements: string[];
  responsibilities: string[];
  qualifications: string[];
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  urgency?: 'NORMAL' | 'URGENT' | 'CRITICAL';
  hiringManagerId?: string;
  recruiterId?: string;
}

export interface ListJobPostingsOptions {
  department?: string;
  status?: string;
  workType?: string;
  workArrangement?: string;
  location?: string;
  priority?: string;
  hiringManagerId?: string;
  recruiterId?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface JobStatistics {
  totalJobPostings: number;
  activeJobPostings: number;
  filledPositions: number;
  pendingApproval: number;
  applicationsByJob: Record<string, number>;
  timeToFillStats: {
    average: number;
    median: number;
    fastest: number;
    slowest: number;
  };
  jobsByDepartment: Record<string, number>;
  jobsByWorkType: Record<string, number>;
}
