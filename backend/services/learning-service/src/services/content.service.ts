import { createLogger } from '@hrms/shared';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import AWS from 'aws-sdk';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const logger = createLogger('content-service');
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export interface ContentProcessingOptions {
  format?: string;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  compression?: boolean;
}

export interface VideoProcessingOptions {
  format?: string;
  quality?: string;
  resolution?: string;
  bitrate?: string;
  compression?: boolean;
}

export interface ContentMetadata {
  type: 'image' | 'video' | 'document' | 'audio';
  size: number;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  format: string;
  originalName: string;
}

export interface ProcessedContent {
  url: string;
  thumbnailUrl?: string;
  metadata: ContentMetadata;
  processingTime: number;
}

export class ContentService {
  private s3?: AWS.S3;
  private bucketName: string;
  private initialized = false;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'hrms-learning-content';
  }

  async initialize(): Promise<void> {
    try {
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        this.s3 = new AWS.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1',
        });
        logger.info('AWS S3 client initialized');
      } else {
        logger.warn('AWS credentials not found, using local storage');
      }
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize content service', error as Error);
      throw error;
    }
  }

  async processImage(
    buffer: Buffer,
    filename: string,
    options: ContentProcessingOptions = {}
  ): Promise<ProcessedContent> {
    const startTime = Date.now();
    
    try {
      const {
        format = 'webp',
        quality = 85,
        maxWidth = 1920,
        maxHeight = 1080,
        compression = true,
      } = options;

      let sharpInstance = sharp(buffer);
      
      // Get original metadata
      const metadata = await sharpInstance.metadata();
      
      // Resize if needed
      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }
      }

      // Apply format and quality
      if (format === 'webp') {
        sharpInstance = sharpInstance.webp({ quality });
      } else if (format === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({ quality });
      } else if (format === 'png') {
        sharpInstance = sharpInstance.png({ compressionLevel: compression ? 9 : 6 });
      }

      const processedBuffer = await sharpInstance.toBuffer();
      const processedMetadata = await sharp(processedBuffer).metadata();

      // Upload to storage
      const url = await this.uploadToStorage(
        processedBuffer,
        `images/${Date.now()}-${filename.replace(/\.[^/.]+$/, '')}.${format}`
      );

      const processingTime = Date.now() - startTime;

      return {
        url,
        metadata: {
          type: 'image',
          size: processedBuffer.length,
          dimensions: {
            width: processedMetadata.width || 0,
            height: processedMetadata.height || 0,
          },
          format,
          originalName: filename,
        },
        processingTime,
      };
    } catch (error) {
      logger.error('Failed to process image', error as Error);
      throw error;
    }
  }

  async processVideo(
    buffer: Buffer,
    filename: string,
    options: VideoProcessingOptions = {}
  ): Promise<ProcessedContent> {
    const startTime = Date.now();
    const tempInputPath = `/tmp/input-${Date.now()}-${filename}`;
    const tempOutputPath = `/tmp/output-${Date.now()}-${filename}`;
    
    try {
      const {
        format = 'mp4',
        quality = 'medium',
        resolution = '720p',
        bitrate = '1000k',
        compression = true,
      } = options;

      // Write buffer to temporary file
      await writeFile(tempInputPath, buffer);

      // Process video with ffmpeg
      await new Promise((resolve, reject) => {
        let command = ffmpeg(tempInputPath);
        
        // Set output options
        command = command
          .videoCodec('libx264')
          .size(resolution)
          .videoBitrate(bitrate);
        
        if (compression) {
          command = command
            .addOption('-preset', 'medium')
            .addOption('-crf', '23');
        }

        command
          .on('end', () => resolve(tempOutputPath))
          .on('error', reject)
          .save(tempOutputPath);
      });

      // Read processed file
      const processedBuffer = await fs.promises.readFile(tempOutputPath);

      // Generate thumbnail
      const thumbnailBuffer = await this.generateVideoThumbnail(tempInputPath);
      const thumbnailUrl = thumbnailBuffer ? 
        await this.uploadToStorage(
          thumbnailBuffer,
          `thumbnails/${Date.now()}-${filename.replace(/\.[^/.]+$/, '')}.jpg`
        ) : undefined;

      // Upload to storage
      const url = await this.uploadToStorage(
        processedBuffer,
        `videos/${Date.now()}-${filename.replace(/\.[^/.]+$/, '')}.${format}`
      );

      // Get video metadata
      const metadata = await this.getVideoMetadata(tempInputPath);

      const processingTime = Date.now() - startTime;

      // Cleanup temporary files
      await this.cleanupTempFiles([tempInputPath, tempOutputPath]);

      return {
        url,
        thumbnailUrl,
        metadata: {
          type: 'video',
          size: processedBuffer.length,
          duration: metadata.duration,
          dimensions: metadata.dimensions,
          format,
          originalName: filename,
        },
        processingTime,
      };
    } catch (error) {
      // Cleanup on error
      await this.cleanupTempFiles([tempInputPath, tempOutputPath]);
      logger.error('Failed to process video', error as Error);
      throw error;
    }
  }

  private async generateVideoThumbnail(videoPath: string): Promise<Buffer | null> {
    try {
      const thumbnailPath = `/tmp/thumb-${Date.now()}.jpg`;
      
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: ['00:00:01'],
            filename: 'thumbnail.jpg',
            folder: '/tmp',
            size: '320x240',
          })
          .on('end', resolve)
          .on('error', reject);
      });

      const thumbnailBuffer = await fs.promises.readFile('/tmp/thumbnail.jpg');
      await this.cleanupTempFiles(['/tmp/thumbnail.jpg']);
      
      return thumbnailBuffer;
    } catch (error) {
      logger.warn('Failed to generate video thumbnail', error as Error);
      return null;
    }
  }

  private async getVideoMetadata(videoPath: string): Promise<{
    duration?: number;
    dimensions?: { width: number; height: number };
  }> {
    try {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err: any, data: any) => {
          if (err) {
            reject(err);
            return;
          }

          const videoStream = data.streams?.find((stream: any) => stream.codec_type === 'video');
          
          resolve({
            duration: data.format?.duration ? Math.round(parseFloat(data.format.duration)) : undefined,
            dimensions: videoStream ? {
              width: videoStream.width || 0,
              height: videoStream.height || 0,
            } : undefined,
          });
        });
      });
    } catch (error) {
      logger.warn('Failed to get video metadata', error as Error);
      return {};
    }
  }

  private async uploadToStorage(buffer: Buffer, key: string): Promise<string> {
    if (this.s3) {
      try {
        const result = await this.s3.upload({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: this.getContentType(key),
        }).promise();
        
        return result.Location;
      } catch (error) {
        logger.error('Failed to upload to S3', error as Error);
        throw error;
      }
    } else {
      // Fallback to local storage
      const localPath = `uploads/${key}`;
      const directory = path.dirname(localPath);
      
      await fs.promises.mkdir(directory, { recursive: true });
      await writeFile(localPath, buffer);
      
      return `http://localhost:${process.env.PORT || 3000}/${localPath}`;
    }
  }

  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private async cleanupTempFiles(paths: string[]): Promise<void> {
    for (const filePath of paths) {
      try {
        await unlink(filePath);
      } catch (error) {
        // Ignore errors - file might not exist
      }
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup any resources if needed
    logger.info('Content service cleanup completed');
  }
}
