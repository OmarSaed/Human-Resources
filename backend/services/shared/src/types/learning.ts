// Learning & Development domain types - shared across services

import { BaseEntity, PaginationParams, EmployeeInfo, Priority, Status, DateRangeFilter, NumberRangeFilter } from './common';

// Core Learning Types
export interface Course extends BaseEntity {
  title: string;
  description: string;
  shortDescription?: string;
  category: CourseCategory;
  difficulty: DifficultyLevel;
  duration: number;
  estimatedHours: number;
  language: string;
  tags: string[];
  syllabus: Record<string, any>;
  learningObjectives: string[];
  prerequisites: string[];
  instructorId?: string;
  instructorName?: string;
  authorId: string;
  thumbnailUrl?: string;
  trailerUrl?: string;
  price?: number;
  currency: string;
  accessType: AccessType;
  status: CourseStatus;
  isPublished: boolean;
  isFeatured: boolean;
  totalEnrollments: number;
  averageRating?: number;
  totalReviews: number;
  publishedAt?: Date;
}

export interface Enrollment extends BaseEntity {
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  progress: number;
  enrolledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  certificateIssuedAt?: Date;
  assignedBy?: string;
  dueDate?: Date;
  isRequired: boolean;
  totalTimeSpent: number;
  lastAccessedAt?: Date;
  currentLessonId?: string;
  finalScore?: number;
  passingScore?: number;
}

export interface Certificate extends BaseEntity {
  enrollmentId: string;
  courseId: string;
  userId: string;
  certificateNumber: string;
  title: string;
  description?: string;
  completionDate: Date;
  finalScore?: number;
  grade?: string;
  templateId?: string;
  certificateUrl?: string;
  verificationCode: string;
  isValid: boolean;
  expiresAt?: Date;
}

export interface LearningPath extends BaseEntity {
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  estimatedHours: number;
  category?: CourseCategory;
  tags: string[];
  courses: Record<string, any>;
  isPublished: boolean;
  isFeatured: boolean;
  totalEnrollments: number;
  authorId: string;
}

export interface Skill extends BaseEntity {
  name: string;
  description?: string;
  category: SkillCategory;
  isVerifiable: boolean;
  parentSkillId?: string;
}

export interface EmployeeSkill extends BaseEntity {
  userId: string;
  skillId: string;
  level: SkillLevel;
  proficiency: number;
  isVerified: boolean;
  evidence: Record<string, any>[];
  verifiedBy?: string;
  verifiedAt?: Date;
  acquiredAt?: Date;
  lastUsed?: Date;
}

// Enums
export enum CourseCategory {
  TECHNICAL = 'TECHNICAL',
  LEADERSHIP = 'LEADERSHIP',
  COMMUNICATION = 'COMMUNICATION',
  COMPLIANCE = 'COMPLIANCE',
  SAFETY = 'SAFETY',
  SOFT_SKILLS = 'SOFT_SKILLS',
  PRODUCT_KNOWLEDGE = 'PRODUCT_KNOWLEDGE',
  SALES = 'SALES',
  MARKETING = 'MARKETING',
  FINANCE = 'FINANCE',
  HR = 'HR',
  OPERATIONS = 'OPERATIONS',
  OTHER = 'OTHER'
}

export enum DifficultyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

export enum AccessType {
  INTERNAL = 'INTERNAL',
  PUBLIC = 'PUBLIC',
  PARTNER = 'PARTNER',
  CUSTOMER = 'CUSTOMER'
}

export enum CourseStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  SUSPENDED = 'SUSPENDED'
}

export enum EnrollmentStatus {
  ENROLLED = 'ENROLLED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DROPPED = 'DROPPED',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED'
}

export enum SkillCategory {
  TECHNICAL = 'TECHNICAL',
  LEADERSHIP = 'LEADERSHIP',
  COMMUNICATION = 'COMMUNICATION',
  ANALYTICAL = 'ANALYTICAL',
  CREATIVE = 'CREATIVE',
  INTERPERSONAL = 'INTERPERSONAL',
  DOMAIN_SPECIFIC = 'DOMAIN_SPECIFIC',
  TOOLS = 'TOOLS',
  LANGUAGES = 'LANGUAGES',
  CERTIFICATIONS = 'CERTIFICATIONS'
}

export enum SkillLevel {
  NOVICE = 'NOVICE',
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT'
}

export enum LessonType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  DOCUMENT = 'DOCUMENT',
  INTERACTIVE = 'INTERACTIVE',
  QUIZ = 'QUIZ',
  ASSIGNMENT = 'ASSIGNMENT',
  EXTERNAL_LINK = 'EXTERNAL_LINK',
  LIVE_SESSION = 'LIVE_SESSION'
}

export enum AssessmentType {
  QUIZ = 'QUIZ',
  EXAM = 'EXAM',
  ASSIGNMENT = 'ASSIGNMENT',
  PROJECT = 'PROJECT',
  PRACTICAL = 'PRACTICAL',
  SURVEY = 'SURVEY'
}

export enum ProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED'
}

// Request/Response Types
export interface CourseCreateRequest {
  title: string;
  description: string;
  shortDescription?: string;
  category: CourseCategory;
  difficulty?: DifficultyLevel;
  duration: number;
  estimatedHours: number;
  language?: string;
  tags?: string[];
  learningObjectives: string[];
  prerequisites?: string[];
  instructorId?: string;
  instructorName?: string;
  thumbnailUrl?: string;
  trailerUrl?: string;
  price?: number;
  currency?: string;
  accessType?: AccessType;
}

export interface CourseUpdateRequest {
  title?: string;
  description?: string;
  shortDescription?: string;
  category?: CourseCategory;
  difficulty?: DifficultyLevel;
  duration?: number;
  estimatedHours?: number;
  tags?: string[];
  learningObjectives?: string[];
  prerequisites?: string[];
  status?: CourseStatus;
  isPublished?: boolean;
  isFeatured?: boolean;
}

export interface CourseResponse extends Course {
  instructor?: EmployeeInfo;
  modules?: CourseModuleResponse[];
  enrollments?: EnrollmentResponse[];
  reviews?: CourseReviewResponse[];
  isEnrolled?: boolean;
  userProgress?: number;
}

export interface EnrollmentCreateRequest {
  userId: string;
  courseId: string;
  dueDate?: string;
  isRequired?: boolean;
  assignedBy?: string;
}

export interface EnrollmentResponse extends Enrollment {
  course?: CourseResponse;
  user?: EmployeeInfo;
  certificate?: Certificate;
  moduleProgress?: ModuleProgressResponse[];
}

export interface LearningPathCreateRequest {
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  estimatedHours: number;
  category?: CourseCategory;
  tags?: string[];
  courses: LearningPathCourse[];
}

export interface LearningPathResponse extends LearningPath {
  enrollments?: LearningPathEnrollmentResponse[];
  courseDetails?: CourseResponse[];
}

export interface SkillCreateRequest {
  name: string;
  description?: string;
  category: SkillCategory;
  isVerifiable?: boolean;
  parentSkillId?: string;
}

export interface SkillResponse extends Skill {
  parentSkill?: Skill;
  childSkills?: Skill[];
  employeeSkills?: EmployeeSkillResponse[];
}

export interface EmployeeSkillCreateRequest {
  userId: string;
  skillId: string;
  level: SkillLevel;
  proficiency: number;
  evidence?: Record<string, any>[];
  acquiredAt?: string;
}

export interface EmployeeSkillResponse extends EmployeeSkill {
  skill?: Skill;
  user?: EmployeeInfo;
  verifier?: EmployeeInfo;
}

// Supporting Interfaces
export interface CourseModuleResponse {
  id: string;
  title: string;
  description?: string;
  order: number;
  duration: number;
  isRequired: boolean;
  isPublished: boolean;
  lessons?: LessonResponse[];
  assessments?: AssessmentResponse[];
}

export interface LessonResponse {
  id: string;
  title: string;
  description?: string;
  order: number;
  duration: number;
  type: LessonType;
  isRequired: boolean;
  isPreview: boolean;
  isPublished: boolean;
  videoUrl?: string;
  documentUrl?: string;
  interactiveUrl?: string;
}

export interface AssessmentResponse {
  id: string;
  title: string;
  description?: string;
  type: AssessmentType;
  timeLimit?: number;
  attempts: number;
  passingScore: number;
  isRequired: boolean;
  isPublished: boolean;
}

export interface ModuleProgressResponse {
  id: string;
  moduleId: string;
  status: ProgressStatus;
  progress: number;
  timeSpent: number;
  startedAt?: Date;
  completedAt?: Date;
  currentScore?: number;
  bestScore?: number;
}

export interface CourseReviewResponse {
  id: string;
  userId: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerified: boolean;
  isVisible: boolean;
  helpfulVotes: number;
  totalVotes: number;
  createdAt: Date;
  user?: EmployeeInfo;
}

export interface LearningPathCourse {
  courseId: string;
  order: number;
  isRequired: boolean;
  prerequisites?: string[];
}

export interface LearningPathEnrollmentResponse {
  id: string;
  userId: string;
  status: EnrollmentStatus;
  progress: number;
  currentCourseId?: string;
  enrolledAt: Date;
  completedAt?: Date;
  user?: EmployeeInfo;
}

// Search and Filter Types
export interface CourseSearchParams extends PaginationParams {
  query?: string;
  category?: CourseCategory;
  difficulty?: DifficultyLevel;
  status?: CourseStatus;
  instructorId?: string;
  tags?: string[];
  priceRange?: NumberRangeFilter;
  durationRange?: NumberRangeFilter;
  isFeatured?: boolean;
  isPublished?: boolean;
}

export interface EnrollmentSearchParams extends PaginationParams {
  userId?: string;
  courseId?: string;
  status?: EnrollmentStatus;
  assignedBy?: string;
  enrollmentDate?: DateRangeFilter;
  dueDate?: DateRangeFilter;
  isRequired?: boolean;
}

export interface SkillSearchParams extends PaginationParams {
  query?: string;
  category?: SkillCategory;
  isVerifiable?: boolean;
  parentSkillId?: string;
}

export interface LearningPathSearchParams extends PaginationParams {
  query?: string;
  category?: CourseCategory;
  difficulty?: DifficultyLevel;
  isPublished?: boolean;
  isFeatured?: boolean;
}

// Analytics Types
export interface LearningAnalytics {
  courseStats: CourseStatistics;
  enrollmentStats: EnrollmentStatistics;
  skillStats: SkillStatistics;
  learningPathStats: LearningPathStatistics;
  trends: LearningTrends;
}

export interface CourseStatistics {
  totalCourses: number;
  publishedCourses: number;
  averageRating: number;
  totalEnrollments: number;
  completionRate: number;
  popularCategories: string[];
  topRatedCourses: string[];
}

export interface EnrollmentStatistics {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  averageProgress: number;
  averageCompletionTime: number;
  dropoutRate: number;
}

export interface SkillStatistics {
  totalSkills: number;
  verifiedSkills: number;
  topSkills: string[];
  skillGaps: string[];
  averageProficiency: number;
}

export interface LearningPathStatistics {
  totalPaths: number;
  publishedPaths: number;
  totalPathEnrollments: number;
  averagePathCompletion: number;
  popularPaths: string[];
}

export interface LearningTrends {
  enrollmentTrend: Array<{ period: string; value: number }>;
  completionTrend: Array<{ period: string; value: number }>;
  skillDevelopmentTrend: Array<{ period: string; value: number }>;
  categoryTrend: Array<{ category: string; enrollments: number }>;
}
