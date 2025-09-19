import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('job-posting-service');

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
  hiringManagerId?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
}

export interface JobStatistics {
  totalApplications: number;
  newApplications: number;
  inReviewApplications: number;
  interviewedCandidates: number;
  hiredCandidates: number;
  rejectedApplications: number;
  applicationsByStage: Record<string, number>;
  applicationsBySource: Record<string, number>;
  averageTimeToHire: number;
  conversionRates: {
    applicationToInterview: number;
    interviewToOffer: number;
    offerToHire: number;
  };
}

export class JobPostingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new job posting
   */
  async createJobPosting(data: JobPostingData): Promise<any> {
    try {
      const job = await this.prisma.jobPosting.create({
        data: {
          title: data.title,
          department: data.department,
          location: data.location,
          workType: data.workType,
          workArrangement: data.workArrangement,
          description: data.description,
          requirements: data.requirements,
          responsibilities: data.responsibilities,
          qualifications: data.qualifications,
          skills: data.skills,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          currency: data.currency || 'USD',
          priority: data.priority || 'NORMAL',
          urgency: data.urgency || 'NORMAL',
          hiringManagerId: data.hiringManagerId,
          recruiterId: data.recruiterId,
          status: 'DRAFT',
        },
        include: {
          _count: {
            select: {
              applications: true,
              interviews: true,
            },
          },
        },
      });

      logger.info('Job posting created successfully', {
        jobId: job.id,
        title: job.title,
        department: job.department,
      });

      return job;
    } catch (error) {
      logger.error('Failed to create job posting', error as Error);
      throw error;
    }
  }

  /**
   * Get job posting by ID
   */
  async getJobPosting(jobId: string, requestingUserId?: string): Promise<any | null> {
    try {
      const job = await this.prisma.jobPosting.findUnique({
        where: { id: jobId },
        include: {
          _count: {
            select: {
              applications: true,
              interviews: true,
            },
          },
        },
      });

      if (!job) {
        return null;
      }

      // For public access (candidate view), only return active jobs
      if (!requestingUserId && job.status !== 'ACTIVE') {
        return null;
      }

      return job;
    } catch (error) {
      logger.error(`Failed to get job posting ${jobId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update job posting
   */
  async updateJobPosting(
    jobId: string, 
    updates: Partial<JobPostingData>, 
    requestingUserId: string
  ): Promise<any> {
    try {
      // Check permissions
      const job = await this.prisma.jobPosting.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job posting not found');
      }

      const canEdit = 
        job.hiringManagerId === requestingUserId ||
        job.recruiterId === requestingUserId;

      if (!canEdit) {
        throw new Error('You do not have permission to edit this job posting');
      }

      const updatedJob = await this.prisma.jobPosting.update({
        where: { id: jobId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          _count: {
            select: {
              applications: true,
              interviews: true,
            },
          },
        },
      });

      logger.info('Job posting updated successfully', {
        jobId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedJob;
    } catch (error) {
      logger.error(`Failed to update job posting ${jobId}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete job posting
   */
  async deleteJobPosting(jobId: string, requestingUserId: string): Promise<void> {
    try {
      const job = await this.prisma.jobPosting.findUnique({
        where: { id: jobId },
        include: {
          applications: true,
        },
      });

      if (!job) {
        throw new Error('Job posting not found');
      }

      const canDelete = 
        job.hiringManagerId === requestingUserId ||
        job.recruiterId === requestingUserId;

      if (!canDelete) {
        throw new Error('You do not have permission to delete this job posting');
      }

      // Check if job has applications
      if (job.applications.length > 0) {
        throw new Error('Cannot delete job posting with applications. Please archive it instead.');
      }

      await this.prisma.jobPosting.delete({
        where: { id: jobId },
      });

      logger.info('Job posting deleted successfully', { jobId, requestingUserId });
    } catch (error) {
      logger.error(`Failed to delete job posting ${jobId}`, error as Error);
      throw error;
    }
  }

  /**
   * List job postings with filtering and pagination
   */
  async listJobPostings(options: ListJobPostingsOptions): Promise<{
    jobPostings: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        department,
        status,
        workType,
        workArrangement,
        hiringManagerId,
        page,
        limit,
        sortBy,
        sortOrder,
        search,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (department) where.department = department;
      if (status) where.status = status;
      if (workType) where.workType = workType;
      if (workArrangement) where.workArrangement = workArrangement;
      if (hiringManagerId) where.hiringManagerId = hiringManagerId;

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [jobs, total] = await Promise.all([
        this.prisma.jobPosting.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                applications: true,
                interviews: true,
              },
            },
          },
        }),
        this.prisma.jobPosting.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        jobPostings: jobs,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list job postings', error as Error);
      throw error;
    }
  }

  /**
   * Publish job posting
   */
  async publishJobPosting(
    jobId: string, 
    requestingUserId: string, 
    options: { expiresAt?: Date } = {}
  ): Promise<any> {
    try {
      const job = await this.prisma.jobPosting.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job posting not found');
      }

      const canPublish = 
        job.hiringManagerId === requestingUserId ||
        job.recruiterId === requestingUserId;

      if (!canPublish) {
        throw new Error('You do not have permission to publish this job posting');
      }

      // Validate job posting before publishing
      if (!job.title || !job.description || !job.requirements.length) {
        throw new Error('Job posting must have title, description, and requirements to be published');
      }

      const updatedJob = await this.prisma.jobPosting.update({
        where: { id: jobId },
        data: {
          status: 'ACTIVE',
          postedAt: new Date(),
          expiresAt: options.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
          approvedBy: requestingUserId,
          approvedAt: new Date(),
        },
        include: {
          _count: {
            select: {
              applications: true,
              interviews: true,
            },
          },
        },
      });

      logger.info('Job posting published', { jobId, requestingUserId });

      return updatedJob;
    } catch (error) {
      logger.error(`Failed to publish job posting ${jobId}`, error as Error);
      throw error;
    }
  }

  /**
   * Pause job posting
   */
  async pauseJobPosting(jobId: string, requestingUserId: string): Promise<any> {
    try {
      const job = await this.prisma.jobPosting.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job posting not found');
      }

      const canPause = 
        job.hiringManagerId === requestingUserId ||
        job.recruiterId === requestingUserId;

      if (!canPause) {
        throw new Error('You do not have permission to pause this job posting');
      }

      const updatedJob = await this.prisma.jobPosting.update({
        where: { id: jobId },
        data: {
          status: 'PAUSED',
        },
        include: {
          _count: {
            select: {
              applications: true,
              interviews: true,
            },
          },
        },
      });

      logger.info('Job posting paused', { jobId, requestingUserId });

      return updatedJob;
    } catch (error) {
      logger.error(`Failed to pause job posting ${jobId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get job applications
   */
  async getJobApplications(
    jobId: string,
    options: {
      status?: string;
      stage?: string;
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
      requestingUserId: string;
    }
  ): Promise<{
    applications: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { status, stage, page, limit, sortBy, sortOrder } = options;
      const skip = (page - 1) * limit;

      const where: any = { jobPostingId: jobId };
      if (status) where.status = status;
      if (stage) where.stage = stage;

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
                experience: true,
                skills: true,
                resumeUrl: true,
              },
            },
            _count: {
              select: {
                interviews: true,
                evaluations: true,
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
      logger.error(`Failed to get job applications ${jobId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get job statistics
   */
  async getJobStatistics(jobId: string, requestingUserId: string): Promise<JobStatistics> {
    try {
      const job = await this.prisma.jobPosting.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job posting not found');
      }

      const [
        totalApplications,
        newApplications,
        inReviewApplications,
        interviewedCandidates,
        hiredCandidates,
        rejectedApplications,
        applicationsByStage,
        applicationsBySource,
      ] = await Promise.all([
        this.prisma.application.count({ where: { jobPostingId: jobId } }),
        this.prisma.application.count({ 
          where: { 
            jobPostingId: jobId, 
            status: 'APPLIED',
            appliedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
          } 
        }),
        this.prisma.application.count({ 
          where: { jobPostingId: jobId, status: 'SCREENING' } 
        }),
        this.prisma.application.count({ 
          where: { jobPostingId: jobId, stage: 'INTERVIEWING' } 
        }),
        this.prisma.application.count({ 
          where: { jobPostingId: jobId, status: 'HIRED' } 
        }),
        this.prisma.application.count({ 
          where: { jobPostingId: jobId, status: 'REJECTED' } 
        }),
        this.prisma.application.groupBy({
          by: ['stage'],
          where: { jobPostingId: jobId },
          _count: { stage: true },
        }),
        this.prisma.application.groupBy({
          by: ['source'],
          where: { jobPostingId: jobId },
          _count: { source: true },
        }),
      ]);

      // Calculate conversion rates
      const conversionRates = {
        applicationToInterview: totalApplications > 0 ? (interviewedCandidates / totalApplications) * 100 : 0,
        interviewToOffer: interviewedCandidates > 0 ? (hiredCandidates / interviewedCandidates) * 100 : 0,
        offerToHire: hiredCandidates > 0 ? (hiredCandidates / hiredCandidates) * 100 : 100, // Simplified
      };

      // Calculate average time to hire (simplified)
      const hiredApplications = await this.prisma.application.findMany({
        where: { jobPostingId: jobId, status: 'HIRED' },
        select: { appliedAt: true, lastStatusChange: true },
      });

      const averageTimeToHire = hiredApplications.length > 0
        ? hiredApplications.reduce((acc, app) => {
            const days = (app.lastStatusChange.getTime() - app.appliedAt.getTime()) / (1000 * 60 * 60 * 24);
            return acc + days;
          }, 0) / hiredApplications.length
        : 0;

      const stageCounts: Record<string, number> = {};
      applicationsByStage.forEach(item => {
        stageCounts[item.stage] = item._count.stage;
      });

      const sourceCounts: Record<string, number> = {};
      applicationsBySource.forEach(item => {
        sourceCounts[item.source || 'UNKNOWN'] = item._count.source;
      });

      return {
        totalApplications,
        newApplications,
        inReviewApplications,
        interviewedCandidates,
        hiredCandidates,
        rejectedApplications,
        applicationsByStage: stageCounts,
        applicationsBySource: sourceCounts,
        averageTimeToHire,
        conversionRates,
      };
    } catch (error) {
      logger.error(`Failed to get job statistics ${jobId}`, error as Error);
      throw error;
    }
  }

  /**
   * Search public job postings
   */
  async searchPublicJobs(options: {
    query?: string;
    department?: string;
    location?: string;
    workType?: string;
    workArrangement?: string;
    salaryMin?: number;
    salaryMax?: number;
    page: number;
    limit: number;
  }): Promise<{
    jobPostings: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        query,
        department,
        location,
        workType,
        workArrangement,
        salaryMin,
        salaryMax,
        page,
        limit,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      };

      if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { skills: { has: query } },
        ];
      }

      if (department) where.department = department;
      if (location) where.location = { contains: location, mode: 'insensitive' };
      if (workType) where.workType = workType;
      if (workArrangement) where.workArrangement = workArrangement;

      if (salaryMin || salaryMax) {
        where.AND = [];
        if (salaryMin) where.AND.push({ salaryMin: { gte: salaryMin } });
        if (salaryMax) where.AND.push({ salaryMax: { lte: salaryMax } });
      }

      const [jobs, total] = await Promise.all([
        this.prisma.jobPosting.findMany({
          where,
          skip,
          take: limit,
          orderBy: { postedAt: 'desc' },
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            workType: true,
            workArrangement: true,
            description: true,
            requirements: true,
            responsibilities: true,
            qualifications: true,
            skills: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            postedAt: true,
            expiresAt: true,
          },
        }),
        this.prisma.jobPosting.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        jobPostings: jobs,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to search public jobs', error as Error);
      throw error;
    }
  }

  /**
   * Get job analytics
   */
  async getJobAnalytics(options: {
    startDate?: Date;
    endDate?: Date;
    department?: string;
    requestingUserId: string;
  }): Promise<{
    totalJobs: number;
    activeJobs: number;
    filledJobs: number;
    averageTimeToFill: number;
    jobsByDepartment: Record<string, number>;
    jobsByStatus: Record<string, number>;
    topSkills: Array<{ skill: string; count: number }>;
  }> {
    try {
      const { startDate, endDate, department } = options;

      const where: any = {};
      if (department) where.department = department;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [
        totalJobs,
        activeJobs,
        filledJobs,
        jobsByDepartment,
        jobsByStatus,
        allJobs,
      ] = await Promise.all([
        this.prisma.jobPosting.count({ where }),
        this.prisma.jobPosting.count({ where: { ...where, status: 'ACTIVE' } }),
        this.prisma.jobPosting.count({ where: { ...where, status: 'FILLED' } }),
        this.prisma.jobPosting.groupBy({
          by: ['department'],
          where,
          _count: { department: true },
        }),
        this.prisma.jobPosting.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        this.prisma.jobPosting.findMany({
          where,
          select: {
            skills: true,
            createdAt: true,
            postedAt: true,
            applications: {
              where: { status: 'HIRED' },
              select: { lastStatusChange: true },
              take: 1,
            },
          },
        }),
      ]);

      // Calculate average time to fill
      const filledJobsWithTime = allJobs.filter(job => 
        job.applications.length > 0 && job.postedAt
      );

      const averageTimeToFill = filledJobsWithTime.length > 0
        ? filledJobsWithTime.reduce((acc, job) => {
            const days = (job.applications[0].lastStatusChange.getTime() - job.postedAt!.getTime()) / (1000 * 60 * 60 * 24);
            return acc + days;
          }, 0) / filledJobsWithTime.length
        : 0;

      // Count skills
      const skillCounts: Record<string, number> = {};
      allJobs.forEach(job => {
        job.skills.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      });

      const topSkills = Object.entries(skillCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      const departmentCounts: Record<string, number> = {};
      jobsByDepartment.forEach(item => {
        departmentCounts[item.department] = item._count.department;
      });

      const statusCounts: Record<string, number> = {};
      jobsByStatus.forEach(item => {
        statusCounts[item.status] = item._count.status;
      });

      return {
        totalJobs,
        activeJobs,
        filledJobs,
        averageTimeToFill,
        jobsByDepartment: departmentCounts,
        jobsByStatus: statusCounts,
        topSkills,
      };
    } catch (error) {
      logger.error('Failed to get job analytics', error as Error);
      throw error;
    }
  }

  /**
   * Clone job posting
   */
  async cloneJobPosting(
    jobId: string, 
    requestingUserId: string, 
    overrides: { title?: string; department?: string } = {}
  ): Promise<any> {
    try {
      const originalJob = await this.prisma.jobPosting.findUnique({
        where: { id: jobId },
      });

      if (!originalJob) {
        throw new Error('Job posting not found');
      }

      const canClone = 
        originalJob.hiringManagerId === requestingUserId ||
        originalJob.recruiterId === requestingUserId;

      if (!canClone) {
        throw new Error('You do not have permission to clone this job posting');
      }

      const clonedJob = await this.prisma.jobPosting.create({
        data: {
          title: overrides.title || `${originalJob.title} (Copy)`,
          department: overrides.department || originalJob.department,
          location: originalJob.location,
          workType: originalJob.workType,
          workArrangement: originalJob.workArrangement,
          description: originalJob.description,
          requirements: originalJob.requirements,
          responsibilities: originalJob.responsibilities,
          qualifications: originalJob.qualifications,
          skills: originalJob.skills,
          salaryMin: originalJob.salaryMin,
          salaryMax: originalJob.salaryMax,
          currency: originalJob.currency,
          priority: originalJob.priority,
          urgency: originalJob.urgency,
          hiringManagerId: originalJob.hiringManagerId,
          recruiterId: originalJob.recruiterId,
          status: 'DRAFT',
        },
        include: {
          _count: {
            select: {
              applications: true,
              interviews: true,
            },
          },
        },
      });

      logger.info('Job posting cloned successfully', {
        originalJobId: jobId,
        clonedJobId: clonedJob.id,
        requestingUserId,
      });

      return clonedJob;
    } catch (error) {
      logger.error(`Failed to clone job posting ${jobId}`, error as Error);
      throw error;
    }
  }
}
