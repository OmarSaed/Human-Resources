import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { ApplicationData, ListApplicationsOptions } from '../models/application.models';

const logger = createLogger('application-service');


export class ApplicationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create application
   */
  async createApplication(data: ApplicationData): Promise<any> {
    try {
      // Validate candidate and job posting exist
      const [candidate, jobPosting] = await Promise.all([
        this.prisma.candidate.findUnique({ where: { id: data.candidateId } }),
        this.prisma.jobPosting.findUnique({ where: { id: data.jobPostingId } }),
      ]);

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      if (!jobPosting) {
        throw new Error('Job posting not found');
      }

      // Check for duplicate application
      const existingApplication = await this.prisma.application.findFirst({
        where: {
          candidateId: data.candidateId,
          jobPostingId: data.jobPostingId,
        },
      });

      if (existingApplication) {
        throw new Error('Candidate has already applied for this position');
      }

      const application = await this.prisma.application.create({
        data: {
          candidateId: data.candidateId,
          jobPostingId: data.jobPostingId,
          source: data.applicationSource as any || 'DIRECT_APPLICATION',
          status: 'APPLIED',
          appliedAt: data.appliedAt || new Date(),
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          jobPosting: {
            select: {
              id: true,
              title: true,
              department: true,
            },
          },
        },
      });

      logger.info('Application created successfully', {
        applicationId: application.id,
        candidateId: data.candidateId,
        jobPostingId: data.jobPostingId,
      });

      return application;
    } catch (error) {
      logger.error('Failed to create application', error as Error);
      throw error;
    }
  }

  /**
   * Get application by ID
   */
  async getApplication(applicationId: string): Promise<any | null> {
    try {
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              skills: true,
              experience: true,
            },
          },
          jobPosting: {
            select: {
              id: true,
              title: true,
              department: true,
              location: true,
            },
          },
        },
      });

      return application;
    } catch (error) {
      logger.error(`Failed to get application ${applicationId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update application
   */
  async updateApplication(
    applicationId: string,
    updates: Partial<ApplicationData>
  ): Promise<any> {
    try {
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const updatedApplication = await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          jobPosting: {
            select: {
              id: true,
              title: true,
              department: true,
            },
          },
        },
      });

      logger.info('Application updated successfully', {
        applicationId,
        updates: Object.keys(updates),
      });

      return updatedApplication;
    } catch (error) {
      logger.error(`Failed to update application ${applicationId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    applicationId: string,
    status: string,
    notes?: string
  ): Promise<any> {
    try {
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const updatedApplication = await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          status: status as any,
          updatedAt: new Date(),
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          jobPosting: {
            select: {
              id: true,
              title: true,
              department: true,
            },
          },
        },
      });

      logger.info('Application status updated', {
        applicationId,
        status,
        previousStatus: application.status,
      });

      return updatedApplication;
    } catch (error) {
      logger.error(`Failed to update application status ${applicationId}`, error as Error);
      throw error;
    }
  }

  /**
   * List applications with filtering
   */
  async listApplications(options: ListApplicationsOptions): Promise<{
    applications: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        candidateId,
        jobPostingId,
        status,
        applicationSource,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {};
      if (candidateId) where.candidateId = candidateId;
      if (jobPostingId) where.jobPostingId = jobPostingId;
      if (status) where.status = status;
      if (applicationSource) where.applicationSource = applicationSource;

      if (startDate || endDate) {
        where.appliedAt = {};
        if (startDate) where.appliedAt.gte = startDate;
        if (endDate) where.appliedAt.lte = endDate;
      }

      const [applications, total] = await Promise.all([
        this.prisma.application.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            jobPosting: {
              select: {
                id: true,
                title: true,
                department: true,
                location: true,
              },
            },
          },
        }),
        this.prisma.application.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        applications,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list applications', error as Error);
      throw error;
    }
  }

  /**
   * Get candidate applications
   */
  async getCandidateApplications(candidateId: string): Promise<any[]> {
    try {
      const applications = await this.prisma.application.findMany({
        where: { candidateId },
        include: {
            jobPosting: {
              select: {
                id: true,
                title: true,
                department: true,
                location: true,
                status: true,
              },
            },
        },
        orderBy: { appliedAt: 'desc' },
      });

      return applications;
    } catch (error) {
      logger.error(`Failed to get candidate applications ${candidateId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get job posting applications
   */
  async getJobPostingApplications(jobPostingId: string): Promise<any[]> {
    try {
      const applications = await this.prisma.application.findMany({
        where: { jobPostingId },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              skills: true,
              experience: true,
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      });

      return applications;
    } catch (error) {
      logger.error(`Failed to get job posting applications ${jobPostingId}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete application
   */
  async deleteApplication(applicationId: string): Promise<void> {
    try {
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      await this.prisma.application.delete({
        where: { id: applicationId },
      });

      logger.info('Application deleted successfully', { applicationId });
    } catch (error) {
      logger.error(`Failed to delete application ${applicationId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get application analytics
   */
  async getApplicationAnalytics(jobPostingId?: string): Promise<any> {
    try {
      const where = jobPostingId ? { jobPostingId } : {};

      const [
        totalApplications,
        applicationsByStatus,
        applicationsBySource,
        recentApplications,
      ] = await Promise.all([
        this.prisma.application.count({ where }),
        this.prisma.application.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        this.prisma.application.groupBy({
          by: ['source'],
          where,
          _count: { source: true },
        }),
        this.prisma.application.findMany({
          where,
          take: 10,
          orderBy: { appliedAt: 'desc' },
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            jobPosting: {
              select: {
                id: true,
                title: true,
                department: true,
              },
            },
          },
        }),
      ]);

      // Transform data
      const statusCounts = applicationsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>);

      const sourceCounts = applicationsBySource.reduce((acc, item) => {
        const source = item.source || 'UNKNOWN';
        acc[source] = item._count.source || 0;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalApplications,
        applicationsByStatus: statusCounts,
        applicationsBySource: sourceCounts,
        recentApplications,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get application analytics', error as Error);
      throw error;
    }
  }
}