/**
 * Template-related interfaces and models for notification service
 */

import { NotificationChannel } from '@prisma/client';

export interface CreateTemplateData {
  name: string;
  type: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  variables: Record<string, any>;
  isActive?: boolean;
  category?: string;
  description?: string;
  htmlContent?: string;
  textContent?: string;
}

export interface UpdateTemplateData {
  name?: string;
  type?: string;
  channel?: NotificationChannel;
  subject?: string;
  body?: string;
  variables?: Record<string, any>;
  isActive?: boolean;
  category?: string;
  description?: string;
  htmlContent?: string;
  textContent?: string;
  updatedBy?: string;
}

export interface TemplateFilters {
  channel?: NotificationChannel;
  isActive?: boolean;
  search?: string;
  category?: string;
}

export interface RenderedTemplate {
  subject?: string;
  body: string;
}

export interface TemplateValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  variables: string[];
}

export interface TemplateUsage {
  totalSent: number;
  successCount: number;
  failureCount: number;
  lastUsed?: Date;
  usageByDay: Array<{
    date: string;
    count: number;
  }>;
}
