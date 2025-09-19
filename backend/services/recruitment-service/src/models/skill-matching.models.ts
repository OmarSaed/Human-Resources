/**
 * Skill matching and analysis related interfaces
 */

export interface SkillMatchResult {
  candidateId: string;
  jobPostingId: string;
  overallScore: number;
  skillMatches: Array<{
    skill: string;
    required: boolean;
    candidateHas: boolean;
    proficiencyLevel?: number;
    weight: number;
  }>;
  missingSkills: string[];
  extraSkills: string[];
  recommendations: string[];
}

export interface SkillAnalysis {
  skill: string;
  category: 'TECHNICAL' | 'SOFT' | 'DOMAIN' | 'CERTIFICATION' | 'LANGUAGE';
  proficiencyLevel: number; // 1-10 scale
  yearsOfExperience?: number;
  confidence: number; // 0-1 scale
}

export interface JobRequirement {
  skill: string;
  required: boolean;
  weight: number; // 1-10 scale
  minimumLevel?: number;
  category?: string;
}

export interface MatchingOptions {
  includePartialMatches?: boolean;
  skillSynonyms?: boolean;
  proficiencyWeight?: number;
  experienceWeight?: number;
  minimumScore?: number;
}
