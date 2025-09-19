/**
 * Certificate-related interfaces and models for learning service
 */

export interface ListUserCertificatesOptions {
  courseId?: string;
  isValid?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface ListCertificatesOptions {
  courseId?: string;
  userId?: string;
  isValid?: boolean;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface CertificateAnalytics {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  expiredCertificates: number;
  certificatesByCourse: Array<{ courseTitle: string; count: number }>;
  certificatesByMonth: Array<{ month: string; count: number }>;
  averageCompletionScore: number;
  topPerformers: Array<{ userId: string; certificateCount: number }>;
}
