/**
 * Resume parsing and analysis related interfaces
 */

export interface ParsedResume {
  personalInfo: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    linkedIn?: string;
    portfolio?: string;
  };
  summary?: string;
  skills: string[];
  experience: Array<{
    company: string;
    position: string;
    startDate?: string;
    endDate?: string;
    duration?: string;
    description?: string;
    current?: boolean;
  }>;
  education: Array<{
    institution: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
  certifications: string[];
  languages: string[];
  projects?: Array<{
    name: string;
    description?: string;
    technologies?: string[];
    url?: string;
  }>;
  raw_text: string;
}

export interface ParseOptions {
  extractSkills?: boolean;
  extractExperience?: boolean;
  extractEducation?: boolean;
  extractContact?: boolean;
  format?: 'json' | 'structured';
}
