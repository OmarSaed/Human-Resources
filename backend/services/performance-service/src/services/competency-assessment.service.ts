import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import {
  CompetencyAssessmentData,
  ListAssessmentsOptions,
  GetUserAssessmentsOptions,
  AssessmentSubmissionData,
  AssessmentAnalyticsOptions,
  CompetencyScoresSummaryOptions,
  AssessmentAnalytics
} from '../models/competency.models';

const logger = createLogger('competency-assessment-service');


export class CompetencyAssessmentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new competency assessment
   */
  async createAssessment(data: CompetencyAssessmentData): Promise<any> {
    try {
      // Validate competency exists
      const competency = await this.prisma.competency.findUnique({
        where: { id: data.competencyId },
        include: { framework: true },
      });

      if (!competency) {
        throw new Error('Competency not found');
      }

      if (!competency.isActive || !competency.framework.isActive) {
        throw new Error('Cannot create assessment for inactive competency or framework');
      }

      // Check if assessment already exists
      const existingAssessment = await this.prisma.competencyAssessment.findFirst({
        where: {
          competencyId: data.competencyId,
          employeeId: data.assesseeId,
          status: { in: ['DRAFT', 'IN_PROGRESS'] },
        },
      });

      if (existingAssessment) {
        throw new Error('An active assessment for this competency and assessee already exists');
      }

      const assessment = await this.prisma.competencyAssessment.create({
        data: {
          employeeId: data.assesseeId,
          assessorId: data.assessorId,
          frameworkId: 'default-framework', // Required field - TODO: Pass actual frameworkId
          competencyId: data.competencyId,
          scores: {}, // Required field - empty JSON for now
          assessmentDate: data.assessmentDate || new Date(),
          status: 'DRAFT',
          notes: data.notes,
        },
        include: {
          competency: {
            select: {
              id: true,
              name: true,
              category: true,
              level: true,
              framework: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      logger.info('Competency assessment created successfully', {
        assessmentId: assessment.id,
        competencyId: data.competencyId,
          employeeId: data.assesseeId, // assesseeId is stored as employeeId
        assessorId: data.assessorId,
      });

      return assessment;
    } catch (error) {
      logger.error('Failed to create competency assessment', error as Error);
      throw error;
    }
  }

  /**
   * Get competency assessment by ID
   */
  async getAssessment(assessmentId: string, requestingUserId: string): Promise<any | null> {
    try {
      const assessment = await this.prisma.competencyAssessment.findUnique({
        where: { id: assessmentId },
        include: {
          competency: {
            include: {
              framework: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!assessment) {
        return null;
      }

      // Check access permissions
      const hasAccess = await this.checkAssessmentAccess(assessment, requestingUserId);
      if (!hasAccess) {
        return null;
      }

      return assessment;
    } catch (error) {
      logger.error(`Failed to get competency assessment ${assessmentId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update competency assessment
   */
  async updateAssessment(
    assessmentId: string,
    updates: Partial<CompetencyAssessmentData>,
    requestingUserId: string
  ): Promise<any> {
    try {
      const assessment = await this.prisma.competencyAssessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new Error('Competency assessment not found');
      }

      const canEdit = await this.checkEditPermission(assessment, requestingUserId);
      if (!canEdit) {
        throw new Error('You do not have permission to edit this assessment');
      }

      if (assessment.status === 'COMPLETED' || assessment.status === 'APPROVED') {
        throw new Error('Cannot update completed or approved assessment');
      }

      const updatedAssessment = await this.prisma.competencyAssessment.update({
        where: { id: assessmentId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          competency: {
            select: {
              id: true,
              name: true,
              category: true,
              level: true,
            },
          },
        },
      });

      logger.info('Competency assessment updated successfully', {
        assessmentId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedAssessment;
    } catch (error) {
      logger.error(`Failed to update competency assessment ${assessmentId}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete competency assessment
   */
  async deleteAssessment(assessmentId: string, requestingUserId: string): Promise<void> {
    try {
      const assessment = await this.prisma.competencyAssessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new Error('Competency assessment not found');
      }

      const canDelete = await this.checkEditPermission(assessment, requestingUserId);
      if (!canDelete) {
        throw new Error('You do not have permission to delete this assessment');
      }

      if (assessment.status === 'COMPLETED' || assessment.status === 'APPROVED') {
        throw new Error('Cannot delete completed or approved assessment');
      }

      await this.prisma.competencyAssessment.delete({
        where: { id: assessmentId },
      });

      logger.info('Competency assessment deleted successfully', { assessmentId, requestingUserId });
    } catch (error) {
      logger.error(`Failed to delete competency assessment ${assessmentId}`, error as Error);
      throw error;
    }
  }

  /**
   * List competency assessments
   */
  async listAssessments(options: ListAssessmentsOptions): Promise<{
    assessments: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        competencyId,
        assesseeId,
        assessorId,
        status,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (competencyId) where.competencyId = competencyId;
      if (assesseeId) where.assesseeId = assesseeId;
      if (assessorId) where.assessorId = assessorId;
      if (status) where.status = status;

      if (startDate || endDate) {
        where.assessmentDate = {};
        if (startDate) where.assessmentDate.gte = startDate;
        if (endDate) where.assessmentDate.lte = endDate;
      }

      const [assessments, total] = await Promise.all([
        this.prisma.competencyAssessment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            competency: {
              select: {
                id: true,
                name: true,
                category: true,
                level: true,
                framework: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.competencyAssessment.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        assessments,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list competency assessments', error as Error);
      throw error;
    }
  }

  /**
   * Submit competency assessment
   */
  async submitAssessment(assessmentId: string, submissionData: AssessmentSubmissionData): Promise<any> {
    try {
      const assessment = await this.prisma.competencyAssessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new Error('Competency assessment not found');
      }

      if (assessment.status === 'COMPLETED' || assessment.status === 'APPROVED') {
        throw new Error('Assessment is already completed');
      }

      // Validate score range
      if (submissionData.score < 0 || submissionData.score > 100) {
        throw new Error('Score must be between 0 and 100');
      }

      const updatedAssessment = await this.prisma.competencyAssessment.update({
        where: { id: assessmentId },
        data: {
          score: submissionData.score,
          // evidenceNotes: submissionData.evidenceNotes, // TODO: Add evidenceNotes field to schema
          // feedback: submissionData.feedback, // TODO: Add feedback field to schema
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          competency: {
            select: {
              id: true,
              name: true,
              category: true,
              level: true,
            },
          },
        },
      });

      // Create assessment history entry
      await this.createAssessmentHistoryEntry(assessmentId, 'SUBMITTED', {
        score: submissionData.score,
        submittedBy: submissionData.submittedBy,
      });

      logger.info('Competency assessment submitted', {
        assessmentId,
        score: submissionData.score,
        submittedBy: submissionData.submittedBy,
      });

      return updatedAssessment;
    } catch (error) {
      logger.error(`Failed to submit competency assessment ${assessmentId}`, error as Error);
      throw error;
    }
  }

  /**
   * Approve competency assessment
   */
  async approveAssessment(assessmentId: string, approverId: string, comments?: string): Promise<any> {
    try {
      const assessment = await this.prisma.competencyAssessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new Error('Competency assessment not found');
      }

      if (assessment.status !== 'COMPLETED') {
        throw new Error('Can only approve completed assessments');
      }

      const updatedAssessment = await this.prisma.competencyAssessment.update({
        where: { id: assessmentId },
        data: {
          status: 'APPROVED',
          // approvedBy: approverId, // TODO: Add approvedBy field to schema
          // approvedAt: new Date(), // TODO: Add approvedAt field to schema
          // approvalComments: comments, // TODO: Add approvalComments field to schema
          updatedAt: new Date(),
        },
        include: {
          competency: {
            select: {
              id: true,
              name: true,
              category: true,
              level: true,
            },
          },
        },
      });

      // Create assessment history entry
      await this.createAssessmentHistoryEntry(assessmentId, 'APPROVED', {
        approvedBy: approverId,
        comments,
      });

      logger.info('Competency assessment approved', { assessmentId, approverId });

      return updatedAssessment;
    } catch (error) {
      logger.error(`Failed to approve competency assessment ${assessmentId}`, error as Error);
      throw error;
    }
  }

  /**
   * Reject competency assessment
   */
  async rejectAssessment(assessmentId: string, rejectorId: string, reason: string): Promise<any> {
    try {
      const assessment = await this.prisma.competencyAssessment.findUnique({
        where: { id: assessmentId },
      });

      if (!assessment) {
        throw new Error('Competency assessment not found');
      }

      if (assessment.status !== 'COMPLETED') {
        throw new Error('Can only reject completed assessments');
      }

      const updatedAssessment = await this.prisma.competencyAssessment.update({
        where: { id: assessmentId },
        data: {
          status: 'REJECTED',
          // rejectedAt: new Date(), // TODO: Add rejectedAt field to schema
          // rejectionReason: reason, // TODO: Add rejectionReason field to schema
          updatedAt: new Date(),
        },
        include: {
          competency: {
            select: {
              id: true,
              name: true,
              category: true,
              level: true,
            },
          },
        },
      });

      // Create assessment history entry
      await this.createAssessmentHistoryEntry(assessmentId, 'REJECTED', {
        rejectedBy: rejectorId,
        reason,
      });

      logger.info('Competency assessment rejected', { assessmentId, rejectorId });

      return updatedAssessment;
    } catch (error) {
      logger.error(`Failed to reject competency assessment ${assessmentId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get user's competency assessments
   */
  async getUserAssessments(
    userId: string,
    options: GetUserAssessmentsOptions
  ): Promise<{
    assessments: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        competencyId,
        status,
        frameworkId,
        includeHistory,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = { assesseeId: userId };

      if (competencyId) where.competencyId = competencyId;
      if (status) where.status = status;

      if (frameworkId) {
        where.competency = {
          frameworkId,
        };
      }

      // If not including history, only get latest assessment for each competency
      if (!includeHistory) {
        // This would require a more complex query to get only the latest assessment per competency
        // For simplicity, we'll use the current approach
      }

      const [assessments, total] = await Promise.all([
        this.prisma.competencyAssessment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            competency: {
              include: {
                framework: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.competencyAssessment.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        assessments,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error(`Failed to get user assessments ${userId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get assessment analytics
   */
  async getAssessmentAnalytics(options: AssessmentAnalyticsOptions): Promise<AssessmentAnalytics> {
    try {
      const { competencyId, frameworkId, departmentId, startDate, endDate } = options;

      const where: any = {};

      if (competencyId) where.competencyId = competencyId;
      if (startDate || endDate) {
        where.assessmentDate = {};
        if (startDate) where.assessmentDate.gte = startDate;
        if (endDate) where.assessmentDate.lte = endDate;
      }

      if (frameworkId) {
        where.competency = { frameworkId };
      }

      const [
        totalAssessments,
        completedAssessments,
        pendingAssessments,
        allAssessments,
        assessmentsByType,
      ] = await Promise.all([
        this.prisma.competencyAssessment.count({ where }),
        this.prisma.competencyAssessment.count({ where: { ...where, status: 'COMPLETED' } }),
        this.prisma.competencyAssessment.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.competencyAssessment.findMany({
          where: { ...where, status: 'COMPLETED' },
          select: {
            score: true,
            employeeId: true, // assesseeId is stored as employeeId
            competency: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.competencyAssessment.groupBy({
          by: ['assessmentDate'], // No assessmentType field, use assessmentDate instead
          where,
          _count: { assessmentDate: true },
        }),
      ]);

      // Calculate score statistics
      const scores = allAssessments.map(a => Number(a.score) || 0);
      const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

      // Score distribution
      const scoreDistribution: Record<string, number> = {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0,
      };

      scores.forEach(score => {
        const numScore = Number(score);
        if (numScore <= 20) scoreDistribution['0-20']++;
        else if (numScore <= 40) scoreDistribution['21-40']++;
        else if (numScore <= 60) scoreDistribution['41-60']++;
        else if (numScore <= 80) scoreDistribution['61-80']++;
        else scoreDistribution['81-100']++;
      });

      // Assessments by type
      const assessmentTypeMap: Record<string, number> = {};
      assessmentsByType.forEach(type => {
        // No assessmentType field, skipping type aggregation
      });

      // Competency trends (simplified)
      const competencyScores: Record<string, number[]> = {};
      allAssessments.forEach(assessment => {
        const compId = assessment.competency?.id || 'unknown';
        if (!competencyScores[compId]) {
          competencyScores[compId] = [];
        }
        competencyScores[compId].push(Number(assessment.score) || 0);
      });

      const competencyTrends = Object.entries(competencyScores).map(([compId, scores]) => {
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const competency = allAssessments.find(a => a.competency?.id === compId)?.competency;
        
        return {
          competencyName: competency?.name || 'Unknown',
          averageScore: avgScore,
          assessmentCount: scores.length,
          trend: 'STABLE' as const, // Would calculate actual trend based on historical data
        };
      }).sort((a, b) => b.averageScore - a.averageScore);

      // Top performers
      const assesseeScores: Record<string, number[]> = {};
      allAssessments.forEach(assessment => {
        const assesseeId = assessment.employeeId; // assesseeId is stored as employeeId
        if (!assesseeScores[assesseeId]) {
          assesseeScores[assesseeId] = [];
        }
        assesseeScores[assesseeId].push(Number(assessment.score) || 0);
      });

      const topPerformers = Object.entries(assesseeScores)
        .map(([assesseeId, scores]) => ({
          assesseeId,
          averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
          completedAssessments: scores.length,
        }))
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 10);

      return {
        totalAssessments,
        completedAssessments,
        pendingAssessments,
        averageScore,
        scoreDistribution,
        assessmentsByType: assessmentTypeMap,
        competencyTrends,
        topPerformers,
      };
    } catch (error) {
      logger.error('Failed to get assessment analytics', error as Error);
      throw error;
    }
  }

  /**
   * Create self-assessment
   */
  async createSelfAssessment(data: { competencyId: string; assesseeId: string; assessorId: string }): Promise<any> {
    try {
      return await this.createAssessment({
        ...data,
        assessmentType: 'SELF',
        assessmentDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for self-assessment
      });
    } catch (error) {
      logger.error('Failed to create self-assessment', error as Error);
      throw error;
    }
  }

  /**
   * Get competency scores summary
   */
  async getCompetencyScoresSummary(options: CompetencyScoresSummaryOptions): Promise<any> {
    try {
      const { assesseeId, frameworkId } = options;

      const where: any = {
        assesseeId,
        status: 'APPROVED',
      };

      if (frameworkId) {
        where.competency = { frameworkId };
      }

      const assessments = await this.prisma.competencyAssessment.findMany({
        where,
        include: {
          competency: {
            include: {
              framework: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      });

      // Get latest assessment for each competency
      const latestAssessments = new Map();
      assessments.forEach(assessment => {
        const compId = assessment.competencyId;
        if (!latestAssessments.has(compId) || 
            assessment.completedAt && assessment.completedAt > (latestAssessments.get(compId)?.completedAt || new Date(0))) {
          latestAssessments.set(compId, assessment);
        }
      });

      const competencyScores = Array.from(latestAssessments.values());
      const totalScore = competencyScores.reduce((sum, a) => sum + (a.score || 0), 0);
      const averageScore = competencyScores.length > 0 ? totalScore / competencyScores.length : 0;

      // Group by framework and category
      const byFramework: Record<string, any> = {};
      const byCategory: Record<string, any> = {};

      competencyScores.forEach(assessment => {
        const frameworkName = assessment.competency.framework.name;
        const category = assessment.competency.category;

        if (!byFramework[frameworkName]) {
          byFramework[frameworkName] = {
            assessments: [],
            averageScore: 0,
          };
        }
        byFramework[frameworkName].assessments.push(assessment);

        if (!byCategory[category]) {
          byCategory[category] = {
            assessments: [],
            averageScore: 0,
          };
        }
        byCategory[category].assessments.push(assessment);
      });

      // Calculate averages
      Object.keys(byFramework).forEach(framework => {
        const assessments = byFramework[framework].assessments;
        byFramework[framework].averageScore = 
          assessments.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / assessments.length;
      });

      Object.keys(byCategory).forEach(category => {
        const assessments = byCategory[category].assessments;
        byCategory[category].averageScore = 
          assessments.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / assessments.length;
      });

      return {
        assesseeId,
        totalAssessments: competencyScores.length,
        averageScore,
        competencyScores,
        byFramework,
        byCategory,
        lastUpdated: competencyScores.length > 0 
          ? Math.max(...competencyScores.map(a => a.completedAt?.getTime() || 0))
          : null,
      };
    } catch (error) {
      logger.error('Failed to get competency scores summary', error as Error);
      throw error;
    }
  }

  /**
   * Bulk create assessments
   */
  async bulkCreateAssessments(
    assessments: CompetencyAssessmentData[],
    createdBy: string
  ): Promise<{ successful: number; failed: number; results: any[] }> {
    try {
      let successful = 0;
      let failed = 0;
      const results = [];

      for (const assessmentData of assessments) {
        try {
          const assessment = await this.createAssessment({
            ...assessmentData,
            assessorId: assessmentData.assessorId || createdBy,
          });
          
          results.push({
            success: true,
            assessmentId: assessment.id,
            data: assessmentData,
          });
          successful++;
        } catch (error) {
          results.push({
            success: false,
            error: (error as Error).message,
            data: assessmentData,
          });
          failed++;
        }
      }

      logger.info('Bulk assessments created', {
        total: assessments.length,
        successful,
        failed,
        createdBy,
      });

      return { successful, failed, results };
    } catch (error) {
      logger.error('Failed to bulk create assessments', error as Error);
      throw error;
    }
  }

  /**
   * Get assessment history
   */
  async getAssessmentHistory(assessmentId: string, requestingUserId: string): Promise<any[]> {
    try {
      const assessment = await this.getAssessment(assessmentId, requestingUserId);
      if (!assessment) {
        throw new Error('Assessment not found or access denied');
      }

      const history = await this.prisma.assessmentHistory.findMany({
        where: { assessmentId },
        orderBy: { createdAt: 'desc' },
      });

      return history;
    } catch (error) {
      logger.error(`Failed to get assessment history ${assessmentId}`, error as Error);
      throw error;
    }
  }

  // Private helper methods

  private async checkAssessmentAccess(assessment: any, userId: string): Promise<boolean> {
    // User can access if they are the assessee, assessor, or have admin role
    return (
      assessment.assesseeId === userId ||
      assessment.assessorId === userId ||
      // Add role-based access check here
      true // For now, allow access
    );
  }

  private async checkEditPermission(assessment: any, userId: string): Promise<boolean> {
    // User can edit if they are the assessor or have admin role
    return (
      assessment.assessorId === userId ||
      // Add role-based permission check here
      true // For now, allow editing
    );
  }

  private async createAssessmentHistoryEntry(
    assessmentId: string,
    action: string,
    details: any
  ): Promise<void> {
    try {
      await this.prisma.assessmentHistory.create({
        data: {
          assessmentId,
          action,
          details,
          performedBy: 'system', // TODO: Pass actual user ID
        },
      });
    } catch (error) {
      logger.error('Failed to create assessment history entry', error as Error);
    }
  }
}
