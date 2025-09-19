import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { CandidateData , ListCandidatesOptions , SearchCandidatesOptions ,CandidateAnalytics} from '../models/candidate.models';

const logger = createLogger('candidate-service');


export class CandidateService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new candidate
   */
  async createCandidate(data: CandidateData, createdBy: string): Promise<any> {
    try {
      // Check for duplicate email
      const existingCandidate = await this.prisma.candidate.findUnique({
        where: { email: data.email },
      });

      if (existingCandidate) {
        throw new Error('A candidate with this email already exists');
      }

      const candidate = await this.prisma.candidate.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          linkedInUrl: data.linkedInUrl,
          portfolioUrl: data.portfolioUrl,
          currentTitle: data.currentTitle,
          currentCompany: data.currentCompany,
          experience: data.experience,
          education: data.education || [],
          skills: data.skills || [],
          certifications: data.certifications || [],
          languages: data.languages || [],
          source: data.source || 'DIRECT_APPLICATION',
          referredBy: data.referredBy,
          tags: data.tags || [],
          notes: data.notes,
          status: 'NEW',
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

      logger.info('Candidate created successfully', {
        candidateId: candidate.id,
        email: candidate.email,
        source: candidate.source,
      });

      return candidate;
    } catch (error) {
      logger.error('Failed to create candidate', error as Error);
      throw error;
    }
  }

  /**
   * Get candidate by ID
   */
  async getCandidate(candidateId: string, requestingUserId: string): Promise<any | null> {
    try {
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          applications: {
            include: {
              jobPosting: {
                select: {
                  id: true,
                  title: true,
                  department: true,
                  status: true,
                },
              },
            },
            orderBy: { appliedAt: 'desc' },
          },
          interviews: {
            include: {
              jobPosting: {
                select: {
                  id: true,
                  title: true,
                  department: true,
                },
              },
            },
            orderBy: { scheduledAt: 'desc' },
          },
          evaluations: {
            orderBy: { completedAt: 'desc' },
            take: 5,
          },
          _count: {
            select: {
              applications: true,
              interviews: true,
              evaluations: true,
            },
          },
        },
      });

      if (!candidate) {
        return null;
      }

      // Check if candidate is blacklisted and user doesn't have admin access
      if (candidate.blacklisted) {
        const userRole = await this.getUserRole(requestingUserId);
        if (!['admin', 'hr_manager'].includes(userRole)) {
          return null;
        }
      }

      return candidate;
    } catch (error) {
      logger.error(`Failed to get candidate ${candidateId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update candidate
   */
  async updateCandidate(
    candidateId: string, 
    updates: Partial<CandidateData>, 
    requestingUserId: string
  ): Promise<any> {
    try {
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Check email uniqueness if email is being updated
      if (updates.email && updates.email !== candidate.email) {
        const existingCandidate = await this.prisma.candidate.findUnique({
          where: { email: updates.email },
        });

        if (existingCandidate) {
          throw new Error('A candidate with this email already exists');
        }
      }

      const updatedCandidate = await this.prisma.candidate.update({
        where: { id: candidateId },
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

      logger.info('Candidate updated successfully', {
        candidateId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedCandidate;
    } catch (error) {
      logger.error(`Failed to update candidate ${candidateId}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete candidate
   */
  async deleteCandidate(candidateId: string, requestingUserId: string): Promise<void> {
    try {
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
        include: {
          applications: true,
          interviews: true,
        },
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Check if candidate has active applications or interviews
      const activeApplications = candidate.applications.filter(app => 
        ['APPLIED', 'SCREENING', 'PHONE_SCREEN', 'TECHNICAL_TEST', 'ONSITE_INTERVIEW', 'FINAL_REVIEW'].includes(app.status)
      );

      const upcomingInterviews = candidate.interviews.filter(interview => 
        interview.status === 'SCHEDULED' && interview.scheduledAt > new Date()
      );

      if (activeApplications.length > 0 || upcomingInterviews.length > 0) {
        throw new Error('Cannot delete candidate with active applications or upcoming interviews. Please reject applications first.');
      }

      await this.prisma.candidate.delete({
        where: { id: candidateId },
      });

      logger.info('Candidate deleted successfully', { candidateId, requestingUserId });
    } catch (error) {
      logger.error(`Failed to delete candidate ${candidateId}`, error as Error);
      throw error;
    }
  }

  /**
   * List candidates with filtering and pagination
   */
  async listCandidates(options: ListCandidatesOptions): Promise<{
    candidates: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        status,
        source,
        skills,
        experience,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {
        blacklisted: false, // Exclude blacklisted by default
      };

      if (status) where.status = status;
      if (source) where.source = source;
      if (experience !== undefined) {
        where.experience = { gte: experience };
      }

      if (skills && skills.length > 0) {
        where.skills = {
          hasEvery: skills,
        };
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { currentTitle: { contains: search, mode: 'insensitive' } },
          { currentCompany: { contains: search, mode: 'insensitive' } },
          { skills: { has: search } },
        ];
      }

      const [candidates, total] = await Promise.all([
        this.prisma.candidate.findMany({
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
        this.prisma.candidate.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        candidates,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list candidates', error as Error);
      throw error;
    }
  }

  /**
   * Search candidates with advanced filters
   */
  async searchCandidates(options: SearchCandidatesOptions): Promise<{
    candidates: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        query,
        skills,
        experience,
        location,
        education,
        page,
        limit,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {
        blacklisted: false,
      };

      if (query) {
        where.OR = [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { currentTitle: { contains: query, mode: 'insensitive' } },
          { currentCompany: { contains: query, mode: 'insensitive' } },
          { skills: { has: query } },
        ];
      }

      if (skills && skills.length > 0) {
        where.skills = {
          hasSome: skills,
        };
      }

      if (experience !== undefined) {
        where.experience = { gte: experience };
      }

      if (location) {
        where.address = {
          path: ['city'],
          string_contains: location,
        };
      }

      if (education) {
        where.education = {
          array_contains: [{ degree: { contains: education, mode: 'insensitive' } }],
        };
      }

      const [candidates, total] = await Promise.all([
        this.prisma.candidate.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            currentTitle: true,
            currentCompany: true,
            experience: true,
            skills: true,
            resumeUrl: true,
            source: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                applications: true,
              },
            },
          },
        }),
        this.prisma.candidate.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        candidates,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to search candidates', error as Error);
      throw error;
    }
  }

  /**
   * Upload candidate resume
   */
  async uploadResume(candidateId: string, file: any, requestingUserId: string): Promise<any> {
    try {
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Here you would typically upload to cloud storage (S3, etc.)
      const resumeUrl = `/uploads/resumes/${candidateId}/${file.originalname}`;

      const updatedCandidate = await this.prisma.candidate.update({
        where: { id: candidateId },
        data: {
          resumeUrl,
          updatedAt: new Date(),
        },
      });

      logger.info('Resume uploaded successfully', {
        candidateId,
        fileName: file.originalname,
        requestingUserId,
      });

      return {
        resumeUrl,
        fileName: file.originalname,
        size: file.size,
        uploadedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to upload resume ${candidateId}`, error as Error);
      throw error;
    }
  }

  /**
   * Parse candidate resume
   */
  async parseResume(candidateId: string, requestingUserId: string): Promise<any> {
    try {
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate || !candidate.resumeUrl) {
        throw new Error('Candidate or resume not found');
      }

      // This would typically use a resume parsing service
      const parsedData = {
        name: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        phone: candidate.phone,
        experience: candidate.experience,
        skills: candidate.skills,
        education: candidate.education,
        // Add more parsed fields as needed
      };

      await this.prisma.candidate.update({
        where: { id: candidateId },
        data: {
          resumeData: parsedData,
          updatedAt: new Date(),
        },
      });

      logger.info('Resume parsed successfully', { candidateId, requestingUserId });

      return parsedData;
    } catch (error) {
      logger.error(`Failed to parse resume ${candidateId}`, error as Error);
      throw error;
    }
  }

  /**
   * Blacklist candidate
   */
  async blacklistCandidate(candidateId: string, reason: string, requestingUserId: string): Promise<any> {
    try {
      const candidate = await this.prisma.candidate.update({
        where: { id: candidateId },
        data: {
          blacklisted: true,
          blacklistReason: reason,
          status: 'BLACKLISTED',
          updatedAt: new Date(),
        },
      });

      logger.info('Candidate blacklisted', { candidateId, reason, requestingUserId });

      return candidate;
    } catch (error) {
      logger.error(`Failed to blacklist candidate ${candidateId}`, error as Error);
      throw error;
    }
  }

  /**
   * Remove candidate from blacklist
   */
  async removeFromBlacklist(candidateId: string, requestingUserId: string): Promise<any> {
    try {
      const candidate = await this.prisma.candidate.update({
        where: { id: candidateId },
        data: {
          blacklisted: false,
          blacklistReason: null,
          status: 'NEW',
          updatedAt: new Date(),
        },
      });

      logger.info('Candidate removed from blacklist', { candidateId, requestingUserId });

      return candidate;
    } catch (error) {
      logger.error(`Failed to remove candidate from blacklist ${candidateId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get candidate applications
   */
  async getCandidateApplications(
    candidateId: string,
    options: {
      status?: string;
      page: number;
      limit: number;
      requestingUserId: string;
    }
  ): Promise<{
    applications: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { status, page, limit } = options;
      const skip = (page - 1) * limit;

      const where: any = { candidateId };
      if (status) where.status = status;

      const [applications, total] = await Promise.all([
        this.prisma.application.findMany({
          where,
          skip,
          take: limit,
          orderBy: { appliedAt: 'desc' },
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
            interviews: {
              select: {
                id: true,
                scheduledAt: true,
                status: true,
                type: true,
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
      logger.error(`Failed to get candidate applications ${candidateId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get candidate analytics
   */
  async getCandidateAnalytics(options: {
    startDate?: Date;
    endDate?: Date;
    source?: string;
    status?: string;
    requestingUserId: string;
  }): Promise<CandidateAnalytics> {
    try {
      const { startDate, endDate, source, status } = options;

      const where: any = {};
      if (source) where.source = source;
      if (status) where.status = status;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [
        totalCandidates,
        newCandidates,
        activeCandidates,
        hiredCandidates,
        blacklistedCandidates,
        candidatesBySource,
        candidatesByStatus,
        allCandidates,
      ] = await Promise.all([
        this.prisma.candidate.count({ where }),
        this.prisma.candidate.count({ 
          where: { 
            ...where, 
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
          } 
        }),
        this.prisma.candidate.count({ 
          where: { ...where, status: { in: ['NEW', 'REVIEWING', 'QUALIFIED', 'INTERVIEWING'] } } 
        }),
        this.prisma.candidate.count({ where: { ...where, status: 'HIRED' } }),
        this.prisma.candidate.count({ where: { ...where, blacklisted: true } }),
        this.prisma.candidate.groupBy({
          by: ['source'],
          where,
          _count: { source: true },
        }),
        this.prisma.candidate.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        this.prisma.candidate.findMany({
          where,
          select: { skills: true, experience: true },
        }),
      ]);

      // Calculate top skills
      const skillCounts: Record<string, number> = {};
      allCandidates.forEach(candidate => {
        candidate.skills.forEach(skill => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1;
        });
      });

      const topSkills = Object.entries(skillCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      // Calculate average experience
      const averageExperience = allCandidates.length > 0
        ? allCandidates.reduce((acc, candidate) => acc + (candidate.experience || 0), 0) / allCandidates.length
        : 0;

      // Calculate conversion rate (hired / total)
      const conversionRate = totalCandidates > 0 ? (hiredCandidates / totalCandidates) * 100 : 0;

      const sourceCounts: Record<string, number> = {};
      candidatesBySource.forEach(item => {
        sourceCounts[item.source] = item._count.source;
      });

      const statusCounts: Record<string, number> = {};
      candidatesByStatus.forEach(item => {
        statusCounts[item.status] = item._count.status;
      });

      return {
        totalCandidates,
        newCandidates,
        activeCandidates,
        hiredCandidates,
        blacklistedCandidates,
        candidatesBySource: sourceCounts,
        candidatesByStatus: statusCounts,
        topSkills: topSkills.map(skill => skill.skill),
        averageExperience,
        skillsDistribution: sourceCounts, // Placeholder 
        experienceDistribution: statusCounts, // Placeholder
        conversionRates: {
          candidateToApplication: conversionRate,
          applicationToInterview: 0.3, // Placeholder
          interviewToOffer: 0.2, // Placeholder
        },
      };
    } catch (error) {
      logger.error('Failed to get candidate analytics', error as Error);
      throw error;
    }
  }

  /**
   * Merge duplicate candidates
   */
  async mergeCandidates(primaryId: string, duplicateId: string, requestingUserId: string): Promise<any> {
    try {
      const [primaryCandidate, duplicateCandidate] = await Promise.all([
        this.prisma.candidate.findUnique({
          where: { id: primaryId },
          include: { applications: true, interviews: true },
        }),
        this.prisma.candidate.findUnique({
          where: { id: duplicateId },
          include: { applications: true, interviews: true },
        }),
      ]);

      if (!primaryCandidate || !duplicateCandidate) {
        throw new Error('One or both candidates not found');
      }

      // Transfer applications and interviews to primary candidate
      await Promise.all([
        this.prisma.application.updateMany({
          where: { candidateId: duplicateId },
          data: { candidateId: primaryId },
        }),
        this.prisma.interview.updateMany({
          where: { candidateId: duplicateId },
          data: { candidateId: primaryId },
        }),
      ]);

      // Merge candidate data (keep primary, add missing fields from duplicate)
      const mergedSkills = [...new Set([...primaryCandidate.skills, ...duplicateCandidate.skills])];
      const mergedTags = [...new Set([...primaryCandidate.tags, ...duplicateCandidate.tags])];

      const updatedCandidate = await this.prisma.candidate.update({
        where: { id: primaryId },
        data: {
          skills: mergedSkills,
          tags: mergedTags,
          phone: primaryCandidate.phone || duplicateCandidate.phone,
          linkedInUrl: primaryCandidate.linkedInUrl || duplicateCandidate.linkedInUrl,
          portfolioUrl: primaryCandidate.portfolioUrl || duplicateCandidate.portfolioUrl,
          resumeUrl: primaryCandidate.resumeUrl || duplicateCandidate.resumeUrl,
          notes: primaryCandidate.notes 
            ? `${primaryCandidate.notes}\n\n--- Merged from duplicate ---\n${duplicateCandidate.notes || ''}`
            : duplicateCandidate.notes,
        },
      });

      // Delete duplicate candidate
      await this.prisma.candidate.delete({
        where: { id: duplicateId },
      });

      logger.info('Candidates merged successfully', { primaryId, duplicateId, requestingUserId });

      return updatedCandidate;
    } catch (error) {
      logger.error(`Failed to merge candidates ${primaryId} and ${duplicateId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get user role (simplified implementation)
   */
  private async getUserRole(userId: string): Promise<string> {
    // This would typically fetch from auth service or user table
    // For now, return a default role
    return 'recruiter';
  }
}
