/**
 * Candidate-related interfaces and models for recruitment service
 */

export interface CandidateData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: any;
  linkedInUrl?: string;
  portfolioUrl?: string;
  currentTitle?: string;
  currentCompany?: string;
  experience?: number;
  education?: any[];
  skills?: string[];
  certifications?: string[];
  languages?: string[];
  source?: 'CAREER_SITE' | 'JOB_BOARD' | 'LINKEDIN' | 'REFERRAL' | 'RECRUITER' | 'UNIVERSITY' | 'SOCIAL_MEDIA' | 'DIRECT_APPLICATION' | 'HEADHUNTER' | 'OTHER';
  referredBy?: string;
  tags?: string[];
  notes?: string;
}

export interface ListCandidatesOptions {
  status?: string;
  source?: string;
  skills?: string[];
  experience?: number;
  search?: string;
  tags?: string[];
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface SearchCandidatesOptions {
  query?: string;
  skills?: string[];
  experience?: number;
  location?: string;
  salaryExpectation?: number;
  availability?: string;
  education?: any[];
  page: number;
  limit: number;
}

export interface CandidateAnalytics {
  totalCandidates: number;
  activeCandidates: number;
  newCandidates: number;
  hiredCandidates: number;
  blacklistedCandidates: number;
  topSkills: string[];
  averageExperience: number;
  candidatesBySource: Record<string, number>;
  candidatesByStatus: Record<string, number>;
  skillsDistribution: Record<string, number>;
  experienceDistribution: Record<string, number>;
  conversionRates: {
    candidateToApplication: number;
    applicationToInterview: number;
    interviewToOffer: number;
  };
}
