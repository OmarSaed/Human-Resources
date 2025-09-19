import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { v4 as uuidv4 } from 'uuid';
import {
  ListUserCertificatesOptions,
  ListCertificatesOptions,
  CertificateAnalytics
} from '../models/certificate.models';

const logger = createLogger('certificate-service');


export class CertificateService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate certificate for course completion
   */
  async generateCertificate(enrollmentId: string, requestingUserId: string): Promise<any> {
    try {
      // Validate enrollment
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          course: {
            include: {
              modules: {
                include: {
                  assessments: true,
                },
              },
            },
          },
        },
      });

      if (!enrollment) {
        throw new Error('Enrollment not found');
      }

      // Check if user has permission (own enrollment or instructor)
      const hasPermission = 
        enrollment.userId === requestingUserId ||
        enrollment.course.instructorId === requestingUserId ||
        enrollment.course.authorId === requestingUserId;

      if (!hasPermission) {
        throw new Error('You do not have permission to generate this certificate');
      }

      // Check if enrollment is completed
      if (enrollment.status !== 'COMPLETED') {
        throw new Error('Course must be completed to generate certificate');
      }

      // Check if certificate already exists
      const existingCertificate = await this.prisma.certificate.findUnique({
        where: { enrollmentId },
      });

      if (existingCertificate) {
        throw new Error('Certificate already exists for this enrollment');
      }

      // Validate completion requirements
      const completionValid = await this.validateCompletionRequirements(enrollment);
      if (!completionValid) {
        throw new Error('Completion requirements not met');
      }

      // Generate certificate number and verification code
      const certificateNumber = this.generateCertificateNumber();
      const verificationCode = this.generateVerificationCode();

      // Create certificate
      const certificate = await this.prisma.certificate.create({
        data: {
          enrollmentId,
          courseId: enrollment.courseId,
          userId: enrollment.userId,
          certificateNumber,
          title: `Certificate of Completion - ${enrollment.course.title}`,
          description: `This certifies that the course "${enrollment.course.title}" has been successfully completed.`,
          completionDate: enrollment.completedAt || new Date(),
          finalScore: enrollment.finalScore,
          grade: this.calculateGrade(enrollment.finalScore || 0),
          verificationCode,
          isValid: true,
          expiresAt: this.calculateExpirationDate(enrollment.course),
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              difficulty: true,
              estimatedHours: true,
            },
          },
          enrollment: {
            select: {
              id: true,
              userId: true,
              completedAt: true,
              finalScore: true,
            },
          },
        },
      });

      // Generate certificate file
      const certificateUrl = await this.generateCertificateFile(certificate);
      
      // Update certificate with file URL
      const updatedCertificate = await this.prisma.certificate.update({
        where: { id: certificate.id },
        data: { certificateUrl },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              difficulty: true,
              estimatedHours: true,
            },
          },
          enrollment: {
            select: {
              id: true,
              userId: true,
              completedAt: true,
              finalScore: true,
            },
          },
        },
      });

      logger.info('Certificate generated successfully', {
        certificateId: certificate.id,
        enrollmentId,
        courseId: enrollment.courseId,
        userId: enrollment.userId,
      });

      return updatedCertificate;
    } catch (error) {
      logger.error('Failed to generate certificate', error as Error);
      throw error;
    }
  }

  /**
   * Get certificate by ID
   */
  async getCertificate(certificateId: string, requestingUserId: string): Promise<any | null> {
    try {
      const certificate = await this.prisma.certificate.findUnique({
        where: { id: certificateId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              difficulty: true,
              estimatedHours: true,
              instructorId: true,
              authorId: true,
            },
          },
          enrollment: {
            select: {
              id: true,
              userId: true,
              completedAt: true,
              finalScore: true,
            },
          },
        },
      });

      if (!certificate) {
        return null;
      }

      // Check access permissions
      const hasAccess = 
        certificate.userId === requestingUserId ||
        certificate.course.instructorId === requestingUserId ||
        certificate.course.authorId === requestingUserId;

      if (!hasAccess) {
        return null;
      }

      return certificate;
    } catch (error) {
      logger.error('Failed to get certificate', error as Error);
      throw error;
    }
  }

  /**
   * List user certificates
   */
  async listUserCertificates(
    userId: string,
    options: ListUserCertificatesOptions
  ): Promise<{
    certificates: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        courseId,
        isValid,
        page,
        limit,
        sortBy,
        sortOrder,
        requestingUserId,
      } = options;

      // Check if requesting user can view these certificates
      if (userId !== requestingUserId) {
        // Add role-based permission check here
        const hasPermission = await this.checkViewPermission(requestingUserId);
        if (!hasPermission) {
          throw new Error('You do not have permission to view these certificates');
        }
      }

      const skip = (page - 1) * limit;

      const where: any = { userId };

      if (courseId) where.courseId = courseId;
      if (isValid !== undefined) where.isValid = isValid;

      const [certificates, total] = await Promise.all([
        this.prisma.certificate.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                category: true,
                difficulty: true,
                estimatedHours: true,
              },
            },
          },
        }),
        this.prisma.certificate.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        certificates,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list user certificates', error as Error);
      throw error;
    }
  }

  /**
   * List all certificates (admin/instructor view)
   */
  async listCertificates(options: ListCertificatesOptions): Promise<{
    certificates: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        courseId,
        userId,
        isValid,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder,
        requestingUserId,
      } = options;

      // Check permissions
      const hasPermission = await this.checkViewPermission(requestingUserId);
      if (!hasPermission) {
        throw new Error('You do not have permission to view all certificates');
      }

      const skip = (page - 1) * limit;

      const where: any = {};

      if (courseId) where.courseId = courseId;
      if (userId) where.userId = userId;
      if (isValid !== undefined) where.isValid = isValid;

      if (startDate || endDate) {
        where.completionDate = {};
        if (startDate) where.completionDate.gte = startDate;
        if (endDate) where.completionDate.lte = endDate;
      }

      const [certificates, total] = await Promise.all([
        this.prisma.certificate.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                category: true,
                difficulty: true,
              },
            },
            enrollment: {
              select: {
                userId: true,
              },
            },
          },
        }),
        this.prisma.certificate.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        certificates,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list certificates', error as Error);
      throw error;
    }
  }

  /**
   * Verify certificate by verification code
   */
  async verifyCertificate(verificationCode: string): Promise<any | null> {
    try {
      const certificate = await this.prisma.certificate.findUnique({
        where: { verificationCode },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              difficulty: true,
              estimatedHours: true,
            },
          },
        },
      });

      if (!certificate) {
        return null;
      }

      // Check if certificate is valid and not expired
      const isValid = certificate.isValid && 
        (!certificate.expiresAt || certificate.expiresAt > new Date());

      return {
        ...certificate,
        isCurrentlyValid: isValid,
        isExpired: certificate.expiresAt && certificate.expiresAt < new Date(),
      };
    } catch (error) {
      logger.error('Failed to verify certificate', error as Error);
      throw error;
    }
  }

  /**
   * Download certificate
   */
  async downloadCertificate(
    certificateId: string, 
    format: string, 
    requestingUserId: string
  ): Promise<{ data: Buffer; contentType: string; filename: string }> {
    try {
      const certificate = await this.getCertificate(certificateId, requestingUserId);

      if (!certificate) {
        throw new Error('Certificate not found or access denied');
      }

      // Generate certificate file based on format
      const { data, contentType } = await this.generateCertificateDownload(certificate, format);
      
      const filename = `certificate-${certificate.certificateNumber}.${format}`;

      return {
        data,
        contentType,
        filename,
      };
    } catch (error) {
      logger.error('Failed to download certificate', error as Error);
      throw error;
    }
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(certificateId: string, reason: string, requestingUserId: string): Promise<any> {
    try {
      const certificate = await this.getCertificate(certificateId, requestingUserId);

      if (!certificate) {
        throw new Error('Certificate not found or access denied');
      }

      // Check permission to revoke
      const canRevoke = 
        certificate.course.instructorId === requestingUserId ||
        certificate.course.authorId === requestingUserId;

      if (!canRevoke) {
        throw new Error('You do not have permission to revoke this certificate');
      }

      const updatedCertificate = await this.prisma.certificate.update({
        where: { id: certificateId },
        data: {
          isValid: false,
          updatedAt: new Date(),
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
        },
      });

      logger.info('Certificate revoked', { certificateId, reason, requestingUserId });

      return updatedCertificate;
    } catch (error) {
      logger.error('Failed to revoke certificate', error as Error);
      throw error;
    }
  }

  /**
   * Reactivate certificate
   */
  async reactivateCertificate(certificateId: string, requestingUserId: string): Promise<any> {
    try {
      const certificate = await this.getCertificate(certificateId, requestingUserId);

      if (!certificate) {
        throw new Error('Certificate not found or access denied');
      }

      // Check permission to reactivate
      const canReactivate = 
        certificate.course.instructorId === requestingUserId ||
        certificate.course.authorId === requestingUserId;

      if (!canReactivate) {
        throw new Error('You do not have permission to reactivate this certificate');
      }

      const updatedCertificate = await this.prisma.certificate.update({
        where: { id: certificateId },
        data: {
          isValid: true,
          updatedAt: new Date(),
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
            },
          },
        },
      });

      logger.info('Certificate reactivated', { certificateId, requestingUserId });

      return updatedCertificate;
    } catch (error) {
      logger.error('Failed to reactivate certificate', error as Error);
      throw error;
    }
  }

  /**
   * Get certificate analytics
   */
  async getCertificateAnalytics(options: {
    courseId?: string;
    startDate?: Date;
    endDate?: Date;
    requestingUserId: string;
  }): Promise<CertificateAnalytics> {
    try {
      const { courseId, startDate, endDate } = options;

      const where: any = {};
      if (courseId) where.courseId = courseId;
      if (startDate || endDate) {
        where.completionDate = {};
        if (startDate) where.completionDate.gte = startDate;
        if (endDate) where.completionDate.lte = endDate;
      }

      const [
        totalCertificates,
        activeCertificates,
        revokedCertificates,
        expiredCertificates,
        certificatesByCourse,
        allCertificates,
      ] = await Promise.all([
        this.prisma.certificate.count({ where }),
        this.prisma.certificate.count({ where: { ...where, isValid: true } }),
        this.prisma.certificate.count({ where: { ...where, isValid: false } }),
        this.prisma.certificate.count({ 
          where: { 
            ...where, 
            expiresAt: { lt: new Date() },
            isValid: true 
          } 
        }),
        this.prisma.certificate.groupBy({
          by: ['courseId'],
          where,
          _count: { courseId: true },
          orderBy: { _count: { courseId: 'desc' } },
          take: 10,
        }),
        this.prisma.certificate.findMany({
          where,
          select: {
            userId: true,
            finalScore: true,
            completionDate: true,
          },
        }),
      ]);

      // Get course titles for course analytics
      const courseIds = certificatesByCourse.map(cert => cert.courseId);
      const courses = await this.prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, title: true },
      });

      const certificatesByCourseWithTitles = certificatesByCourse.map(cert => {
        const course = courses.find(c => c.id === cert.courseId);
        return {
          courseTitle: course?.title || 'Unknown Course',
          count: cert._count.courseId,
        };
      });

      // Calculate monthly distribution
      const certificatesByMonth = this.calculateMonthlyDistribution(allCertificates);

      // Calculate average completion score
      const scores = allCertificates
        .filter(cert => cert.finalScore !== null)
        .map(cert => cert.finalScore!);
      const averageCompletionScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0;

      // Calculate top performers
      const userCertificateCounts: Record<string, number> = {};
      allCertificates.forEach(cert => {
        userCertificateCounts[cert.userId] = (userCertificateCounts[cert.userId] || 0) + 1;
      });

      const topPerformers = Object.entries(userCertificateCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userId, count]) => ({ userId, certificateCount: count }));

      return {
        totalCertificates,
        activeCertificates,
        revokedCertificates,
        expiredCertificates,
        certificatesByCourse: certificatesByCourseWithTitles,
        certificatesByMonth,
        averageCompletionScore,
        topPerformers,
      };
    } catch (error) {
      logger.error('Failed to get certificate analytics', error as Error);
      throw error;
    }
  }

  /**
   * Bulk generate certificates
   */
  async bulkGenerateCertificates(
    enrollmentIds: string[], 
    requestingUserId: string
  ): Promise<{ successful: number; failed: number; results: any[] }> {
    try {
      let successful = 0;
      let failed = 0;
      const results = [];

      for (const enrollmentId of enrollmentIds) {
        try {
          const certificate = await this.generateCertificate(enrollmentId, requestingUserId);
          results.push({
            enrollmentId,
            success: true,
            certificateId: certificate.id,
          });
          successful++;
        } catch (error) {
          results.push({
            enrollmentId,
            success: false,
            error: (error as Error).message,
          });
          failed++;
        }
      }

      logger.info('Bulk certificate generation completed', {
        total: enrollmentIds.length,
        successful,
        failed,
        requestingUserId,
      });

      return { successful, failed, results };
    } catch (error) {
      logger.error('Failed to bulk generate certificates', error as Error);
      throw error;
    }
  }

  /**
   * Get certificate templates
   */
  async getCertificateTemplates(requestingUserId: string): Promise<any[]> {
    try {
      // This would typically fetch from a templates table or configuration
      const templates = [
        {
          id: 'default',
          name: 'Default Certificate',
          description: 'Standard certificate template',
          preview: '/templates/default-preview.png',
        },
        {
          id: 'modern',
          name: 'Modern Certificate',
          description: 'Modern design certificate template',
          preview: '/templates/modern-preview.png',
        },
        {
          id: 'classic',
          name: 'Classic Certificate',
          description: 'Classic formal certificate template',
          preview: '/templates/classic-preview.png',
        },
      ];

      return templates;
    } catch (error) {
      logger.error('Failed to get certificate templates', error as Error);
      throw error;
    }
  }

  // Private helper methods

  private async validateCompletionRequirements(enrollment: any): Promise<boolean> {
    // Check if all required assessments are passed
    const requiredAssessments = enrollment.course.modules
      .flatMap((module: any) => module.assessments)
      .filter((assessment: any) => assessment.isRequired);

    if (requiredAssessments.length === 0) {
      return true; // No required assessments
    }

    const passedAssessments = await this.prisma.assessmentAttempt.count({
      where: {
        enrollmentId: enrollment.id,
        assessmentId: { in: requiredAssessments.map((a: any) => a.id) },
        passed: true,
      },
    });

    return passedAssessments >= requiredAssessments.length;
  }

  private generateCertificateNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT-${timestamp}-${random}`;
  }

  private generateVerificationCode(): string {
    return uuidv4().replace(/-/g, '').toUpperCase();
  }

  private calculateGrade(score?: number): string {
    if (!score) return 'N/A';
    
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    return 'D';
  }

  private calculateExpirationDate(course: any): Date | null {
    // Some courses might have expiring certificates (e.g., compliance training)
    // This would be configurable per course
    return null; // No expiration by default
  }

  private async generateCertificateFile(certificate: any): Promise<string> {
    // This would integrate with a PDF generation service
    // For now, return a placeholder URL
    return `/certificates/${certificate.id}.pdf`;
  }

  private async generateCertificateDownload(
    certificate: any, 
    format: string
  ): Promise<{ data: Buffer; contentType: string }> {
    // This would generate the actual certificate file
    // For now, return placeholder data
    const content = `Certificate: ${certificate.title}\nNumber: ${certificate.certificateNumber}`;
    
    return {
      data: Buffer.from(content),
      contentType: format === 'pdf' ? 'application/pdf' : 'text/plain',
    };
  }

  private async checkViewPermission(userId: string): Promise<boolean> {
    // This would check if user has instructor, admin, or HR role
    // For now, return true
    return true;
  }

  private calculateMonthlyDistribution(certificates: any[]): Array<{ month: string; count: number }> {
    const monthCounts: Record<string, number> = {};
    
    certificates.forEach(cert => {
      const month = cert.completionDate.toISOString().slice(0, 7); // YYYY-MM
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    return Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}
