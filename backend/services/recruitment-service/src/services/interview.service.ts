import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('interview-service');

export interface InterviewData {
  applicationId: string;
  candidateId: string;
  jobPostingId: string;
  type: 'PHONE_SCREEN' | 'VIDEO_CALL' | 'TECHNICAL_INTERVIEW' | 'BEHAVIORAL_INTERVIEW' | 'PANEL_INTERVIEW' | 'ONSITE_INTERVIEW' | 'FINAL_INTERVIEW' | 'CULTURAL_FIT' | 'TECHNICAL_ASSESSMENT';
  title: string;
  description?: string;
  scheduledAt: Date;
  duration: number;
  location?: string;
  timezone?: string;
  interviewerId: string;
  interviewers?: string[];
  round?: number;
}

export interface ListInterviewsOptions {
  applicationId?: string;
  candidateId?: string;
  jobPostingId?: string;
  interviewerId?: string;
  status?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface InterviewFeedback {
  overallRating?: number;
  technicalRating?: number;
  communicationRating?: number;
  culturalFitRating?: number;
  feedback?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string;
  nextSteps?: string;
  submittedBy: string;
}

export interface InterviewAnalytics {
  totalInterviews: number;
  completedInterviews: number;
  cancelledInterviews: number;
  noShowRate: number;
  averageRating: number;
  interviewsByType: Record<string, number>;
  interviewsByStatus: Record<string, number>;
  topInterviewers: Array<{ interviewerId: string; count: number; averageRating: number }>;
  averageInterviewDuration: number;
}

export class InterviewService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Schedule a new interview
   */
  async scheduleInterview(data: InterviewData, scheduledBy: string): Promise<any> {
    try {
      // Validate application exists and is in valid state
      const application = await this.prisma.application.findUnique({
        where: { id: data.applicationId },
        include: { candidate: true, jobPosting: true },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      if (application.candidate.blacklisted) {
        throw new Error('Cannot schedule interview for blacklisted candidate');
      }

      // Check for scheduling conflicts
      const conflictingInterviews = await this.prisma.interview.findMany({
        where: {
          interviewerId: data.interviewerId,
          scheduledAt: {
            gte: new Date(data.scheduledAt.getTime() - (data.duration * 60 * 1000)),
            lte: new Date(data.scheduledAt.getTime() + (data.duration * 60 * 1000)),
          },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
      });

      if (conflictingInterviews.length > 0) {
        throw new Error('Interviewer has a conflicting interview at the scheduled time');
      }

      const interview = await this.prisma.interview.create({
        data: {
          applicationId: data.applicationId,
          candidateId: data.candidateId,
          jobPostingId: data.jobPostingId,
          type: data.type,
          title: data.title,
          description: data.description,
          scheduledAt: data.scheduledAt,
          duration: data.duration,
          location: data.location,
          timezone: data.timezone || 'UTC',
          interviewerId: data.interviewerId,
          interviewers: data.interviewers || [data.interviewerId],
          round: data.round || 1,
          status: 'SCHEDULED',
        },
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
          application: {
            select: {
              id: true,
              status: true,
              stage: true,
            },
          },
        },
      });

      // Update application stage if needed
      if (application.stage === 'SCREENING') {
        await this.prisma.application.update({
          where: { id: data.applicationId },
          data: { stage: 'INTERVIEWING' },
        });
      }

      logger.info('Interview scheduled successfully', {
        interviewId: interview.id,
        candidateId: data.candidateId,
        jobPostingId: data.jobPostingId,
        scheduledAt: data.scheduledAt,
      });

      return interview;
    } catch (error) {
      logger.error('Failed to schedule interview', error as Error);
      throw error;
    }
  }

  /**
   * Get interview by ID
   */
  async getInterview(interviewId: string, requestingUserId: string): Promise<any | null> {
    try {
      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
        include: {
          candidate: {
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
            },
          },
          jobPosting: {
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
            },
          },
          application: {
            select: {
              id: true,
              status: true,
              stage: true,
              overallScore: true,
              technicalScore: true,
              culturalScore: true,
              experienceScore: true,
            },
          },
        },
      });

      if (!interview) {
        return null;
      }

      // Check access permissions
      const hasAccess = await this.checkInterviewAccess(interview, requestingUserId);
      if (!hasAccess) {
        return null;
      }

      return interview;
    } catch (error) {
      logger.error(`Failed to get interview ${interviewId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update interview
   */
  async updateInterview(
    interviewId: string, 
    updates: Partial<InterviewData>, 
    requestingUserId: string
  ): Promise<any> {
    try {
      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
        include: { jobPosting: true },
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      const hasAccess = await this.checkInterviewAccess(interview, requestingUserId);
      if (!hasAccess) {
        throw new Error('You do not have permission to update this interview');
      }

      // Check if interview can be updated
      if (interview.status === 'COMPLETED') {
        throw new Error('Cannot update completed interview');
      }

      const updatedInterview = await this.prisma.interview.update({
        where: { id: interviewId },
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

      logger.info('Interview updated successfully', {
        interviewId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedInterview;
    } catch (error) {
      logger.error(`Failed to update interview ${interviewId}`, error as Error);
      throw error;
    }
  }

  /**
   * Cancel interview
   */
  async cancelInterview(interviewId: string, reason: string, requestingUserId: string): Promise<any> {
    try {
      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
        include: { jobPosting: true },
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      const hasAccess = await this.checkInterviewAccess(interview, requestingUserId);
      if (!hasAccess) {
        throw new Error('You do not have permission to cancel this interview');
      }

      if (interview.status === 'COMPLETED') {
        throw new Error('Cannot cancel completed interview');
      }

      const updatedInterview = await this.prisma.interview.update({
        where: { id: interviewId },
        data: {
          status: 'CANCELLED',
          notes: reason,
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

      logger.info('Interview cancelled', { interviewId, reason, requestingUserId });

      return updatedInterview;
    } catch (error) {
      logger.error(`Failed to cancel interview ${interviewId}`, error as Error);
      throw error;
    }
  }

  /**
   * List interviews with filtering and pagination
   */
  async listInterviews(options: ListInterviewsOptions): Promise<{
    interviews: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        applicationId,
        candidateId,
        jobPostingId,
        interviewerId,
        status,
        type,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (applicationId) where.applicationId = applicationId;
      if (candidateId) where.candidateId = candidateId;
      if (jobPostingId) where.jobPostingId = jobPostingId;
      if (interviewerId) where.interviewerId = interviewerId;
      if (status) where.status = status;
      if (type) where.type = type;

      if (startDate || endDate) {
        where.scheduledAt = {};
        if (startDate) where.scheduledAt.gte = startDate;
        if (endDate) where.scheduledAt.lte = endDate;
      }

      const [interviews, total] = await Promise.all([
        this.prisma.interview.findMany({
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
                currentTitle: true,
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
            application: {
              select: {
                id: true,
                status: true,
                stage: true,
              },
            },
          },
        }),
        this.prisma.interview.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        interviews,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list interviews', error as Error);
      throw error;
    }
  }

  /**
   * Submit interview feedback
   */
  async submitFeedback(interviewId: string, feedback: InterviewFeedback): Promise<any> {
    try {
      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      if (interview.status !== 'SCHEDULED' && interview.status !== 'IN_PROGRESS') {
        throw new Error('Can only submit feedback for scheduled or in-progress interviews');
      }

      const updatedInterview = await this.prisma.interview.update({
        where: { id: interviewId },
        data: {
          status: 'COMPLETED',
          result: this.determineInterviewResult(feedback.overallRating),
          overallRating: feedback.overallRating,
          technicalRating: feedback.technicalRating,
          communicationRating: feedback.communicationRating,
          culturalFitRating: feedback.culturalFitRating,
          feedback: feedback.feedback,
          strengths: feedback.strengths || [],
          weaknesses: feedback.weaknesses || [],
          recommendations: feedback.recommendations,
          nextSteps: feedback.nextSteps,
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
          application: {
            select: {
              id: true,
              status: true,
              stage: true,
            },
          },
        },
      });

      logger.info('Interview feedback submitted', {
        interviewId,
        overallRating: feedback.overallRating,
        submittedBy: feedback.submittedBy,
      });

      return updatedInterview;
    } catch (error) {
      logger.error(`Failed to submit interview feedback ${interviewId}`, error as Error);
      throw error;
    }
  }

  /**
   * Reschedule interview
   */
  async rescheduleInterview(
    interviewId: string, 
    rescheduleData: { scheduledAt: Date; reason?: string; rescheduledBy: string }
  ): Promise<any> {
    try {
      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      if (interview.status !== 'SCHEDULED') {
        throw new Error('Can only reschedule scheduled interviews');
      }

      // Check for conflicts at new time
      const conflictingInterviews = await this.prisma.interview.findMany({
        where: {
          interviewerId: interview.interviewerId,
          scheduledAt: {
            gte: new Date(rescheduleData.scheduledAt.getTime() - (interview.duration * 60 * 1000)),
            lte: new Date(rescheduleData.scheduledAt.getTime() + (interview.duration * 60 * 1000)),
          },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          id: { not: interviewId },
        },
      });

      if (conflictingInterviews.length > 0) {
        throw new Error('Interviewer has a conflicting interview at the new scheduled time');
      }

      const updatedInterview = await this.prisma.interview.update({
        where: { id: interviewId },
        data: {
          scheduledAt: rescheduleData.scheduledAt,
          status: 'RESCHEDULED',
          notes: rescheduleData.reason || interview.notes,
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

      // Immediately set back to scheduled
      await this.prisma.interview.update({
        where: { id: interviewId },
        data: { status: 'SCHEDULED' },
      });

      logger.info('Interview rescheduled', {
        interviewId,
        newScheduledAt: rescheduleData.scheduledAt,
        rescheduledBy: rescheduleData.rescheduledBy,
      });

      return updatedInterview;
    } catch (error) {
      logger.error(`Failed to reschedule interview ${interviewId}`, error as Error);
      throw error;
    }
  }

  /**
   * Mark interview as no-show
   */
  async markNoShow(interviewId: string, notes: string, requestingUserId: string): Promise<any> {
    try {
      const interview = await this.prisma.interview.update({
        where: { id: interviewId },
        data: {
          status: 'NO_SHOW',
          notes,
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

      logger.info('Interview marked as no-show', { interviewId, requestingUserId });

      return interview;
    } catch (error) {
      logger.error(`Failed to mark interview as no-show ${interviewId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get interviewer schedule
   */
  async getInterviewerSchedule(
    interviewerId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      requestingUserId: string;
    }
  ): Promise<any[]> {
    try {
      const { startDate, endDate } = options;

      const where: any = {
        interviewerId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      };

      if (startDate || endDate) {
        where.scheduledAt = {};
        if (startDate) where.scheduledAt.gte = startDate;
        if (endDate) where.scheduledAt.lte = endDate;
      }

      const schedule = await this.prisma.interview.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
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

      return schedule;
    } catch (error) {
      logger.error('Failed to get interviewer schedule', error as Error);
      throw error;
    }
  }

  /** 
   * Get interview analytics
   */
  async getInterviewAnalytics(options: {
    startDate?: Date;
    endDate?: Date;
    interviewerId?: string;
    jobPostingId?: string;
    requestingUserId: string;
  }): Promise<InterviewAnalytics> {
    try {
      const { startDate, endDate, interviewerId, jobPostingId } = options;

      const where: any = {};
      if (interviewerId) where.interviewerId = interviewerId;
      if (jobPostingId) where.jobPostingId = jobPostingId;
      if (startDate || endDate) {
        where.scheduledAt = {};
        if (startDate) where.scheduledAt.gte = startDate;
        if (endDate) where.scheduledAt.lte = endDate;
      }

      const [
        totalInterviews,
        completedInterviews,
        cancelledInterviews,
        noShowInterviews,
        interviewsByType,
        interviewsByStatus,
        allInterviews,
      ] = await Promise.all([
        this.prisma.interview.count({ where }),
        this.prisma.interview.count({ where: { ...where, status: 'COMPLETED' } }),
        this.prisma.interview.count({ where: { ...where, status: 'CANCELLED' } }),
        this.prisma.interview.count({ where: { ...where, status: 'NO_SHOW' } }),
        this.prisma.interview.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
        }),
        this.prisma.interview.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        this.prisma.interview.findMany({
          where,
          select: {
            overallRating: true,
            duration: true,
            interviewerId: true,
          },
        }),
      ]);

      // Calculate metrics
      const noShowRate = totalInterviews > 0 ? (noShowInterviews / totalInterviews) * 100 : 0;
      
      const ratingsArray = allInterviews
        .filter(i => i.overallRating !== null)
        .map(i => i.overallRating!);
      const averageRating = ratingsArray.length > 0 
        ? ratingsArray.reduce((sum, rating) => sum + rating, 0) / ratingsArray.length 
        : 0;

      const averageInterviewDuration = allInterviews.length > 0
        ? allInterviews.reduce((sum, interview) => sum + interview.duration, 0) / allInterviews.length
        : 0;

      // Top interviewers
      const interviewerCounts: Record<string, { count: number; ratings: number[] }> = {};
      allInterviews.forEach(interview => {
        if (!interviewerCounts[interview.interviewerId]) {
          interviewerCounts[interview.interviewerId] = { count: 0, ratings: [] };
        }
        interviewerCounts[interview.interviewerId].count++;
        if (interview.overallRating) {
          interviewerCounts[interview.interviewerId].ratings.push(interview.overallRating);
        }
      });

      const topInterviewers = Object.entries(interviewerCounts)
        .map(([interviewerId, data]) => ({
          interviewerId,
          count: data.count,
          averageRating: data.ratings.length > 0 
            ? data.ratings.reduce((sum, rating) => sum + rating, 0) / data.ratings.length 
            : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const typeCounts: Record<string, number> = {};
      interviewsByType.forEach(item => {
        typeCounts[item.type] = item._count.type;
      });

      const statusCounts: Record<string, number> = {};
      interviewsByStatus.forEach(item => {
        statusCounts[item.status] = item._count.status;
      });

      return {
        totalInterviews,
        completedInterviews,
        cancelledInterviews,
        noShowRate,
        averageRating,
        interviewsByType: typeCounts,
        interviewsByStatus: statusCounts,
        topInterviewers,
        averageInterviewDuration,
      };
    } catch (error) {
      logger.error('Failed to get interview analytics', error as Error);
      throw error;
    }
  }

  /**
   * Check interviewer availability
   */
  async checkInterviewerAvailability(
    interviewerId: string,
    date: Date,
    duration: number
  ): Promise<{ isAvailable: boolean; conflicts: any[] }> {
    try {
      const startTime = new Date(date);
      const endTime = new Date(date.getTime() + (duration * 60 * 1000));

      const conflicts = await this.prisma.interview.findMany({
        where: {
          interviewerId,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          scheduledAt: {
            lt: endTime,
          },
          // Check if the existing interview ends after the proposed start time
          // This requires calculating end time on the fly
        },
        include: {
          candidate: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          jobPosting: {
            select: {
              title: true,
            },
          },
        },
      });

      // Filter conflicts by actual overlap
      const actualConflicts = conflicts.filter(interview => {
        const existingEndTime = new Date(interview.scheduledAt.getTime() + (interview.duration * 60 * 1000));
        return interview.scheduledAt < endTime && existingEndTime > startTime;
      });

      return {
        isAvailable: actualConflicts.length === 0,
        conflicts: actualConflicts,
      };
    } catch (error) {
      logger.error(`Failed to check interviewer availability ${interviewerId}`, error as Error);
      throw error;
    }
  }

  /**
   * Check if user has access to interview
   */
  private async checkInterviewAccess(interview: any, userId: string): Promise<boolean> {
    // Check if user is interviewer, hiring manager, recruiter, or has admin access
    return (
      interview.interviewerId === userId ||
      interview.interviewers?.includes(userId) ||
      interview.jobPosting?.hiringManagerId === userId ||
      interview.jobPosting?.recruiterId === userId
    );
  }

  /**
   * Determine interview result based on rating
   */
  private determineInterviewResult(rating?: number): 'PASS' | 'FAIL' | 'MAYBE' | 'STRONG_PASS' | 'STRONG_FAIL' {
    if (!rating) return 'MAYBE';
    
    if (rating >= 9) return 'STRONG_PASS';
    if (rating >= 7) return 'PASS';
    if (rating >= 5) return 'MAYBE';
    if (rating >= 3) return 'FAIL';
    return 'STRONG_FAIL';
  }
}
