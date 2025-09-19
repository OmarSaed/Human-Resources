/**
 * Document Service Storage Configuration
 * 
 * This file shows how to use the shared storage configuration
 * in the document service to enable S3 uploads.
 */

import { StorageService } from '../services/storage.service';
import { 
  createServiceStorageConfig, 
  validateStorageConfig, 
  getEnvironmentStorageConfig 
} from '@hrms/shared';

/**
 * Initialize storage service for document service
 */
export function initializeStorageService(): StorageService {
  // Get the storage configuration from shared service
  const storageConfig = createServiceStorageConfig('document-service');
  
  // Validate the configuration
  validateStorageConfig(storageConfig);
  
  // Log environment-specific recommendations
  const envConfig = getEnvironmentStorageConfig();
  
  if (envConfig.isProduction && storageConfig.type !== 's3') {
    console.warn('⚠️  Production environment detected but not using S3 storage');
  }
  
  if (envConfig.isDevelopment && storageConfig.type === 's3') {
    console.log('🔧 Development environment using S3 storage');
  }
  
  // Create and return the storage service
  return new StorageService(storageConfig);
}


// Re-export for convenience
export { StorageService };
export type { StorageConfig } from '@hrms/shared';
