import { createLogger } from '@hrms/shared';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('file-storage-service');

export interface UploadOptions {
  folder?: string;
  allowedTypes?: string[];
  maxSize?: number; // in bytes
  generateThumbnail?: boolean;
}

export interface FileMetadata {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  folder?: string;
  uploadedAt: Date;
  tags?: string[];
}

export interface UploadResult {
  success: boolean;
  file?: FileMetadata;
  error?: string;
}

export class FileStorageService {
  private storageBasePath: string;
  private baseUrl: string;
  private isInitialized = false;

  constructor() {
    this.storageBasePath = process.env.FILE_STORAGE_PATH || './uploads';
    this.baseUrl = process.env.FILE_STORAGE_BASE_URL || 'http://localhost:3000/files';
  }

  async initialize(): Promise<void> {
    try {
      // Create storage directories if they don't exist
      await this.ensureDirectoryExists(this.storageBasePath);
      await this.ensureDirectoryExists(path.join(this.storageBasePath, 'resumes'));
      await this.ensureDirectoryExists(path.join(this.storageBasePath, 'documents'));
      await this.ensureDirectoryExists(path.join(this.storageBasePath, 'images'));
      await this.ensureDirectoryExists(path.join(this.storageBasePath, 'temp'));

      this.isInitialized = true;
      logger.info('File storage service initialized successfully', {
        storageBasePath: this.storageBasePath,
        baseUrl: this.baseUrl,
      });
    } catch (error) {
      logger.error('Failed to initialize file storage service', error as Error);
      throw error;
    }
  }

  /**
   * Upload file from buffer
   */
  async uploadFromBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Validate file type
      if (options.allowedTypes && !options.allowedTypes.includes(mimeType)) {
        return {
          success: false,
          error: `File type ${mimeType} is not allowed`,
        };
      }

      // Validate file size
      if (options.maxSize && buffer.length > options.maxSize) {
        return {
          success: false,
          error: `File size ${buffer.length} exceeds maximum allowed size ${options.maxSize}`,
        };
      }

      // Generate unique filename
      const fileExtension = path.extname(originalName);
      const fileName = `${uuidv4()}${fileExtension}`;
      const folder = options.folder || 'documents';
      const filePath = path.join(this.storageBasePath, folder, fileName);

      // Ensure folder exists
      await this.ensureDirectoryExists(path.join(this.storageBasePath, folder));

      // Write file
      await fs.promises.writeFile(filePath, buffer);

      const fileMetadata: FileMetadata = {
        id: uuidv4(),
        originalName,
        fileName,
        mimeType,
        size: buffer.length,
        url: `${this.baseUrl}/${folder}/${fileName}`,
        folder,
        uploadedAt: new Date(),
      };

      logger.info('File uploaded successfully', {
        fileId: fileMetadata.id,
        originalName,
        fileName,
        size: buffer.length,
        folder,
      });

      return {
        success: true,
        file: fileMetadata,
      };
    } catch (error) {
      logger.error('Failed to upload file from buffer', error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Upload file from local path
   */
  async uploadFromPath(
    filePath: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const buffer = await fs.promises.readFile(filePath);
      const originalName = path.basename(filePath);
      
      // Get MIME type based on file extension
      const mimeType = this.getMimeType(path.extname(originalName));

      return await this.uploadFromBuffer(buffer, originalName, mimeType, options);
    } catch (error) {
      logger.error(`Failed to upload file from path ${filePath}`, error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Download file
   */
  async downloadFile(fileName: string, folder: string = 'documents'): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.storageBasePath, folder, fileName);
      
      if (!await this.fileExists(filePath)) {
        return null;
      }

      const buffer = await fs.promises.readFile(filePath);
      
      logger.info('File downloaded successfully', { fileName, folder });
      return buffer;
    } catch (error) {
      logger.error(`Failed to download file ${fileName}`, error as Error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileName: string, folder: string = 'documents'): Promise<boolean> {
    try {
      const filePath = path.join(this.storageBasePath, folder, fileName);
      
      if (!await this.fileExists(filePath)) {
        return false;
      }

      await fs.promises.unlink(filePath);
      
      logger.info('File deleted successfully', { fileName, folder });
      return true;
    } catch (error) {
      logger.error(`Failed to delete file ${fileName}`, error as Error);
      return false;
    }
  }

  /**
   * Copy file
   */
  async copyFile(
    sourceFileName: string,
    sourceFolder: string,
    targetFolder: string,
    targetFileName?: string
  ): Promise<string | null> {
    try {
      const sourcePath = path.join(this.storageBasePath, sourceFolder, sourceFileName);
      const newFileName = targetFileName || sourceFileName;
      const targetPath = path.join(this.storageBasePath, targetFolder, newFileName);

      if (!await this.fileExists(sourcePath)) {
        return null;
      }

      await this.ensureDirectoryExists(path.join(this.storageBasePath, targetFolder));
      await fs.promises.copyFile(sourcePath, targetPath);

      logger.info('File copied successfully', {
        sourceFileName,
        sourceFolder,
        targetFileName: newFileName,
        targetFolder,
      });

      return newFileName;
    } catch (error) {
      logger.error(`Failed to copy file ${sourceFileName}`, error as Error);
      return null;
    }
  }

  /**
   * Move file
   */
  async moveFile(
    sourceFileName: string,
    sourceFolder: string,
    targetFolder: string,
    targetFileName?: string
  ): Promise<string | null> {
    try {
      const copiedFileName = await this.copyFile(sourceFileName, sourceFolder, targetFolder, targetFileName);
      
      if (copiedFileName) {
        await this.deleteFile(sourceFileName, sourceFolder);
        logger.info('File moved successfully', {
          sourceFileName,
          sourceFolder,
          targetFileName: copiedFileName,
          targetFolder,
        });
        return copiedFileName;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to move file ${sourceFileName}`, error as Error);
      return null;
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(fileName: string, folder: string = 'documents'): Promise<FileMetadata | null> {
    try {
      const filePath = path.join(this.storageBasePath, folder, fileName);
      
      if (!await this.fileExists(filePath)) {
        return null;
      }

      const stats = await fs.promises.stat(filePath);
      const fileExtension = path.extname(fileName);
      
      return {
        id: fileName, // Use filename as ID for now
        originalName: fileName,
        fileName,
        mimeType: this.getMimeType(fileExtension),
        size: stats.size,
        url: `${this.baseUrl}/${folder}/${fileName}`,
        folder,
        uploadedAt: stats.birthtime,
      };
    } catch (error) {
      logger.error(`Failed to get file info for ${fileName}`, error as Error);
      return null;
    }
  }

  /**
   * List files in folder
   */
  async listFiles(folder: string = 'documents'): Promise<FileMetadata[]> {
    try {
      const folderPath = path.join(this.storageBasePath, folder);
      
      if (!await this.directoryExists(folderPath)) {
        return [];
      }

      const fileNames = await fs.promises.readdir(folderPath);
      const files: FileMetadata[] = [];

      for (const fileName of fileNames) {
        const fileInfo = await this.getFileInfo(fileName, folder);
        if (fileInfo) {
          files.push(fileInfo);
        }
      }

      return files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    } catch (error) {
      logger.error(`Failed to list files in folder ${folder}`, error as Error);
      return [];
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    folderStats: Record<string, { files: number; size: number }>;
  }> {
    try {
      const folders = ['resumes', 'documents', 'images', 'temp'];
      const folderStats: Record<string, { files: number; size: number }> = {};
      let totalFiles = 0;
      let totalSize = 0;

      for (const folder of folders) {
        const files = await this.listFiles(folder);
        const folderSize = files.reduce((sum, file) => sum + file.size, 0);
        
        folderStats[folder] = {
          files: files.length,
          size: folderSize,
        };
        
        totalFiles += files.length;
        totalSize += folderSize;
      }

      return {
        totalFiles,
        totalSize,
        folderStats,
      };
    } catch (error) {
      logger.error('Failed to get storage stats', error as Error);
      return {
        totalFiles: 0,
        totalSize: 0,
        folderStats: {},
      };
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
    try {
      const tempFolder = path.join(this.storageBasePath, 'temp');
      
      if (!await this.directoryExists(tempFolder)) {
        return 0;
      }

      const files = await fs.promises.readdir(tempFolder);
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const fileName of files) {
        const filePath = path.join(tempFolder, fileName);
        const stats = await fs.promises.stat(filePath);
        
        if (stats.birthtime.getTime() < cutoffTime) {
          await fs.promises.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info('Temporary files cleaned up', {
        deletedCount,
        olderThanHours,
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup temporary files', error as Error);
      return 0;
    }
  }

  // Private helper methods

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.zip': 'application/zip',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup any resources or connections
      logger.info('File storage service cleaned up successfully');
    } catch (error) {
      logger.error('Failed to cleanup file storage service', error as Error);
    }
  }
}
