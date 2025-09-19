/**
 * Storage Helper Utility for HRMS Services
 * 
 * This utility provides a simple way to create and configure storage services
 * across different HRMS microservices using shared configuration.
 */

import { StorageConfig } from '../types';
import { storageConfig } from '../config';

export interface StorageServiceInterface {
  uploadFile(file: any, key: string, metadata?: Record<string, string>): Promise<{
    key: string;
    url?: string;
    size: number;
    etag?: string;
  }>;
  getFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  fileExists(key: string): Promise<boolean>;
  generatePresignedUrls?(key: string, operation: 'upload' | 'download', expiresIn?: number): Promise<string>;
}

/**
 * Get the configured storage configuration
 */
export function getStorageConfig(): StorageConfig {
  return storageConfig;
}

/**
 * Create storage configuration for a specific service
 * This allows customization per service while maintaining shared defaults
 */
export function createServiceStorageConfig(serviceName: string, overrides?: Partial<StorageConfig>): StorageConfig {
  const baseConfig = getStorageConfig();
  
  // Service-specific customizations
  const serviceDefaults: Record<string, Partial<StorageConfig>> = {
    'document-service': {
      local: {
        ...baseConfig.local,
        uploadPath: process.env.UPLOAD_DIR || './uploads/documents',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
      },
    },
    'employee-service': {
      local: {
        ...baseConfig.local,
        uploadPath: process.env.UPLOAD_DIR || './uploads/employees',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
      },
    },
    'recruitment-service': {
      local: {
        ...baseConfig.local,
        uploadPath: process.env.UPLOAD_DIR || './uploads/recruitment',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '26214400'), // 25MB
      },
    },
  };

  return {
    ...baseConfig,
    ...serviceDefaults[serviceName],
    ...overrides,
  };
}

/**
 * Validate storage configuration
 */
export function validateStorageConfig(config: StorageConfig): void {
  if (!config.type) {
    throw new Error('Storage type is required');
  }

  if (config.type === 'local' && !config.local?.uploadPath) {
    throw new Error('Local storage requires uploadPath');
  }

  if ((config.type === 's3' || config.type === 'minio') && !config.s3) {
    throw new Error('S3/MinIO storage requires s3 configuration');
  }

  if (config.s3 && (!config.s3.bucket || !config.s3.region || !config.s3.accessKeyId || !config.s3.secretAccessKey)) {
    throw new Error('S3 configuration requires bucket, region, accessKeyId, and secretAccessKey');
  }
}

/**
 * Generate storage key for file organization
 */
export function generateStorageKey(
  serviceName: string,
  userId: string,
  filename: string,
  folder?: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const basePath = folder ? `${folder}/` : '';
  
  return `${serviceName}/${basePath}${userId}/${timestamp}_${sanitizedFilename}`;
}

/**
 * Get MIME type allowed list for different services
 */
export function getAllowedMimeTypes(serviceName: string): string[] {
  const commonTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/csv',
  ];

  const serviceSpecificTypes: Record<string, string[]> = {
    'document-service': [
      ...commonTypes,
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'video/mp4', 'video/avi', 'video/mov',
      'audio/mp3', 'audio/wav', 'audio/ogg',
    ],
    'employee-service': [
      ...commonTypes,
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    'recruitment-service': [
      ...commonTypes,
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', // For video resumes
    ],
  };

  return serviceSpecificTypes[serviceName] || commonTypes;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Environment-specific storage configuration
 */
export function getEnvironmentStorageConfig(): {
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  recommendedConfig: Partial<StorageConfig>;
} {
  const env = process.env.NODE_ENV || 'development';
  
  const isDevelopment = env === 'development';
  const isProduction = env === 'production';
  const isTest = env === 'test';

  let recommendedConfig: Partial<StorageConfig> = {};

  if (isTest) {
    recommendedConfig = {
      type: 'local',
      local: {
        uploadPath: './test-uploads',
        maxFileSize: 1024 * 1024, // 1MB for tests
      },
    };
  } else if (isDevelopment) {
    recommendedConfig = {
      type: 'local',
      local: {
        uploadPath: './uploads',
        maxFileSize: 10 * 1024 * 1024, // 10MB for dev
      },
    };
  } else if (isProduction) {
    recommendedConfig = {
      type: 's3',
      s3: {
        bucket: process.env.AWS_S3_BUCKET || 'hrms-documents-prod',
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        endpoint: process.env.AWS_S3_ENDPOINT,
      },
    };
  }

  return {
    isDevelopment,
    isProduction,
    isTest,
    recommendedConfig,
  };
}
