import { createLogger } from '@hrms/shared';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { ParsedResume, ParseOptions } from '../models/resume.models';

const logger = createLogger('resume-parsing-service');



export class ResumeParsingService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      // Initialize any ML models or external services here
      this.isInitialized = true;
      logger.info('Resume parsing service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize resume parsing service', error as Error);
      throw error;
    }
  }

  /**
   * Parse resume from file buffer
   */
  async parseResumeFromBuffer(
    buffer: Buffer,
    filename: string,
    options: ParseOptions = {}
  ): Promise<ParsedResume> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const fileExtension = path.extname(filename).toLowerCase();
      let text = '';

      switch (fileExtension) {
        case '.pdf':
          text = await this.extractTextFromPDF(buffer);
          break;
        case '.txt':
          text = buffer.toString('utf-8');
          break;
        case '.doc':
        case '.docx':
          text = await this.extractTextFromWord(buffer);
          break;
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }

      const parsedResume = await this.parseTextContent(text, options);

      logger.info('Resume parsed successfully', {
        filename,
        textLength: text.length,
        extractedSkills: parsedResume.skills.length,
        extractedExperience: parsedResume.experience.length,
      });

      return parsedResume;
    } catch (error) {
      logger.error('Failed to parse resume from buffer', error as Error);
      throw error;
    }
  }

  /**
   * Parse resume from file path
   */
  async parseResumeFromFile(
    filePath: string,
    options: ParseOptions = {}
  ): Promise<ParsedResume> {
    try {
      const buffer = fs.readFileSync(filePath);
      const filename = path.basename(filePath);
      return await this.parseResumeFromBuffer(buffer, filename, options);
    } catch (error) {
      logger.error(`Failed to parse resume from file ${filePath}`, error as Error);
      throw error;
    }
  }

  /**
   * Parse resume from URL
   */
  async parseResumeFromURL(
    url: string,
    options: ParseOptions = {}
  ): Promise<ParsedResume> {
    try {
      // This would typically download the file from the URL
      // For now, we'll throw an error as this requires additional setup
      throw new Error('Parsing from URL not implemented yet');
    } catch (error) {
      logger.error(`Failed to parse resume from URL ${url}`, error as Error);
      throw error;
    }
  }

  /**
   * Extract skills from resume text
   */
  async extractSkills(text: string): Promise<string[]> {
    try {
      // Common programming languages and technologies
      const skillKeywords = [
        // Programming Languages
        'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin',
        'typescript', 'go', 'rust', 'scala', 'r', 'matlab', 'perl', 'lua', 'dart',
        
        // Web Technologies
        'html', 'css', 'react', 'angular', 'vue', 'node.js', 'express', 'django',
        'flask', 'spring', 'laravel', 'rails', 'jquery', 'bootstrap', 'sass', 'less',
        
        // Databases
        'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'oracle',
        'sql server', 'sqlite', 'cassandra', 'dynamodb', 'firebase',
        
        // Cloud & DevOps
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab',
        'github', 'terraform', 'ansible', 'chef', 'puppet',
        
        // Tools & Frameworks
        'git', 'jira', 'confluence', 'slack', 'figma', 'sketch', 'photoshop',
        'illustrator', 'indesign', 'after effects', 'premiere',
        
        // Methodologies
        'agile', 'scrum', 'kanban', 'lean', 'devops', 'ci/cd', 'tdd', 'bdd',
        
        // Soft Skills
        'leadership', 'communication', 'problem solving', 'teamwork', 'project management',
        'analytical thinking', 'creativity', 'adaptability', 'time management'
      ];

      const foundSkills: string[] = [];
      const lowerText = text.toLowerCase();

      for (const skill of skillKeywords) {
        if (lowerText.includes(skill.toLowerCase())) {
          foundSkills.push(skill);
        }
      }

      // Remove duplicates and return
      return [...new Set(foundSkills)];
    } catch (error) {
      logger.error('Failed to extract skills', error as Error);
      return [];
    }
  }

  /**
   * Extract contact information
   */
  private extractContactInfo(text: string): ParsedResume['personalInfo'] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const linkedInRegex = /(linkedin\.com\/in\/[a-zA-Z0-9-]+)/gi;
    
    const emails = text.match(emailRegex);
    const phones = text.match(phoneRegex);
    const linkedInProfiles = text.match(linkedInRegex);

    // Try to extract name from the beginning of the resume
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const firstLine = lines[0]?.trim();
    
    let firstName = '';
    let lastName = '';
    
    if (firstLine && firstLine.length < 50 && !firstLine.includes('@')) {
      const nameParts = firstLine.split(' ').filter(part => part.length > 1);
      if (nameParts.length >= 2) {
        firstName = nameParts[0];
        lastName = nameParts[nameParts.length - 1];
      }
    }

    return {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: emails?.[0] || undefined,
      phone: phones?.[0] || undefined,
      linkedIn: linkedInProfiles?.[0] || undefined,
    };
  }

  /**
   * Extract experience information
   */
  private extractExperience(text: string): ParsedResume['experience'] {
    const experience: ParsedResume['experience'] = [];
    
    // This is a simplified version. In a real implementation,
    // you would use more sophisticated NLP techniques
    const sections = text.split(/\n\s*\n/);
    
    for (const section of sections) {
      if (section.toLowerCase().includes('experience') || 
          section.toLowerCase().includes('work') ||
          section.toLowerCase().includes('employment')) {
        
        // Extract company names, positions, dates, etc.
        // This is a very basic implementation
        const lines = section.split('\n').filter(line => line.trim().length > 0);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Look for patterns that might indicate job positions
          if (line.length > 10 && line.length < 100) {
            const dateRegex = /\b(19|20)\d{2}\b/g;
            const dates = line.match(dateRegex);
            
            if (dates && dates.length > 0) {
              experience.push({
                company: 'Unknown Company',
                position: line.replace(dateRegex, '').trim(),
                startDate: dates[0],
                endDate: dates[1] || 'Present',
                description: lines[i + 1]?.trim() || '',
              });
            }
          }
        }
      }
    }
    
    return experience;
  }

  /**
   * Extract education information
   */
  private extractEducation(text: string): ParsedResume['education'] {
    const education: ParsedResume['education'] = [];
    
    const sections = text.split(/\n\s*\n/);
    
    for (const section of sections) {
      if (section.toLowerCase().includes('education') || 
          section.toLowerCase().includes('university') ||
          section.toLowerCase().includes('college') ||
          section.toLowerCase().includes('degree')) {
        
        const lines = section.split('\n').filter(line => line.trim().length > 0);
        
        for (const line of lines) {
          if (line.toLowerCase().includes('university') || 
              line.toLowerCase().includes('college') ||
              line.toLowerCase().includes('institute')) {
            
            const dateRegex = /\b(19|20)\d{2}\b/g;
            const dates = line.match(dateRegex);
            
            education.push({
              institution: line.replace(dateRegex, '').trim(),
              degree: 'Unknown Degree',
              startDate: dates?.[0],
              endDate: dates?.[1],
            });
          }
        }
      }
    }
    
    return education;
  }

  /**
   * Parse text content into structured resume data
   */
  private async parseTextContent(text: string, options: ParseOptions): Promise<ParsedResume> {
    const parsedResume: ParsedResume = {
      personalInfo: {},
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      languages: [],
      raw_text: text,
    };

    // Extract contact information
    if (options.extractContact !== false) {
      parsedResume.personalInfo = this.extractContactInfo(text);
    }

    // Extract skills
    if (options.extractSkills !== false) {
      parsedResume.skills = await this.extractSkills(text);
    }

    // Extract experience
    if (options.extractExperience !== false) {
      parsedResume.experience = this.extractExperience(text);
    }

    // Extract education
    if (options.extractEducation !== false) {
      parsedResume.education = this.extractEducation(text);
    }

    // Extract summary (first paragraph that's not contact info)
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 50);
    for (const paragraph of paragraphs) {
      if (!paragraph.includes('@') && 
          !paragraph.toLowerCase().includes('experience') &&
          !paragraph.toLowerCase().includes('education')) {
        parsedResume.summary = paragraph.trim();
        break;
      }
    }

    return parsedResume;
  }

  /**
   * Extract text from PDF buffer
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      logger.error('Failed to extract text from PDF', error as Error);
      throw new Error('Failed to parse PDF file');
    }
  }

  /**
   * Extract text from Word document
   */
  private async extractTextFromWord(buffer: Buffer): Promise<string> {
    try {
      // For Word documents, you would typically use a library like mammoth
      // For now, we'll return a placeholder
      return 'Word document parsing not implemented yet. Please use PDF or text files.';
    } catch (error) {
      logger.error('Failed to extract text from Word document', error as Error);
      throw new Error('Failed to parse Word document');
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup any resources, models, or connections
      this.isInitialized = false;
      logger.info('Resume parsing service cleaned up successfully');
    } catch (error) {
      logger.error('Failed to cleanup resume parsing service', error as Error);
    }
  }
}
