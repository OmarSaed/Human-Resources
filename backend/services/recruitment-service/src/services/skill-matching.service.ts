import { createLogger } from '@hrms/shared';
import {
  SkillMatchResult,
  SkillAnalysis,
  JobRequirement,
  MatchingOptions
} from '../models/skill-matching.models';

const logger = createLogger('skill-matching-service');

export class SkillMatchingService {
  private skillSynonyms: Map<string, string[]> = new Map();
  private skillCategories: Map<string, string> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      // Initialize skill synonyms and categories
      this.initializeSkillSynonyms();
      this.initializeSkillCategories();
      
      this.isInitialized = true;
      logger.info('Skill matching service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize skill matching service', error as Error);
      throw error;
    }
  }

  /**
   * Match candidate skills against job requirements
   */
  async matchSkills(
    candidateSkills: string[],
    jobRequirements: JobRequirement[],
    candidateId: string,
    jobPostingId: string,
    options: MatchingOptions = {}
  ): Promise<SkillMatchResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const normalizedCandidateSkills = this.normalizeSkills(candidateSkills);
      const normalizedJobSkills = jobRequirements.map(req => ({
        ...req,
        skill: this.normalizeSkill(req.skill),
      }));

      const skillMatches: SkillMatchResult['skillMatches'] = [];
      const missingSkills: string[] = [];
      const extraSkills: string[] = [];

      // Check each job requirement
      for (const requirement of normalizedJobSkills) {
        const candidateHas = this.hasSkill(
          normalizedCandidateSkills,
          requirement.skill,
          options.skillSynonyms
        );

        skillMatches.push({
          skill: requirement.skill,
          required: requirement.required,
          candidateHas,
          weight: requirement.weight,
        });

        if (!candidateHas && requirement.required) {
          missingSkills.push(requirement.skill);
        }
      }

      // Find extra skills
      const requiredSkillsSet = new Set(normalizedJobSkills.map(req => req.skill));
      for (const skill of normalizedCandidateSkills) {
        if (!this.hasSkill(Array.from(requiredSkillsSet), skill, options.skillSynonyms)) {
          extraSkills.push(skill);
        }
      }

      // Calculate overall score
      const overallScore = this.calculateOverallScore(skillMatches, options);

      // Generate recommendations
      const recommendations = this.generateRecommendations(skillMatches, missingSkills, extraSkills);

      const result: SkillMatchResult = {
        candidateId,
        jobPostingId,
        overallScore,
        skillMatches,
        missingSkills,
        extraSkills,
        recommendations,
      };

      logger.info('Skill matching completed', {
        candidateId,
        jobPostingId,
        overallScore,
        missingSkillsCount: missingSkills.length,
        extraSkillsCount: extraSkills.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to match skills', error as Error);
      throw error;
    }
  }

  /**
   * Analyze candidate skills and extract proficiency levels
   */
  async analyzeSkills(
    skills: string[],
    experienceText?: string,
    resumeText?: string
  ): Promise<SkillAnalysis[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const skillAnalyses: SkillAnalysis[] = [];

      for (const skill of skills) {
        const normalizedSkill = this.normalizeSkill(skill);
        const category = this.getSkillCategory(normalizedSkill);
        
        // Estimate proficiency level based on context
        const proficiencyLevel = this.estimateProficiencyLevel(
          normalizedSkill,
          experienceText || '',
          resumeText || ''
        );

        // Estimate years of experience
        const yearsOfExperience = this.estimateExperience(
          normalizedSkill,
          experienceText || ''
        );

        skillAnalyses.push({
          skill: normalizedSkill,
          category: category as any,
          proficiencyLevel,
          yearsOfExperience,
          confidence: 0.7, // Default confidence level
        });
      }

      logger.info('Skill analysis completed', {
        skillCount: skills.length,
        analyzedCount: skillAnalyses.length,
      });

      return skillAnalyses;
    } catch (error) {
      logger.error('Failed to analyze skills', error as Error);
      throw error;
    }
  }

  /**
   * Find similar candidates based on skill matching
   */
  async findSimilarCandidates(
    targetSkills: string[],
    candidatePool: Array<{ id: string; skills: string[] }>,
    options: MatchingOptions = {}
  ): Promise<Array<{ candidateId: string; score: number; matchingSkills: string[] }>> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const normalizedTargetSkills = this.normalizeSkills(targetSkills);
      const results: Array<{ candidateId: string; score: number; matchingSkills: string[] }> = [];

      for (const candidate of candidatePool) {
        const normalizedCandidateSkills = this.normalizeSkills(candidate.skills);
        const matchingSkills: string[] = [];
        let score = 0;

        for (const targetSkill of normalizedTargetSkills) {
          if (this.hasSkill(normalizedCandidateSkills, targetSkill, options.skillSynonyms)) {
            matchingSkills.push(targetSkill);
            score += 1;
          }
        }

        // Calculate percentage score
        const percentageScore = normalizedTargetSkills.length > 0 
          ? (score / normalizedTargetSkills.length) * 100 
          : 0;

        if (percentageScore >= (options.minimumScore || 0)) {
          results.push({
            candidateId: candidate.id,
            score: percentageScore,
            matchingSkills,
          });
        }
      }

      // Sort by score (highest first)
      results.sort((a, b) => b.score - a.score);

      logger.info('Similar candidates found', {
        targetSkillsCount: targetSkills.length,
        candidatePoolSize: candidatePool.length,
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to find similar candidates', error as Error);
      throw error;
    }
  }

  /**
   * Extract skills from text using NLP techniques
   */
  async extractSkillsFromText(text: string): Promise<string[]> {
    try {
      const extractedSkills: string[] = [];
      const lowerText = text.toLowerCase();

      // Get all known skills
      const allSkills = Array.from(this.skillCategories.keys());

      for (const skill of allSkills) {
        if (lowerText.includes(skill.toLowerCase())) {
          extractedSkills.push(skill);
        }
      }

      // Also check synonyms
      for (const [mainSkill, synonyms] of this.skillSynonyms.entries()) {
        for (const synonym of synonyms) {
          if (lowerText.includes(synonym.toLowerCase())) {
            extractedSkills.push(mainSkill);
            break;
          }
        }
      }

      // Remove duplicates
      return [...new Set(extractedSkills)];
    } catch (error) {
      logger.error('Failed to extract skills from text', error as Error);
      return [];
    }
  }

  /**
   * Get skill recommendations for a job posting
   */
  async getSkillRecommendations(
    currentSkills: string[],
    targetRole: string,
    industryTrends?: string[]
  ): Promise<Array<{ skill: string; importance: number; reason: string }>> {
    try {
      const recommendations: Array<{ skill: string; importance: number; reason: string }> = [];
      const normalizedCurrentSkills = this.normalizeSkills(currentSkills);

      // Define role-based skill recommendations
      const roleSkillMap: Record<string, Array<{ skill: string; importance: number }>> = {
        'software developer': [
          { skill: 'javascript', importance: 9 },
          { skill: 'python', importance: 8 },
          { skill: 'git', importance: 9 },
          { skill: 'react', importance: 7 },
          { skill: 'node.js', importance: 7 },
          { skill: 'sql', importance: 6 },
        ],
        'data scientist': [
          { skill: 'python', importance: 9 },
          { skill: 'machine learning', importance: 9 },
          { skill: 'statistics', importance: 8 },
          { skill: 'sql', importance: 8 },
          { skill: 'tensorflow', importance: 7 },
          { skill: 'pandas', importance: 7 },
        ],
        'product manager': [
          { skill: 'agile', importance: 8 },
          { skill: 'project management', importance: 9 },
          { skill: 'analytics', importance: 7 },
          { skill: 'user research', importance: 7 },
          { skill: 'roadmap planning', importance: 8 },
        ],
      };

      const targetRoleSkills = roleSkillMap[targetRole.toLowerCase()] || [];

      for (const roleSkill of targetRoleSkills) {
        if (!this.hasSkill(normalizedCurrentSkills, roleSkill.skill, true)) {
          recommendations.push({
            skill: roleSkill.skill,
            importance: roleSkill.importance,
            reason: `Essential skill for ${targetRole} role`,
          });
        }
      }

      // Add trending skills if provided
      if (industryTrends) {
        for (const trendSkill of industryTrends) {
          if (!this.hasSkill(normalizedCurrentSkills, trendSkill, true)) {
            recommendations.push({
              skill: trendSkill,
              importance: 6,
              reason: 'Currently trending in the industry',
            });
          }
        }
      }

      // Sort by importance
      recommendations.sort((a, b) => b.importance - a.importance);

      return recommendations.slice(0, 10); // Return top 10 recommendations
    } catch (error) {
      logger.error('Failed to get skill recommendations', error as Error);
      return [];
    }
  }

  // Private helper methods

  private initializeSkillSynonyms(): void {
    this.skillSynonyms.set('javascript', ['js', 'ecmascript', 'es6', 'es2015']);
    this.skillSynonyms.set('python', ['py', 'python3', 'python2']);
    this.skillSynonyms.set('react', ['reactjs', 'react.js']);
    this.skillSynonyms.set('angular', ['angularjs', 'angular.js']);
    this.skillSynonyms.set('vue', ['vuejs', 'vue.js']);
    this.skillSynonyms.set('node.js', ['nodejs', 'node']);
    this.skillSynonyms.set('mysql', ['my sql', 'mysql database']);
    this.skillSynonyms.set('postgresql', ['postgres', 'psql']);
    this.skillSynonyms.set('machine learning', ['ml', 'artificial intelligence', 'ai']);
    this.skillSynonyms.set('deep learning', ['dl', 'neural networks']);
    this.skillSynonyms.set('project management', ['pm', 'program management']);
    this.skillSynonyms.set('user experience', ['ux', 'user experience design']);
    this.skillSynonyms.set('user interface', ['ui', 'user interface design']);
  }

  private initializeSkillCategories(): void {
    // Technical skills
    const technicalSkills = [
      'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin',
      'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
      'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
      'git', 'github', 'gitlab', 'jira', 'confluence'
    ];

    // Soft skills
    const softSkills = [
      'leadership', 'communication', 'problem solving', 'teamwork', 'creativity',
      'adaptability', 'time management', 'critical thinking', 'decision making'
    ];

    // Domain skills
    const domainSkills = [
      'machine learning', 'data science', 'cybersecurity', 'devops',
      'project management', 'product management', 'business analysis',
      'digital marketing', 'seo', 'content marketing'
    ];

    technicalSkills.forEach(skill => this.skillCategories.set(skill, 'TECHNICAL'));
    softSkills.forEach(skill => this.skillCategories.set(skill, 'SOFT'));
    domainSkills.forEach(skill => this.skillCategories.set(skill, 'DOMAIN'));
  }

  private normalizeSkills(skills: string[]): string[] {
    return skills.map(skill => this.normalizeSkill(skill));
  }

  private normalizeSkill(skill: string): string {
    return skill.toLowerCase().trim();
  }

  private hasSkill(skillList: string[], targetSkill: string, useSynonyms = false): boolean {
    const normalizedTarget = this.normalizeSkill(targetSkill);
    
    // Direct match
    if (skillList.includes(normalizedTarget)) {
      return true;
    }

    // Synonym match
    if (useSynonyms) {
      const synonyms = this.skillSynonyms.get(normalizedTarget) || [];
      for (const synonym of synonyms) {
        if (skillList.includes(this.normalizeSkill(synonym))) {
          return true;
        }
      }

      // Check if target is a synonym of any skill in the list
      for (const [mainSkill, synonymList] of this.skillSynonyms.entries()) {
        if (synonymList.includes(normalizedTarget) && skillList.includes(mainSkill)) {
          return true;
        }
      }
    }

    return false;
  }

  private calculateOverallScore(
    skillMatches: SkillMatchResult['skillMatches'],
    options: MatchingOptions
  ): number {
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const match of skillMatches) {
      totalWeight += match.weight;
      if (match.candidateHas) {
        matchedWeight += match.weight;
      }
    }

    return totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;
  }

  private generateRecommendations(
    skillMatches: SkillMatchResult['skillMatches'],
    missingSkills: string[],
    extraSkills: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (missingSkills.length > 0) {
      recommendations.push(`Consider acquiring these missing skills: ${missingSkills.join(', ')}`);
    }

    if (extraSkills.length > 0) {
      recommendations.push(`Candidate has additional valuable skills: ${extraSkills.slice(0, 5).join(', ')}`);
    }

    const requiredSkillsMatched = skillMatches.filter(m => m.required && m.candidateHas).length;
    const totalRequiredSkills = skillMatches.filter(m => m.required).length;

    if (totalRequiredSkills > 0) {
      const requiredMatchPercentage = (requiredSkillsMatched / totalRequiredSkills) * 100;
      
      if (requiredMatchPercentage >= 80) {
        recommendations.push('Strong candidate with most required skills');
      } else if (requiredMatchPercentage >= 60) {
        recommendations.push('Good candidate but may need some training');
      } else {
        recommendations.push('Candidate may require significant skill development');
      }
    }

    return recommendations;
  }

  private getSkillCategory(skill: string): string {
    return this.skillCategories.get(skill) || 'TECHNICAL';
  }

  private estimateProficiencyLevel(skill: string, experienceText: string, resumeText: string): number {
    // Simple heuristic-based proficiency estimation
    const text = (experienceText + ' ' + resumeText).toLowerCase();
    const skillLower = skill.toLowerCase();

    let level = 5; // Default medium level

    // Look for proficiency indicators
    if (text.includes(`expert in ${skillLower}`) || text.includes(`${skillLower} expert`)) {
      level = 9;
    } else if (text.includes(`advanced ${skillLower}`) || text.includes(`senior ${skillLower}`)) {
      level = 8;
    } else if (text.includes(`experienced ${skillLower}`) || text.includes(`proficient ${skillLower}`)) {
      level = 7;
    } else if (text.includes(`intermediate ${skillLower}`)) {
      level = 6;
    } else if (text.includes(`basic ${skillLower}`) || text.includes(`beginner ${skillLower}`)) {
      level = 3;
    }

    // Adjust based on frequency
    const skillMentions = (text.match(new RegExp(skillLower, 'g')) || []).length;
    if (skillMentions > 5) level = Math.min(level + 1, 10);
    if (skillMentions < 2) level = Math.max(level - 1, 1);

    return level;
  }

  private estimateExperience(skill: string, experienceText: string): number | undefined {
    const text = experienceText.toLowerCase();
    const skillLower = skill.toLowerCase();

    // Look for explicit experience mentions
    const patterns = [
      new RegExp(`(\\d+)\\s*years?\\s*.*${skillLower}`, 'i'),
      new RegExp(`${skillLower}.*?([\\d]+)\\s*years?`, 'i'),
      new RegExp(`(\\d+)\\+\\s*years?\\s*.*${skillLower}`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }

    return undefined;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup any resources or models
      this.skillSynonyms.clear();
      this.skillCategories.clear();
      this.isInitialized = false;
      logger.info('Skill matching service cleaned up successfully');
    } catch (error) {
      logger.error('Failed to cleanup skill matching service', error as Error);
    }
  }
}
