import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createLogger } from '@hrms/shared';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const logger = createLogger('storage-service');

export interface StorageConfig {
  type: 'local' | 's3' | 'minio';
  local?: {
    uploadPath: string;
    maxFileSize: number;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
  };
}

export interface StorageResult {
  key: string;
  url?: string;
  size: number;
  etag?: string;
}

export interface PresignedUrl {
  uploadUrl: string;
  downloadUrl: string;
  expiresIn: number;
}

export class StorageService {
  private s3Client?: S3Client;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    
    if (config.type === 's3' || config.type === 'minio') {
      this.initializeS3Client();
    }
  }

  private initializeS3Client(): void {
    if (!this.config.s3) {
      throw new Error('S3 configuration is required for S3/MinIO storage');
    }

    this.s3Client = new S3Client({
      region: this.config.s3.region,
      credentials: {
        accessKeyId: this.config.s3.accessKeyId,
        secretAccessKey: this.config.s3.secretAccessKey,
      },
      endpoint: this.config.s3.endpoint,
      forcePathStyle: this.config.type === 'minio', // Required for MinIO
    });

    logger.info('S3 client initialized', {
      type: this.config.type,
      bucket: this.config.s3.bucket,
      region: this.config.s3.region,
    });
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    file: Express.Multer.File,
    key: string,
    metadata?: Record<string, string>
  ): Promise<StorageResult> {
    logger.info('Uploading file', { key, size: file.size, mimetype: file.mimetype });

    try {
      switch (this.config.type) {
        case 'local':
          return await this.uploadToLocal(file, key);
        case 's3':
        case 'minio':
          return await this.uploadToS3(file, key, metadata);
        default:
          throw new Error(`Unsupported storage type: ${this.config.type}`);
      }
    } catch (error) {
      logger.error('File upload failed', error as Error);
      throw error;
    }
  }

  /**
   * Upload to local storage
   */
  private async uploadToLocal(file: Express.Multer.File, key: string): Promise<StorageResult> {
    if (!this.config.local) {
      throw new Error('Local storage configuration is required');
    }

    const uploadPath = this.config.local.uploadPath;
    const filePath = path.join(uploadPath, key);
    const dirPath = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Write file
    await fs.writeFile(filePath, file.buffer);

    logger.info('File uploaded to local storage', { filePath, size: file.size });

    return {
      key,
      url: `/files/${key}`,
      size: file.size,
    };
  }

  /**
   * Upload to S3/MinIO
   */
  private async uploadToS3(
    file: Express.Multer.File,
    key: string,
    metadata?: Record<string, string>
  ): Promise<StorageResult> {
    if (!this.s3Client || !this.config.s3) {
      throw new Error('S3 client not initialized');
    }

    const command = new PutObjectCommand({
      Bucket: this.config.s3.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: metadata,
    });

    const result = await this.s3Client.send(command);

    logger.info('File uploaded to S3', { key, etag: result.ETag, size: file.size });

    return {
      key,
      size: file.size,
      etag: result.ETag,
    };
  }

  /**
   * Get file from storage
   */
  async getFile(key: string): Promise<Buffer> {
    logger.info('Retrieving file', { key });

    try {
      switch (this.config.type) {
        case 'local':
          return await this.getFromLocal(key);
        case 's3':
        case 'minio':
          return await this.getFromS3(key);
        default:
          throw new Error(`Unsupported storage type: ${this.config.type}`);
      }
    } catch (error) {
      logger.error('File retrieval failed', error as Error);
      throw error;
    }
  }

  /**
   * Get file from local storage
   */
  private async getFromLocal(key: string): Promise<Buffer> {
    if (!this.config.local) {
      throw new Error('Local storage configuration is required');
    }

    const filePath = path.join(this.config.local.uploadPath, key);
    return await fs.readFile(filePath);
  }

  /**
   * Get file from S3/MinIO
   */
  private async getFromS3(key: string): Promise<Buffer> {
    if (!this.s3Client || !this.config.s3) {
      throw new Error('S3 client not initialized');
    }

    const command = new GetObjectCommand({
      Bucket: this.config.s3.bucket,
      Key: key,
    });

    const result = await this.s3Client.send(command);
    
    if (!result.Body) {
      throw new Error('File body is empty');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of result.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key: string): Promise<void> {
    logger.info('Deleting file', { key });

    try {
      switch (this.config.type) {
        case 'local':
          await this.deleteFromLocal(key);
          break;
        case 's3':
        case 'minio':
          await this.deleteFromS3(key);
          break;
        default:
          throw new Error(`Unsupported storage type: ${this.config.type}`);
      }

      logger.info('File deleted successfully', { key });
    } catch (error) {
      logger.error('File deletion failed', error as Error);
      throw error;
    }
  }

  /**
   * Delete file from local storage
   */
  private async deleteFromLocal(key: string): Promise<void> {
    if (!this.config.local) {
      throw new Error('Local storage configuration is required');
    }

    const filePath = path.join(this.config.local.uploadPath, key);
    await fs.unlink(filePath);
  }

  /**
   * Delete file from S3/MinIO
   */
  private async deleteFromS3(key: string): Promise<void> {
    if (!this.s3Client || !this.config.s3) {
      throw new Error('S3 client not initialized');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.config.s3.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      switch (this.config.type) {
        case 'local':
          return await this.existsInLocal(key);
        case 's3':
        case 'minio':
          return await this.existsInS3(key);
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if file exists in local storage
   */
  private async existsInLocal(key: string): Promise<boolean> {
    if (!this.config.local) {
      return false;
    }

    const filePath = path.join(this.config.local.uploadPath, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists in S3/MinIO
   */
  private async existsInS3(key: string): Promise<boolean> {
    if (!this.s3Client || !this.config.s3) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.s3.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate presigned URLs for upload/download
   */
  async generatePresignedUrls(
    key: string,
    operation: 'upload' | 'download',
    expiresIn: number = 3600
  ): Promise<string> {
    if (this.config.type !== 's3' && this.config.type !== 'minio') {
      throw new Error('Presigned URLs are only supported for S3/MinIO storage');
    }

    if (!this.s3Client || !this.config.s3) {
      throw new Error('S3 client not initialized');
    }

    const command = operation === 'upload' 
      ? new PutObjectCommand({
          Bucket: this.config.s3.bucket,
          Key: key,
        })
      : new GetObjectCommand({
          Bucket: this.config.s3.bucket,
          Key: key,
        });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Generate file checksum
   */
  generateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    availableSpace?: number;
  }> {
    // Implementation would depend on storage type
    // For now, return basic stats
    return {
      totalFiles: 0,
      totalSize: 0,
    };
  }
}
