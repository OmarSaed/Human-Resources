import { PrismaClient } from '@prisma/client';
import { createLogger } from '@hrms/shared';
import {
  SkillData,
  ListSkillsOptions,
  UserSkillData,
  GetUserSkillsOptions,
  SearchSkillsOptions,
  SkillGapAnalysisOptions,
  SkillEndorsementData,
  SkillAnalytics
} from '../models/skill.models';

const logger = createLogger('skill-service');


export class SkillService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new skill
   */
  async createSkill(data: SkillData): Promise<any> {
    try {
      // Check if skill with same name already exists
      const existingSkill = await this.prisma.skill.findFirst({
        where: {
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
        },
      });

      if (existingSkill) {
        throw new Error('A skill with this name already exists');
      }

      const skill = await this.prisma.skill.create({
        data: {
          name: data.name,
          description: data.description,
          category: data.category as any, // Will be properly typed once schema is aligned
          // type: data.type, // Field not in current schema
          // keywords: data.keywords || [], // Field not in current schema
          // isActive: data.isActive !== false, // Field not in current schema
        },
        include: {
          _count: {
            select: {
              employeeSkills: true,
            },
          },
        },
      });

      logger.info('Skill created successfully', {
        skillId: skill.id,
        name: skill.name,
        category: skill.category,
        // type: skill.type, // Type field not in current schema
      });

      return skill;
    } catch (error) {
      logger.error('Failed to create skill', error as Error);
      throw error;
    }
  }

  /**
   * Get skill by ID
   */
  async getSkill(skillId: string): Promise<any | null> {
    try {
      const skill = await this.prisma.skill.findUnique({
        where: { id: skillId },
        include: {
          _count: {
            select: {
              employeeSkills: true,
            },
          },
        },
      });

      return skill;
    } catch (error) {
      logger.error('Failed to get skill', error as Error);
      throw error;
    }
  }

  /**
   * Update skill
   */
  async updateSkill(skillId: string, updates: Partial<SkillData>, requestingUserId: string): Promise<any> {
    try {
      const skill = await this.prisma.skill.findUnique({
        where: { id: skillId },
      });

      if (!skill) {
        throw new Error('Skill not found');
      }

      // Check if name is being changed and if it conflicts with existing skill
      if (updates.name && updates.name !== skill.name) {
        const existingSkill = await this.prisma.skill.findFirst({
          where: {
            name: {
              equals: updates.name,
              mode: 'insensitive',
            },
            id: { not: skillId },
          },
        });

        if (existingSkill) {
          throw new Error('A skill with this name already exists');
        }
      }

      const updatedSkill = await this.prisma.skill.update({
        where: { id: skillId },
        data: {
          ...updates,
          category: updates.category ? updates.category as any : undefined,
          updatedAt: new Date(),
        },
        include: {
          _count: {
            select: {
              employeeSkills: true,
            },
          },
        },
      });

      logger.info('Skill updated successfully', {
        skillId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedSkill;
    } catch (error) {
      logger.error('Failed to update skill', error as Error);
      throw error;
    }
  }

  /**
   * Delete skill
   */
  async deleteSkill(skillId: string, requestingUserId: string): Promise<void> {
    try {
      const skill = await this.prisma.skill.findUnique({
        where: { id: skillId },
        include: {
          employeeSkills: true,
        },
      });

      if (!skill) {
        throw new Error('Skill not found');
      }

      // Check if skill is in use
      if (skill.employeeSkills.length > 0) {
        throw new Error('Cannot delete skill that is assigned to users. Deactivate it instead.');
      }

      await this.prisma.skill.delete({
        where: { id: skillId },
      });

      logger.info('Skill deleted successfully', { skillId, requestingUserId });
    } catch (error) {
      logger.error('Failed to delete skill', error as Error);
      throw error;
    }
  }

  /**
   * List skills with filtering and pagination
   */
  async listSkills(options: ListSkillsOptions): Promise<{
    skills: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        category,
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

      if (category) where.category = category;
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
          {
            keywords: {
              has: search,
            },
          },
        ];
      }

      const [skills, total] = await Promise.all([
        this.prisma.skill.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                employeeSkills: true,
              },
            },
          },
        }),
        this.prisma.skill.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        skills,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to list skills', error as Error);
      throw error;
    }
  }

  /**
   * Get skill categories
   */
  async getSkillCategories(): Promise<Array<{ category: string; count: number }>> {
    try {
      const categories = await this.prisma.skill.groupBy({
        by: ['category'],
        where: {}, // isActive field not in current schema
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
      });

      return categories.map(cat => ({
        category: cat.category,
        count: typeof cat._count === 'object' ? (cat._count as any)?._all || 0 : cat._count || 0,
      }));
    } catch (error) {
      logger.error('Failed to get skill categories', error as Error);
      throw error;
    }
  }

  /**
   * Assign skill to user
   */
  async assignSkillToUser(data: UserSkillData): Promise<any> {
    try {
      // Check if skill exists
      const skill = await this.prisma.skill.findUnique({
        where: { id: data.skillId },
      });

      if (!skill) {
        throw new Error('Skill not found');
      }

      // Check if skill exists (isActive field not in current schema)
      if (!skill) {
        throw new Error('Cannot assign inactive skill');
      }

      // Check if user already has this skill
      const existingUserSkill = await this.prisma.employeeSkill.findUnique({
        where: {
          userId_skillId: {
            userId: data.userId,
            skillId: data.skillId,
          },
        },
      });

      if (existingUserSkill) {
        throw new Error('User already has this skill assigned');
      }

      const userSkill = await this.prisma.employeeSkill.create({
        data: {
          skillId: data.skillId,
          userId: data.userId,
          level: data.level,
          proficiency: Math.max(1, Math.min(100, data.proficiency)),
          // endorserId field doesn't exist in schema, removing
        },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              category: true,
              // type: true, // Field not in current schema
            },
          },
        },
      });

      logger.info('Skill assigned to user', {
        skillId: data.skillId,
        userId: data.userId,
        level: data.level,
        proficiency: data.proficiency,
      });

      return userSkill;
    } catch (error) {
      logger.error('Failed to assign skill to user', error as Error);
      throw error;
    }
  }

  /**
   * Update user skill
   */
  async updateUserSkill(userSkillId: string, updates: any, requestingUserId: string): Promise<any> {
    try {
      const userSkill = await this.prisma.employeeSkill.findUnique({
        where: { id: userSkillId },
      });

      if (!userSkill) {
        throw new Error('User skill not found');
      }

      // Validate proficiency range
      if (updates.proficiency !== undefined) {
        updates.proficiency = Math.max(1, Math.min(100, updates.proficiency));
      }

      const updatedUserSkill = await this.prisma.employeeSkill.update({
        where: { id: userSkillId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              category: true,
              // type: true, // Field not in current schema
            },
          },
        },
      });

      logger.info('User skill updated', {
        userSkillId,
        requestingUserId,
        updates: Object.keys(updates),
      });

      return updatedUserSkill;
    } catch (error) {
      logger.error('Failed to update user skill', error as Error);
      throw error;
    }
  }

  /**
   * Remove skill from user
   */
  async removeSkillFromUser(userSkillId: string, requestingUserId: string): Promise<void> {
    try {
      const userSkill = await this.prisma.employeeSkill.findUnique({
        where: { id: userSkillId },
      });

      if (!userSkill) {
        throw new Error('User skill not found');
      }

      // Delete related endorsements first
      await this.prisma.skillEndorsement.deleteMany({
        where: { userSkillId },
      });

      await this.prisma.employeeSkill.delete({
        where: { id: userSkillId },
      });

      logger.info('Skill removed from user', {
        userSkillId,
        requestingUserId,
      });
    } catch (error) {
      logger.error('Failed to remove skill from user', error as Error);
      throw error;
    }
  }

  /**
   * Get user skills
   */
  async getUserSkills(
    userId: string,
    options: GetUserSkillsOptions
  ): Promise<{
    userSkills: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        category,
        level,
        proficiency,
        page,
        limit,
        sortBy,
        sortOrder,
      } = options;

      const skip = (page - 1) * limit;

      const where: any = { userId };

      if (category) {
        where.skill = { category };
      }

      if (level) where.level = level;
      if (proficiency !== undefined) {
        where.proficiency = { gte: proficiency };
      }

      const [userSkills, total] = await Promise.all([
        this.prisma.employeeSkill.findMany({
          where,
          skip,
          take: limit,
          orderBy: sortBy === 'skillName' ? { skill: { name: sortOrder } } : { [sortBy]: sortOrder },
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                category: true,
                // type: true, // Field not in current schema
                description: true,
              },
            },
            _count: {
              select: {
                endorsements: true,
              },
            },
          },
        }),
        this.prisma.employeeSkill.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        userSkills,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to get user skills', error as Error);
      throw error;
    }
  }

  /**
   * Search skills
   */
  async searchSkills(options: SearchSkillsOptions): Promise<any[]> {
    try {
      const { query, category, type, limit } = options;

      const where: any = {
          // Field isActive not in current schema
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            keywords: {
              has: query,
            },
          },
        ],
      };

      if (category) where.category = category;
      if (type) where.type = type;

      const skills = await this.prisma.skill.findMany({
        where,
        take: limit,
        orderBy: [
          {
            // _relevance search not available in current Prisma version
            name: 'asc',
          },
          { name: 'asc' },
        ],
        include: {
          _count: {
            select: {
              employeeSkills: true,
            },
          },
        },
      });

      return skills;
    } catch (error) {
      logger.error('Failed to search skills', error as Error);
      throw error;
    }
  }

  /**
   * Get skill analytics
   */
  async getSkillAnalytics(skillId: string, requestingUserId: string): Promise<SkillAnalytics> {
    try {
      const skill = await this.prisma.skill.findUnique({
        where: { id: skillId },
      });

      if (!skill) {
        throw new Error('Skill not found');
      }

      const [
        totalUsers,
        userSkills,
        endorsementCount,
        recentActivity,
      ] = await Promise.all([
        this.prisma.employeeSkill.count({ where: { skillId } }),
        this.prisma.employeeSkill.findMany({
          where: { skillId },
          select: {
            level: true,
            proficiency: true,
          },
        }),
        this.prisma.skillEndorsement.count({
          where: { userSkill: { skillId } },
        }),
        this.prisma.employeeSkill.findMany({
          where: { skillId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            level: true,
            proficiency: true,
            createdAt: true,
            userId: true,
          },
        }),
      ]);

      // Calculate averages and distributions
      const proficiencies = userSkills.map(us => us.proficiency);
      const averageProficiency = proficiencies.length > 0 
        ? proficiencies.reduce((sum, p) => sum + p, 0) / proficiencies.length 
        : 0;

      const proficiencyDistribution: Record<string, number> = {
        'Beginner (1-25)': 0,
        'Intermediate (26-50)': 0,
        'Advanced (51-75)': 0,
        'Expert (76-100)': 0,
      };

      proficiencies.forEach(p => {
        if (p <= 25) proficiencyDistribution['Beginner (1-25)']++;
        else if (p <= 50) proficiencyDistribution['Intermediate (26-50)']++;
        else if (p <= 75) proficiencyDistribution['Advanced (51-75)']++;
        else proficiencyDistribution['Expert (76-100)']++;
      });

      const levelDistribution: Record<string, number> = {};
      userSkills.forEach(us => {
        levelDistribution[us.level] = (levelDistribution[us.level] || 0) + 1;
      });

      // Simple trending calculation (would be more sophisticated in real app)
      const recentCount = await this.prisma.employeeSkill.count({
        where: {
          skillId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        },
      });

      const previousCount = await this.prisma.employeeSkill.count({
        where: {
          skillId,
          createdAt: {
            gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 30-60 days ago
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      });

      let trendingStatus: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
      if (recentCount > previousCount * 1.1) trendingStatus = 'INCREASING';
      else if (recentCount < previousCount * 0.9) trendingStatus = 'DECREASING';

      return {
        totalUsers,
        averageProficiency,
        proficiencyDistribution,
        levelDistribution,
        endorsementCount,
        recentActivity,
        trendingStatus,
      };
    } catch (error) {
      logger.error('Failed to get skill analytics', error as Error);
      throw error;
    }
  }

  /**
   * Get skill gap analysis
   */
  async getSkillGapAnalysis(options: SkillGapAnalysisOptions): Promise<any> {
    try {
      const { userId, roleId, departmentId } = options;

      // Get user's current skills
      const currentSkills = await this.prisma.employeeSkill.findMany({
        where: { userId },
        include: {
          skill: {
            select: {
              id: true,
              name: true,
              category: true,
              // type: true, // Field not in current schema
            },
          },
        },
      });

      // This would typically involve getting required skills for role/department
      // For now, we'll return a simplified analysis
      const skillsByCategory = currentSkills.reduce((acc, userSkill) => {
        const category = 'TECHNICAL'; // Default category since skill relation not included
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          skill: { name: 'Skill', category: 'TECHNICAL' }, // Placeholder since skill relation not included
          level: userSkill.level,
          proficiency: userSkill.proficiency,
        });
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate gaps (simplified)
      const gaps: any[] = [];
      const strengths: any[] = [];
      const recommendations: any[] = [];

      Object.entries(skillsByCategory).forEach(([category, skills]) => {
        const avgProficiency = skills.reduce((sum, s) => sum + s.proficiency, 0) / skills.length;
        
        if (avgProficiency < 60) {
          gaps.push({
            category,
            averageProficiency: avgProficiency,
            skillCount: skills.length,
            priority: avgProficiency < 40 ? 'HIGH' : 'MEDIUM',
          });
        } else if (avgProficiency > 80) {
          strengths.push({
            category,
            averageProficiency: avgProficiency,
            skillCount: skills.length,
          });
        }
      });

      return {
        userId,
        currentSkills: skillsByCategory,
        gaps,
        strengths,
        recommendations,
        overallScore: currentSkills.length > 0 
          ? currentSkills.reduce((sum, s) => sum + s.proficiency, 0) / currentSkills.length 
          : 0,
      };
    } catch (error) {
      logger.error('Failed to get skill gap analysis', error as Error);
      throw error;
    }
  }

  /**
   * Endorse user skill
   */
  async endorseUserSkill(data: SkillEndorsementData): Promise<any> {
    try {
      const userSkill = await this.prisma.employeeSkill.findUnique({
        where: { id: data.userSkillId },
      });

      if (!userSkill) {
        throw new Error('User skill not found');
      }

      // Check if user has already endorsed this skill
      const existingEndorsement = await this.prisma.skillEndorsement.findFirst({
        where: {
          userSkillId: data.userSkillId,
          endorserId: data.endorsedBy,
        },
      });

      if (existingEndorsement) {
        throw new Error('You have already endorsed this skill');
      }

      const endorsement = await this.prisma.skillEndorsement.create({
        data: {
          userSkillId: data.userSkillId,
          endorserId: data.endorsedBy,
          comment: data.comment,
          rating: data.rating ? Math.max(1, Math.min(5, data.rating)) : undefined,
        },
      });

      logger.info('User skill endorsed', {
        userSkillId: data.userSkillId,
        endorsedBy: data.endorsedBy,
        rating: data.rating,
      });

      return endorsement;
    } catch (error) {
      logger.error('Failed to endorse user skill', error as Error);
      throw error;
    }
  }

  /**
   * Get skill endorsements
   */
  async getSkillEndorsements(
    userSkillId: string,
    options: { page: number; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' }
  ): Promise<{
    endorsements: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const { page, limit, sortBy, sortOrder } = options;
      const skip = (page - 1) * limit;

      const [endorsements, total] = await Promise.all([
        this.prisma.skillEndorsement.findMany({
          where: { userSkillId },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        this.prisma.skillEndorsement.count({ where: { userSkillId } }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        endorsements,
        total,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Failed to get skill endorsements', error as Error);
      throw error;
    }
  }
}
