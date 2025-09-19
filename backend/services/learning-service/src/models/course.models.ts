/**
 * Course-related interfaces and models for learning service
 */

export interface CourseData {
  title: string;
  description: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  duration: number; // in hours
  language: string;
  instructorId: string;
  thumbnailUrl?: string;
  objectives?: string[];
  prerequisites?: string[];
  tags?: string[];
  price?: number;
  currency?: string;
  isPublic?: boolean;
  maxEnrollments?: number;
}

export interface CourseContent {
  id: string;
  title: string;
  description?: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'DOCUMENT' | 'INTERACTIVE';
  order: number;
  duration?: number;
  contentUrl?: string;
  content?: string;
  isRequired: boolean;
  isPreview: boolean;
}

export interface CourseReview {
  id: string;
  userId: string;
  courseId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'SUSPENDED';
  enrolledAt: Date;
  completedAt?: Date;
  progress: number;
  lastAccessedAt?: Date;
}

export interface ListCoursesOptions {
  category?: string;
  level?: string;
  status?: string;
  instructorId?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
}

export interface SearchCoursesOptions {
  query: string;
  category?: string;
  level?: string;
  duration?: string;
  skills?: string[];
  page: number;
  limit: number;
}
