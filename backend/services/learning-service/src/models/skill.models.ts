/**
 * Skill-related interfaces and models for learning service
 */

export interface SkillData {
  name: string;
  description?: string;
  category: string;
  type: 'TECHNICAL' | 'SOFT' | 'LANGUAGE' | 'CERTIFICATION' | 'DOMAIN' | 'LEADERSHIP';
  keywords?: string[];
  isActive?: boolean;
  createdBy: string;
}

export interface ListSkillsOptions {
  category?: string;
  type?: string;
  isActive?: boolean;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface UserSkillData {
  skillId: string;
  userId: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  proficiency: number; // 1-100
  endorsedBy?: string;
  assignedBy: string;
}

export interface GetUserSkillsOptions {
  category?: string;
  level?: string;
  proficiency?: number;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface SearchSkillsOptions {
  query: string;
  category?: string;
  type?: string;
  limit: number;
}

export interface SkillGapAnalysisOptions {
  userId: string;
  roleId?: string;
  departmentId?: string;
  requestingUserId: string;
}

export interface SkillEndorsementData {
  userSkillId: string;
  endorsedBy: string;
  comment?: string;
  rating?: number; // 1-5
}

export interface SkillAnalytics {
  totalUsers: number;
  averageProficiency: number;
  proficiencyDistribution: Record<string, number>;
  levelDistribution: Record<string, number>;
  endorsementCount: number;
  recentActivity: any[];
  trendingStatus: 'INCREASING' | 'STABLE' | 'DECREASING';
}
