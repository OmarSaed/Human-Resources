import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';

const logger = createLogger('competency-framework-service');

export interface CompetencyFrameworkData {
  name: string;
  description?: string;
  type: 'ROLE_BASED' | 'BEHAVIORAL' | 'TECHNICAL' | 'LEADERSHIP' | 'CUSTOM';
  version?: string;
  isActive?: boolean;
  createdBy: string;
}

export interface CompetencyData {
  name: string;
  description?: string;
  category: string;
  level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  behaviorIndicators?: string[];
  proficiencyScale?: any;
  weight?: number;
  isRequired?: boolean;
  createdBy: string;
}

export interface ListFrameworksOptions {
  type?: string;
  isActive?: boolean;
  search?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface GetFrameworkCompetenciesOptions {
  category?: string;
  level?: string;
  isActive?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  requestingUserId: string;
}

export interface FrameworkRoleAssignment {
  frameworkId: string;
  roleId: string;
  requiredLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  assignedBy: string;
}

export interface FrameworkAnalytics {
  totalCompetencies: number;
  competenciesByCategory: Record<string, number>;
  competenciesByLevel: Record<string, number>;
  rolesAssigned: number;
  assessmentsCompleted: number;
  averageAssessmentScore: number;
  competencyGaps: Array<{
    competencyName: string;
    averageScore: number;
    assessmentCount: number;
    gapSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

export class CompetencyFrameworkService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new competency framework
   */
  async createFramework(data: CompetencyFrameworkData): Promise<any> {
    try {
      // Check if framework with same name exists
      const existingFramework = await this.prisma.competencyFramework.findFirst({
        where: {
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
        },
      });

      if (existingFramework) {
        throw new Error('A competency framework with this name already exists');
      }

      const framework = await this.prisma.competencyFramework.create({
        data: {
          name: data.name,
          description: data.description,
          // type: data.type, // TODO: Add type field to CompetencyFramework schema
          version: data.version || '1.0',
          isActive: data.isActive !== false,
          createdBy: 'system', // Required field - TODO: Pass actual user ID
        },
        include: {
          _count: {
            select: {
              competencies: true,
              roleFrameworks: true,
            },
          },
        },
      });

      logger.info('Competency framework created successfully', {
        frameworkId: framework.id,
        name: framework.name,
      });

      return framework;
    } catch (error) {
      logger.error('Failed to create competency framework', error as Error);
      throw error;
    }
  }

  /**
   * Get competency framework by ID
   */
  async getFramework(frameworkId: string, requestingUserId: string): Promise<any | null> {
    try {
      const framework = await this.prisma.competencyFramework.findUnique({
        where: { id: frameworkId },
        include: {
          competencies: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
          roleFrameworks: true, // TODO: Add role relation include when available
          _count: {
            select: {
              competencies: true,
              roleFrameworks: true,
            },
          },
        },
      });

      return framework;
    } catch (error) {
      logger.error(`Failed to get competency framework ${frameworkId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update competency framework
   */
  async updateFramework(
    frameworkId: string,
    updates: Partial<CompetencyFrameworkData>,
    requestingUserId: string
  ): Promise<any> {
    try {
      const framework = await this.prisma.competencyFramework.findUnique({
        where: { id: frameworkId },
      });

      if (!framework) {
        throw new Error('Competency framework not found');
      }

      // Check if name is being changed and if it conflicts
      if (updates.name && updates.name !== framework.name) {
        const existingFramework = await this.prisma.competencyFramework.findFirst({
          where: {
            name: {
              equals: updates.name,
              mode: 'insensitive',
            },
            id: { not: frameworkId },
          },
        });

        if (existingFramework) {
          throw new Error('A competency framework with this name already exists');
        }
      }

      const updatedFramework = await this.prisma.competencyFramework.update({
        where: { id: frameworkId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          _count: {
            select: {
              competencies: true,
              roleFrameworks: true,
            },
          },
        },
      });

      logger.info('Competency framework updated successfully', {
        frameworkId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedFramework;
    } catch (error) {
      logger.error(`Failed to update competency framework ${frameworkId}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete competency framework
   */
  async deleteFramework(frameworkId: string, requestingUserId: string): Promise<void> {
    try {
      const framework = await this.prisma.competencyFramework.findUnique({
        where: { id: frameworkId },
        include: {
          competencies: true,
          roleFrameworks: true,
        },
      });

      if (!framework) {
        throw new Error('Competency framework not found');
      }

      // Check if framework is in use
      if (framework.roleFrameworks.length > 0) {
        throw new Error('Cannot delete competency framework that is assigned to roles. Deactivate it instead.');
      }

      // Delete competencies first
      await this.prisma.competency.deleteMany({
        where: { frameworkId },
      });

      await this.prisma.competencyFramework.delete({
        where: { id: frameworkId },
      });

      logger.info('Competency framework deleted successfully', { frameworkId, requestingUserId });
    } catch (error) {
      logger.error(`Failed to delete competency framework ${frameworkId}`, error as Error);
      throw error;
    }
  }

  /**
   * List competency frameworks
   */
  async listFrameworks(options: ListFrameworksOptions): Promise<{
    frameworks: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        type,
        isActive,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = {};

      if (type) where.type = type;
      if (isActive !== undefined) where.isActive = isActive;

      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ];
      }

      const [frameworks, total] = await Promise.all([
        this.prisma.competencyFramework.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                competencies: true,
                roleFrameworks: true,
              },
            },
          },
        }),
        this.prisma.competencyFramework.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        frameworks,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list competency frameworks', error as Error);
      throw error;
    }
  }

  /**
   * Create competency within framework
   */
  async createCompetency(frameworkId: string, data: CompetencyData): Promise<any> {
    try {
      const framework = await this.prisma.competencyFramework.findUnique({
        where: { id: frameworkId },
      });

      if (!framework) {
        throw new Error('Competency framework not found');
      }

      if (!framework.isActive) {
        throw new Error('Cannot add competencies to inactive framework');
      }

      // Check if competency with same name exists in framework
      const existingCompetency = await this.prisma.competency.findFirst({
        where: {
          frameworkId,
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
        },
      });

      if (existingCompetency) {
        throw new Error('A competency with this name already exists in this framework');
      }

      const competency = await this.prisma.competency.create({
        data: {
          frameworkId,
          name: data.name,
          description: data.description,
          category: data.category,
          level: data.level,
          behaviorIndicators: data.behaviorIndicators || [],
          // proficiencyScale: data.proficiencyScale, // TODO: Add proficiencyScale field to Competency schema
          // weight: data.weight || 1, // TODO: Add weight field to schema
          // isRequired: data.isRequired || false, // TODO: Add isRequired field to schema
          isActive: true,
        },
        include: {
          framework: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info('Competency created successfully', {
        frameworkId,
        competencyId: competency.id,
        name: competency.name,
      });

      return competency;
    } catch (error) {
      logger.error(`Failed to create competency for framework ${frameworkId}`, error as Error);
      throw error;
    }
  }

  /**
   * Update competency
   */
  async updateCompetency(
    competencyId: string,
    updates: Partial<CompetencyData>,
    requestingUserId: string
  ): Promise<any> {
    try {
      const competency = await this.prisma.competency.findUnique({
        where: { id: competencyId },
        include: { framework: true },
      });

      if (!competency) {
        throw new Error('Competency not found');
      }

      // Check if name is being changed and if it conflicts
      if (updates.name && updates.name !== competency.name) {
        const existingCompetency = await this.prisma.competency.findFirst({
          where: {
            frameworkId: competency.frameworkId,
            name: {
              equals: updates.name,
              mode: 'insensitive',
            },
            id: { not: competencyId },
          },
        });

        if (existingCompetency) {
          throw new Error('A competency with this name already exists in this framework');
        }
      }

      const updatedCompetency = await this.prisma.competency.update({
        where: { id: competencyId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          framework: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info('Competency updated successfully', {
        competencyId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedCompetency;
    } catch (error) {
      logger.error(`Failed to update competency ${competencyId}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete competency
   */
  async deleteCompetency(competencyId: string, requestingUserId: string): Promise<void> {
    try {
      const competency = await this.prisma.competency.findUnique({
        where: { id: competencyId },
        include: {
          assessments: true,
        },
      });

      if (!competency) {
        throw new Error('Competency not found');
      }

      // Check if competency has assessments
      if (competency.assessments.length > 0) {
        throw new Error('Cannot delete competency that has assessments. Deactivate it instead.');
      }

      await this.prisma.competency.delete({
        where: { id: competencyId },
      });

      logger.info('Competency deleted successfully', { competencyId, requestingUserId });
    } catch (error) {
      logger.error(`Failed to delete competency ${competencyId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get framework competencies
   */
  async getFrameworkCompetencies(
    frameworkId: string,
    options: GetFrameworkCompetenciesOptions
  ): Promise<{
    competencies: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        category,
        level,
        isActive,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = { frameworkId };

      if (category) where.category = category;
      if (level) where.level = level;
      if (isActive !== undefined) where.isActive = isActive;

      const [competencies, total] = await Promise.all([
        this.prisma.competency.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                assessments: true,
              },
            },
          },
        }),
        this.prisma.competency.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        competencies,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error(`Failed to get framework competencies ${frameworkId}`, error as Error);
      throw error;
    }
  }

  /**
   * Assign framework to role
   */
  async assignFrameworkToRole(data: FrameworkRoleAssignment): Promise<any> {
    try {
      const framework = await this.prisma.competencyFramework.findUnique({
        where: { id: data.frameworkId },
      });

      if (!framework) {
        throw new Error('Competency framework not found');
      }

      if (!framework.isActive) {
        throw new Error('Cannot assign inactive framework to role');
      }

      // Check if assignment already exists
      const existingAssignment = await this.prisma.roleFramework.findUnique({
        where: {
          roleId_frameworkId: {
            roleId: data.roleId,
            frameworkId: data.frameworkId,
          },
        },
      });

      if (existingAssignment) {
        throw new Error('Framework is already assigned to this role');
      }

      const assignment = await this.prisma.roleFramework.create({
        data: {
          roleId: data.roleId,
          frameworkId: data.frameworkId,
          requiredLevel: data.requiredLevel,
          assignedBy: 'system', // Required field - TODO: Pass actual user ID
        },
        include: {
          framework: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info('Framework assigned to role', {
        frameworkId: data.frameworkId,
        roleId: data.roleId,
        requiredLevel: data.requiredLevel,
      });

      return assignment;
    } catch (error) {
      logger.error('Failed to assign framework to role', error as Error);
      throw error;
    }
  }

  /**
   * Get framework analytics
   */
  async getFrameworkAnalytics(frameworkId: string, requestingUserId: string): Promise<FrameworkAnalytics> {
    try {
      const framework = await this.prisma.competencyFramework.findUnique({
        where: { id: frameworkId },
        include: {
          competencies: true,
          roleFrameworks: true,
        },
      });

      if (!framework) {
        throw new Error('Competency framework not found');
      }

      const [
        competenciesByCategory,
        competenciesByLevel,
        assessments,
      ] = await Promise.all([
        this.prisma.competency.groupBy({
          by: ['category'],
          where: { frameworkId, isActive: true },
          _count: { category: true },
        }),
        this.prisma.competency.groupBy({
          by: ['level'],
          where: { frameworkId, isActive: true },
          _count: { level: true },
        }),
        this.prisma.competencyAssessment.findMany({
          where: {
            competency: { frameworkId },
            status: 'COMPLETED',
          },
          select: {
            score: true,
            competency: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
      ]);

      const categoryCounts: Record<string, number> = {};
      competenciesByCategory.forEach(cat => {
        if (cat.category) categoryCounts[cat.category] = cat._count.category;
      });

      const levelCounts: Record<string, number> = {};
      competenciesByLevel.forEach(level => {
        if (level.level) levelCounts[level.level] = level._count.level;
      });

      // Calculate assessment metrics
      const scores = assessments.map(a => a.score);
      const averageAssessmentScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + Number(score || 0), 0) / scores.length 
        : 0;

      // Calculate competency gaps
      const competencyScores: Record<string, number[]> = {};
      assessments.forEach(assessment => {
        const compId = assessment.competency?.id;
        if (compId) {
          if (!competencyScores[compId]) {
            competencyScores[compId] = [];
          }
          competencyScores[compId].push(Number(assessment.score || 0));
        }
      });

      const competencyGaps = Object.entries(competencyScores).map(([compId, scores]) => {
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const competency = framework.competencies.find(c => c.id === compId);
        
        let gapSeverity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (avgScore < 50) gapSeverity = 'HIGH';
        else if (avgScore < 70) gapSeverity = 'MEDIUM';

        return {
          competencyName: competency?.name || 'Unknown',
          averageScore: avgScore,
          assessmentCount: scores.length,
          gapSeverity,
        };
      }).sort((a, b) => a.averageScore - b.averageScore);

      return {
        totalCompetencies: framework.competencies.length,
        competenciesByCategory: categoryCounts,
        competenciesByLevel: levelCounts,
        rolesAssigned: framework.roleFrameworks.length,
        assessmentsCompleted: assessments.length,
        averageAssessmentScore,
        competencyGaps,
      };
    } catch (error) {
      logger.error(`Failed to get framework analytics ${frameworkId}`, error as Error);
      throw error;
    }
  }

  /**
   * Clone framework
   */
  async cloneFramework(frameworkId: string, newName: string, requestingUserId: string): Promise<any> {
    try {
      const originalFramework = await this.prisma.competencyFramework.findUnique({
        where: { id: frameworkId },
        include: {
          competencies: true,
        },
      });

      if (!originalFramework) {
        throw new Error('Competency framework not found');
      }

      // Check if new name is unique
      const existingFramework = await this.prisma.competencyFramework.findFirst({
        where: {
          name: {
            equals: newName,
            mode: 'insensitive',
          },
        },
      });

      if (existingFramework) {
        throw new Error('A competency framework with this name already exists');
      }

      // Create new framework
      const clonedFramework = await this.prisma.competencyFramework.create({
        data: {
          name: newName,
          description: `Cloned from: ${originalFramework.name}`,
          // type: originalFramework.type, // TODO: Add type field to schema
          version: '1.0',
          isActive: true,
          createdBy: requestingUserId,
        },
      });

      // Clone competencies
      for (const competency of originalFramework.competencies) {
        await this.prisma.competency.create({
          data: {
            frameworkId: clonedFramework.id,
            name: competency.name,
            description: competency.description,
            category: competency.category,
            level: competency.level,
            behaviorIndicators: competency.behaviorIndicators as any, // TODO: Fix JsonValue type conversion
            // proficiencyScale: competency.proficiencyScale, // TODO: Add field to schema
            // weight: competency.weight, // TODO: Add field to schema
            // isRequired: competency.isRequired, // TODO: Add field to schema
            isActive: competency.isActive,
          },
        });
      }

      logger.info('Framework cloned successfully', {
        originalFrameworkId: frameworkId,
        clonedFrameworkId: clonedFramework.id,
        newName,
        requestingUserId,
      });

      return clonedFramework;
    } catch (error) {
      logger.error(`Failed to clone framework ${frameworkId}`, error as Error);
      throw error;
    }
  }

  /**
   * Export framework
   */
  async exportFramework(frameworkId: string, format: string, requestingUserId: string): Promise<any> {
    try {
      const framework = await this.prisma.competencyFramework.findUnique({
        where: { id: frameworkId },
        include: {
          competencies: {
            orderBy: { name: 'asc' },
          },
          roleFrameworks: true, // TODO: Add role relation include when available
        },
      });

      if (!framework) {
        throw new Error('Competency framework not found');
      }

      if (format === 'json') {
        return {
          framework: {
            id: framework.id,
            name: framework.name,
            description: framework.description,
            // type: 'TECHNICAL', // TODO: Add type field to schema
            version: framework.version,
            isActive: framework.isActive,
            createdAt: framework.createdAt,
            updatedAt: framework.updatedAt,
          },
          competencies: (framework as any).competencies?.map((comp: any) => ({
            name: comp.name,
            description: comp.description,
            category: comp.category,
            level: comp.level,
            behaviorIndicators: comp.behaviorIndicators,
            proficiencyScale: comp.proficiencyScale,
            weight: comp.weight,
            isRequired: comp.isRequired,
            isActive: comp.isActive,
          })),
          roleAssignments: (framework as any).roleFrameworks?.map((rf: any) => ({
            roleName: rf.role.name,
            requiredLevel: rf.requiredLevel,
          })),
          exportedAt: new Date().toISOString(),
          exportedBy: requestingUserId,
        };
      } else if (format === 'csv') {
        // CSV export (simplified)
        const lines = [
          'Name,Description,Category,Level,Weight,Required,Active,Behavior Indicators',
          ...((framework as any).competencies?.map((comp: any) => 
            `"${comp.name}","${comp.description || ''}","${comp.category}","${comp.level}",0,false,${comp.isActive},"${(comp.behaviorIndicators as string[])?.join('; ') || ''}"`
          ) || [])
        ];
        return lines.join('\n');
      }

      throw new Error('Unsupported export format');
    } catch (error) {
      logger.error(`Failed to export framework ${frameworkId}`, error as Error);
      throw error;
    }
  }
}
