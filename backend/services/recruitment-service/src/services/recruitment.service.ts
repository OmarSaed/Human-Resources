import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import { CandidateService } from './candidate.service';
import { JobPostingService } from './job-posting.service';
import { InterviewService } from './interview.service';
import { KafkaProducerService } from './kafka-producer.service';
import { RecruitmentMetrics, RecruitmentPipeline } from '../models/shared.models';

const logger = createLogger('recruitment-service');



export class RecruitmentService {
  constructor(
    private prisma: PrismaClient,
    private candidateService: CandidateService,
    private jobPostingService: JobPostingService,
    private interviewService: InterviewService,
    // private onboardingService: OnboardingService, // TODO: Add onboarding service when available
    private kafkaProducer: KafkaProducerService
  ) {}

  /**
   * Get recruitment metrics and KPIs
   */
  async getRecruitmentMetrics(startDate?: Date, endDate?: Date): Promise<RecruitmentMetrics> {
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    } : {};

    // Get basic counts
    const [
      totalJobPostings,
      activeJobPostings,
      totalCandidates,
      activeCandidates,
      totalApplications,
      interviewsScheduled,
      offersExtended,
      hiresCompleted
    ] = await Promise.all([
      this.prisma.jobPosting.count({ where: dateFilter }),
      this.prisma.jobPosting.count({ where: { ...dateFilter, status: 'ACTIVE' } }),
      this.prisma.candidate.count({ where: dateFilter }),
      this.prisma.candidate.count({ where: { ...dateFilter, status: { in: ['REVIEWING', 'QUALIFIED', 'INTERVIEWING'] } } }),
      this.prisma.application.count({ where: dateFilter }),
      this.prisma.interview.count({ where: { ...dateFilter, status: 'SCHEDULED' } }),
      this.prisma.application.count({ where: { ...dateFilter, status: 'OFFER_EXTENDED' } }),
      this.prisma.application.count({ where: { ...dateFilter, status: 'HIRED' } }),
    ]);

    // Calculate conversion rates
    const applicationsToInterview = await this.prisma.application.count({
      where: { ...dateFilter, status: { in: ['PHONE_SCREEN', 'TECHNICAL_TEST', 'ONSITE_INTERVIEW', 'FINAL_REVIEW', 'OFFER_EXTENDED', 'HIRED'] } },
    });

    const offersToHires = await this.prisma.application.count({
      where: { ...dateFilter, status: 'HIRED' },
    });

    // Calculate average time to hire
    const hiredApplications = await this.prisma.application.findMany({
      where: { ...dateFilter, status: 'HIRED' },
      select: {
        appliedAt: true,
        updatedAt: true,
      },
    });

    const averageTimeToHire = hiredApplications.length > 0
      ? hiredApplications.reduce((sum, app) => {
          const days = Math.ceil((app.updatedAt.getTime() - app.appliedAt.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / hiredApplications.length
      : 0;

    return {
      totalJobPostings,
      activeJobPostings,
      totalCandidates,
      activeCandidates,
      totalApplications,
      interviewsScheduled,
      offersExtended,
      hiresCompleted,
      averageTimeToHire,
      conversionRates: {
        applicationToInterview: totalApplications > 0 ? (applicationsToInterview / totalApplications) * 100 : 0,
        interviewToOffer: applicationsToInterview > 0 ? (offersExtended / applicationsToInterview) * 100 : 0,
        offerToHire: offersExtended > 0 ? (offersToHires / offersExtended) * 100 : 0,
      },
    };
  }

  /**
   * Get recruitment pipeline for all active jobs or specific job
   */
  async getRecruitmentPipeline(jobId?: string): Promise<RecruitmentPipeline[]> {
    const jobFilter = jobId ? { id: jobId } : { status: 'ACTIVE' };

    const jobs = await this.prisma.jobPosting.findMany({
      where: typeof jobFilter === 'object' && 'id' in jobFilter ? { id: jobFilter.id } : { status: jobFilter as any }, // Type fix for jobFilter
      include: {
        applications: {
          include: {
            interviews: true,
          },
        },
      },
    });

    return jobs.map(job => {
      const applications: any[] = []; // TODO: Add applications relation to JobPosting model
      const totalApplications = applications.length;

      // Group by stage and status
      const byStage: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      applications.forEach((app: any) => {
        byStage[app.stage] = (byStage[app.stage] || 0) + 1;
        byStatus[app.status] = (byStatus[app.status] || 0) + 1;
      });

      // Interview stats
      const allInterviews = applications.flatMap((app: any) => app.interviews || []);
      const scheduledInterviews = allInterviews.filter((i: any) => i.status === 'SCHEDULED').length;
      const completedInterviews = allInterviews.filter((i: any) => i.status === 'COMPLETED').length;
      const avgRating = completedInterviews > 0
        ? allInterviews
            .filter((i: any) => i.status === 'COMPLETED' && i.overallRating)
            .reduce((sum: number, i: any) => sum + (i.overallRating || 0), 0) / completedInterviews
        : 0;

      // Offer stats
      const offersExtended = applications.filter((app: any) => app.status === 'OFFER_EXTENDED').length;
      const offersAccepted = applications.filter((app: any) => app.status === 'OFFER_ACCEPTED').length;
      const offersDeclined = applications.filter((app: any) => app.status === 'OFFER_DECLINED').length;

      return {
        jobId: job.id,
        jobTitle: job.title,
        applications: {
          total: totalApplications,
          byStage,
          byStatus,
        },
        interviews: {
          scheduled: scheduledInterviews,
          completed: completedInterviews,
          avgRating,
        },
        offers: {
          extended: offersExtended,
          accepted: offersAccepted,
          declined: offersDeclined,
          pending: offersExtended - offersAccepted - offersDeclined,
        },
      };
    });
  }

  /**
   * Process new application
   */
  async processNewApplication(applicationData: {
    candidateId: string;
    jobPostingId: string;
    source?: string;
    applicationData?: any;
  }): Promise<string> {
    const application = await this.prisma.application.create({
      data: {
        candidateId: applicationData.candidateId,
        jobPostingId: applicationData.jobPostingId,
        source: applicationData.source as any,
        applicationData: applicationData.applicationData,
        status: 'APPLIED',
        stage: 'SCREENING',
      },
      include: {
        candidate: true,
        jobPosting: true,
      },
    });

    // Publish event
    await this.kafkaProducer.publishEvent('recruitment-events', {
      id: `app_${application.id}`,
      type: 'recruitment.application.received',
      timestamp: new Date(),
      version: '1.0.0',
      source: 'recruitment-service',
      data: {
        applicationId: application.id,
        candidateId: application.candidateId,
        candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
        candidateEmail: application.candidate.email,
        jobPostingId: application.jobPostingId,
        positionTitle: application.jobPosting.title,
        source: application.source,
        appliedAt: application.appliedAt,
      },
    });

    logger.info('New application processed', {
      applicationId: application.id,
      candidateId: application.candidateId,
      jobPostingId: application.jobPostingId,
    });

    return application.id;
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    applicationId: string,
    status: string,
    stage?: string,
    reason?: string,
    changedBy?: string
  ): Promise<void> {
    const currentApplication = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { candidate: true, jobPosting: true },
    });

    if (!currentApplication) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    // Update application
    const updatedApplication = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: status as any,
        stage: stage as any || currentApplication.stage,
        lastStatusChange: new Date(),
      },
    });

    // Record status history
    await this.prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        fromStatus: currentApplication.status,
        toStatus: status as any,
        fromStage: currentApplication.stage,
        toStage: stage as any || currentApplication.stage,
        reason,
        changedBy: changedBy || 'system',
      },
    });

    // Publish event
    await this.kafkaProducer.publishEvent('recruitment-events', {
      id: `status_${applicationId}_${Date.now()}`,
      type: 'recruitment.status.updated',
      timestamp: new Date(),
      version: '1.0.0',
      source: 'recruitment-service',
      data: {
        applicationId,
        candidateId: currentApplication.candidateId,
        candidateName: `${currentApplication.candidate.firstName} ${currentApplication.candidate.lastName}`,
        candidateEmail: currentApplication.candidate.email,
        jobPostingId: currentApplication.jobPostingId,
        positionTitle: currentApplication.jobPosting.title,
        previousStatus: currentApplication.status,
        newStatus: status,
        reason,
        changedBy,
      },
    });

    logger.info('Application status updated', {
      applicationId,
      previousStatus: currentApplication.status,
      newStatus: status,
      changedBy,
    });
  }

  /**
   * Auto-screen candidates based on job requirements
   */
  async autoScreenCandidates(jobPostingId: string): Promise<void> {
    const jobPosting = await this.prisma.jobPosting.findUnique({
      where: { id: jobPostingId },
    });

    if (!jobPosting) {
      throw new Error(`Job posting not found: ${jobPostingId}`);
    }

    const applications = await this.prisma.application.findMany({
      where: {
        jobPostingId,
        status: 'APPLIED',
        stage: 'SCREENING',
      },
      include: {
        candidate: true,
      },
    });

    for (const application of applications) {
      try {
        const candidate = application.candidate;
        let score = 0;
        let maxScore = 0;

        // Check experience requirements
        if (candidate.experience !== null && candidate.experience !== undefined) {
          maxScore += 20;
          // Assuming job posting has minimum experience requirement
          // This would need to be extracted from requirements or stored separately
          score += Math.min(candidate.experience * 2, 20);
        }

        // Check skills match
        if (candidate.skills.length > 0 && jobPosting.skills.length > 0) {
          maxScore += 40;
          const matchingSkills = candidate.skills.filter(skill => 
            jobPosting.skills.some(jobSkill => 
              jobSkill.toLowerCase().includes(skill.toLowerCase()) ||
              skill.toLowerCase().includes(jobSkill.toLowerCase())
            )
          ).length;
          score += (matchingSkills / jobPosting.skills.length) * 40;
        }

        // Check location compatibility
        maxScore += 20;
        // This would need more sophisticated location matching
        score += 15; // Default partial score

        // Check education requirements
        maxScore += 20;
        if (candidate.education && Array.isArray(candidate.education) && candidate.education.length > 0) {
          score += 15; // Base score for having education
        }

        const finalScore = maxScore > 0 ? (score / maxScore) * 100 : 0;

        // Update application with score
        await this.prisma.application.update({
          where: { id: application.id },
          data: {
            overallScore: finalScore,
            experienceScore: candidate.experience ? Math.min(candidate.experience * 10, 100) : 0,
          },
        });

        // Auto-advance highly qualified candidates
        if (finalScore >= 75) {
          await this.updateApplicationStatus(
            application.id,
            'PHONE_SCREEN',
            'ASSESSMENT',
            'Auto-advanced due to high qualification score',
            'auto-screening'
          );
        } else if (finalScore < 30) {
          await this.updateApplicationStatus(
            application.id,
            'REJECTED',
            'SCREENING',
            'Auto-rejected due to low qualification score',
            'auto-screening'
          );
        }

        logger.info('Candidate auto-screened', {
          applicationId: application.id,
          candidateId: candidate.id,
          score: finalScore,
        });

      } catch (error) {
        logger.error('Error auto-screening candidate', {
          applicationId: application.id,
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Generate recruitment report
   */
  async generateRecruitmentReport(
    startDate: Date,
    endDate: Date,
    options: {
      includeDepartments?: string[];
      includePositions?: string[];
      includeRecruiters?: string[];
    } = {}
  ): Promise<any> {
    const baseFilter = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Add optional filters
    const jobFilter: any = { ...baseFilter };
    if (options.includeDepartments?.length) {
      jobFilter.department = { in: options.includeDepartments };
    }

    // Get comprehensive data
    const [metrics, pipeline, departmentStats, recruiterStats] = await Promise.all([
      this.getRecruitmentMetrics(startDate, endDate),
      this.getRecruitmentPipeline(),
      this.getDepartmentStats(startDate, endDate),
      this.getRecruiterStats(startDate, endDate),
    ]);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: metrics,
      pipeline,
      departmentBreakdown: departmentStats,
      recruiterPerformance: recruiterStats,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getDepartmentStats(startDate: Date, endDate: Date): Promise<any[]> {
    const departments = await this.prisma.jobPosting.groupBy({
      by: ['department'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    return departments.map(dept => ({
      department: dept.department,
      jobPostings: dept._count.id,
    }));
  }

  private async getRecruiterStats(startDate: Date, endDate: Date): Promise<any[]> {
    const recruiters = await this.prisma.application.groupBy({
      by: ['recruiterId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        recruiterId: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
    });

    return recruiters
      .filter(r => r.recruiterId)
      .map(recruiter => ({
        recruiterId: recruiter.recruiterId,
        applicationsManaged: recruiter._count.id,
      }));
  }
}
