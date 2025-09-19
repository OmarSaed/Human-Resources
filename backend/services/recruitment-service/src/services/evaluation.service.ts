import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import {
  EvaluationData,
  EvaluationSubmissionData,
  ListEvaluationsOptions,
  EvaluationAnalyticsOptions,
  EvaluationAnalytics,
  GenerateReportOptions,
  CandidateRankingOptions
} from '../models/evaluation.models';

const logger = createLogger('evaluation-service');

export class EvaluationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create candidate evaluation
   */
  async createEvaluation(data: EvaluationData): Promise<any> {
    try {
      // Validate candidate and application exist
      const [candidate, application] = await Promise.all([
        this.prisma.candidate.findUnique({ where: { id: data.candidateId } }),
        this.prisma.application.findUnique({ where: { id: data.applicationId } }),
      ]);

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      if (!application) {
        throw new Error('Application not found');
      }

      const evaluation = await this.prisma.evaluation.create({
        data: {
          applicationId: data.applicationId,
          candidateId: data.candidateId,
          evaluatorId: data.evaluatorId,
          type: data.type as any,
          title: data.title,
          criteria: data.criteria || {},
          scores: data.scores || {},
          overallScore: data.overallScore,
          rating: data.rating as any,
          recommendation: data.recommendation as any,
          summary: data.summary,
          strengths: data.strengths || [],
          improvements: data.improvements || [],
          comments: data.comments,
          createdAt: new Date(),
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
          application: {
            select: {
              id: true,
              jobPosting: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      logger.info('Evaluation created successfully', {
        evaluationId: evaluation.id,
        candidateId: data.candidateId,
        applicationId: data.applicationId,
        evaluatorId: data.evaluatorId,
      });

      return evaluation;
    } catch (error) {
      logger.error('Failed to create evaluation', error as Error);
      throw error;
    }
  }

  /**
   * Submit evaluation scores
   */
  async submitEvaluation(
    evaluationId: string,
    data: EvaluationSubmissionData
  ): Promise<any> {
    try {
      // Validate evaluation exists
      const evaluation = await this.prisma.evaluation.findUnique({
        where: { id: evaluationId },
        include: {
          candidate: true,
          application: {
            include: { jobPosting: true },
          },
        },
      });

      if (!evaluation) {
        throw new Error('Evaluation not found');
      }

      if (evaluation.completedAt) {
        throw new Error('Evaluation already completed');
      }

      const updatedEvaluation = await this.prisma.evaluation.update({
        where: { id: evaluationId },
        data: {
          scores: data.scores,
          overallScore: data.overallScore,
          recommendation: data.recommendation as any,
          comments: data.comments,
          completedAt: new Date(),
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
          application: {
            select: {
              id: true,
              jobPosting: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      logger.info('Evaluation submitted successfully', {
        evaluationId,
        overallScore: data.overallScore,
        recommendation: data.recommendation,
        submittedBy: data.submittedBy,
      });

      return updatedEvaluation;
    } catch (error) {
      logger.error('Failed to submit evaluation', error as Error);
      throw error;
    }
  }

  /**
   * Get evaluation by ID
   */
  async getEvaluationById(evaluationId: string): Promise<any> {
    try {
      const evaluation = await this.prisma.evaluation.findUnique({
        where: { id: evaluationId },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              skills: true,
              experience: true,
            },
          },
          application: {
            select: {
              id: true,
              jobPosting: {
                select: {
                  id: true,
                  title: true,
                  department: true,
                  skills: true,
                },
              },
            },
          },
        },
      });

      if (!evaluation) {
        throw new Error('Evaluation not found');
      }

      return evaluation;
    } catch (error) {
      logger.error('Failed to get evaluation', error as Error);
      throw error;
    }
  }

  /**
   * List evaluations with filters
   */
  async listEvaluations(options: ListEvaluationsOptions): Promise<any> {
    try {
      const {
        candidateId,
        jobPostingId,
        type,
        status,
        evaluatorId,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const offset = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (candidateId) {
        where.candidateId = candidateId;
      }

      if (jobPostingId) {
        where.application = {
          jobPostingId,
        };
      }

      if (type) {
        where.type = type;
      }

      if (status) {
        where.status = status;
      }

      if (evaluatorId) {
        where.evaluatorId = evaluatorId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      // Get total count
      const total = await this.prisma.evaluation.count({ where });

      // Get evaluations
      const evaluations = await this.prisma.evaluation.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          application: {
            select: {
              id: true,
              jobPosting: {
                select: {
                  id: true,
                  title: true,
                  department: true,
                },
              },
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: offset,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: evaluations,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to list evaluations', error as Error);
      throw error;
    }
  }

  /**
   * Update evaluation
   */
  async updateEvaluation(
    evaluationId: string,
    updates: Partial<EvaluationData>
  ): Promise<any> {
    try {
      const evaluation = await this.prisma.evaluation.findUnique({
        where: { id: evaluationId },
      });

      if (!evaluation) {
        throw new Error('Evaluation not found');
      }

      const updatedEvaluation = await this.prisma.evaluation.update({
        where: { id: evaluationId },
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
          application: {
            select: {
              id: true,
              jobPosting: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      logger.info('Evaluation updated successfully', {
        evaluationId,
        updates: Object.keys(updates),
      });

      return updatedEvaluation;
    } catch (error) {
      logger.error('Failed to update evaluation', error as Error);
      throw error;
    }
  }

  /**
   * Delete evaluation
   */
  async deleteEvaluation(evaluationId: string): Promise<void> {
    try {
      const evaluation = await this.prisma.evaluation.findUnique({
        where: { id: evaluationId },
      });

      if (!evaluation) {
        throw new Error('Evaluation not found');
      }

      await this.prisma.evaluation.delete({
        where: { id: evaluationId },
      });

      logger.info('Evaluation deleted successfully', {
        evaluationId,
      });
    } catch (error) {
      logger.error('Failed to delete evaluation', error as Error);
      throw error;
    }
  }

  /**
   * Get candidate evaluations summary
   */
  async getCandidateEvaluations(candidateId: string): Promise<any> {
    try {
      const evaluations = await this.prisma.evaluation.findMany({
        where: { candidateId },
          include: {
          application: {
            select: {
              id: true,
              jobPosting: {
              select: {
                id: true,
                  title: true,
                  department: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Calculate summary statistics
      const totalEvaluations = evaluations.length;
      const completedEvaluations = evaluations.filter(
        (e) => e.completedAt !== null
      ).length;
      const averageScore =
        completedEvaluations > 0
          ? evaluations
              .filter((e) => e.completedAt !== null)
              .reduce((sum, e) => sum + e.overallScore, 0) / completedEvaluations
          : 0;

      const recommendationCounts = evaluations.reduce((acc, e) => {
        if (e.recommendation) {
          acc[e.recommendation] = (acc[e.recommendation] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        candidateId,
        totalEvaluations,
        completedEvaluations,
        averageScore: Math.round(averageScore * 100) / 100,
        recommendationDistribution: recommendationCounts,
        evaluations,
      };
    } catch (error) {
      logger.error('Failed to get candidate evaluations', error as Error);
      throw error;
    }
  }

  /**
   * Get evaluation analytics
   */
  async getEvaluationAnalytics(
    options: EvaluationAnalyticsOptions
  ): Promise<EvaluationAnalytics> {
    try {
      const { candidateId, jobPostingId, startDate, endDate } = options;

      // Build where clause
      const where: any = {};

      if (candidateId) {
        where.candidateId = candidateId;
      }

      if (jobPostingId) {
        where.application = {
          jobPostingId,
        };
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      // Get evaluations
      const evaluations = await this.prisma.evaluation.findMany({
          where,
          include: {
          candidate: true,
        },
      });

      const totalEvaluations = evaluations.length;
      const completedEvaluations = evaluations.filter(
        (e) => e.completedAt !== null
      ).length;
      const averageScore =
        completedEvaluations > 0
          ? evaluations
              .filter((e) => e.completedAt !== null)
              .reduce((sum, e) => sum + e.overallScore, 0) / completedEvaluations
          : 0;

      // Group by type
      const evaluationsByType = evaluations.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by rating
      const evaluationsByRating = evaluations.reduce((acc, e) => {
        if (e.rating) {
          acc[e.rating] = (acc[e.rating] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Recommendation distribution
      const recommendationDistribution = evaluations.reduce((acc, e) => {
        if (e.recommendation) {
          acc[e.recommendation] = (acc[e.recommendation] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Evaluator performance
      const evaluatorPerformance = evaluations.reduce((acc, e) => {
        if (!acc[e.evaluatorId]) {
          acc[e.evaluatorId] = {
            evaluatorId: e.evaluatorId,
            evaluationsCount: 0,
            totalScore: 0,
            consistency: 0,
          };
        }
        acc[e.evaluatorId].evaluationsCount++;
        acc[e.evaluatorId].totalScore += e.overallScore;
        return acc;
      }, {} as Record<string, any>);

      // Calculate averages
      Object.values(evaluatorPerformance).forEach((perf: any) => {
        perf.averageScore = perf.totalScore / perf.evaluationsCount;
        delete perf.totalScore;
      });

      // Score distribution
      const scoreDistribution = [
        { range: '0-2', count: 0 },
        { range: '2-4', count: 0 },
        { range: '4-6', count: 0 },
        { range: '6-8', count: 0 },
        { range: '8-10', count: 0 },
      ];

      evaluations.forEach((e) => {
        const score = e.overallScore;
        if (score <= 2) scoreDistribution[0].count++;
        else if (score <= 4) scoreDistribution[1].count++;
        else if (score <= 6) scoreDistribution[2].count++;
        else if (score <= 8) scoreDistribution[3].count++;
        else scoreDistribution[4].count++;
      });

      return {
        totalEvaluations,
        completedEvaluations,
        averageScore: Math.round(averageScore * 100) / 100,
        evaluationsByType,
        evaluationsByRating,
        recommendationDistribution,
        evaluatorPerformance: Object.values(evaluatorPerformance),
        scoreDistribution,
        timeToComplete: {
          average: 5, // Placeholder
          median: 4, // Placeholder
        },
      };
    } catch (error) {
      logger.error('Failed to get evaluation analytics', error as Error);
      throw error;
    }
  }

  /**
   * Generate evaluation report
   */
  async generateReport(options: GenerateReportOptions): Promise<any> {
    try {
      const { candidateId, jobPostingId, startDate, endDate, format } = options;

      // Build where clause
      const where: any = {};

      if (candidateId) {
        where.candidateId = candidateId;
      }

      if (jobPostingId) {
        where.application = {
          jobPostingId,
        };
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = startDate;
        }
        if (endDate) {
          where.createdAt.lte = endDate;
        }
      }

      const evaluations = await this.prisma.evaluation.findMany({
        where,
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              skills: true,
            },
          },
          application: {
            select: {
              id: true,
              jobPosting: {
                select: {
                  id: true,
                  title: true,
                  department: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Format based on requested format
      if (format === 'PDF') {
        // Generate PDF report (placeholder)
        return {
          format: 'PDF',
          data: evaluations,
          summary: {
            totalEvaluations: evaluations.length,
            averageScore:
              evaluations.length > 0
                ? evaluations.reduce((sum, e) => sum + e.overallScore, 0) /
                  evaluations.length
                : 0,
          },
        };
      } else if (format === 'CSV') {
        // Generate CSV data
        const csvData = evaluations.map((e) => ({
          evaluationId: e.id,
          candidateId: e.candidateId,
          candidateName: `${e.candidate.firstName} ${e.candidate.lastName}`,
          jobTitle: e.application.jobPosting.title,
          department: e.application.jobPosting.department,
          type: e.type,
          overallScore: e.overallScore,
          rating: e.rating,
          recommendation: e.recommendation,
          createdAt: e.createdAt,
        }));

        return {
          format: 'CSV',
          data: csvData,
        };
      } else {
        return {
          format: 'EXCEL',
          data: evaluations,
        };
      }
    } catch (error) {
      logger.error('Failed to generate evaluation report', error as Error);
      throw error;
    }
  }

  /**
   * Rank candidates for a job
   */
  async rankCandidates(options: CandidateRankingOptions): Promise<any> {
    try {
      const { jobPostingId, criteria, weights, includeInterviews, includeAssessments } = options;

      if (!jobPostingId) {
        throw new Error('Job posting ID is required for candidate ranking');
      }

      // Get all applications for this job
      const applications = await this.prisma.application.findMany({
        where: { jobPostingId },
        include: {
          candidate: true,
          evaluations: {
            where: { NOT: { completedAt: new Date() } },
          },
          interviews: includeInterviews ? true : false,
        },
      });

      // Calculate scores for each candidate
      const rankedCandidates = applications.map((app) => {
        const evaluations = app.evaluations;
        const averageScore =
          evaluations.length > 0
            ? evaluations.reduce((sum, e) => sum + e.overallScore, 0) /
              evaluations.length
            : 0;

        let totalScore = averageScore;

        // Apply weights if provided
        if (weights) {
          totalScore = Object.entries(weights).reduce((score, [criterion, weight]) => {
            // Calculate criterion-specific score (placeholder logic)
            const criterionScore = averageScore; // Simplified
            return score + criterionScore * weight;
          }, 0);
        }

        return {
          candidateId: app.candidateId,
          candidate: app.candidate,
          applicationId: app.id,
          averageEvaluationScore: Math.round(averageScore * 100) / 100,
          totalScore: Math.round(totalScore * 100) / 100,
          evaluationsCount: evaluations.length,
          interviews: includeInterviews ? app.interviews : undefined,
        };
      });

      // Sort by total score (descending)
      rankedCandidates.sort((a, b) => b.totalScore - a.totalScore);

      return {
        jobPostingId,
        totalCandidates: rankedCandidates.length,
        rankedCandidates,
        criteria: criteria || [],
        weights: weights || {},
      };
    } catch (error) {
      logger.error('Failed to rank candidates', error as Error);
      throw error;
    }
  }
}
