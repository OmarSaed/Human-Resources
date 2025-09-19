import { createLogger } from '@hrms/shared';
import sharp from 'sharp';
import pdf2pic from 'pdf2pic';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const logger = createLogger('content-processing-service');

export interface ProcessingResult {
  content?: string;
  metadata?: Record<string, any>;
  thumbnailBuffer?: Buffer;
  previewBuffer?: Buffer;
  extractedText?: string;
  wordCount?: number;
  pageCount?: number;
}

export interface ProcessingOptions {
  extractText?: boolean;
  generateThumbnail?: boolean;
  generatePreview?: boolean;
  thumbnailSize?: { width: number; height: number };
  previewSize?: { width: number; height: number };
}

export class ContentProcessingService {
  private readonly tempDir: string;

  constructor(tempDir: string = '/tmp/document-processing') {
    this.tempDir = tempDir;
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.warn('Failed to create temp directory', { tempDir: this.tempDir, error });
    }
  }

  /**
   * Process document based on file type
   */
  async processDocument(
    file: Express.Multer.File,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const {
      extractText = true,
      generateThumbnail = true,
      generatePreview = false,
      thumbnailSize = { width: 300, height: 400 },
      previewSize = { width: 800, height: 600 }
    } = options;

    logger.info('Processing document', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      options
    });

    const result: ProcessingResult = {};

    try {
      // Determine file type and process accordingly
      const fileType = this.getFileType(file.mimetype);

      switch (fileType) {
        case 'pdf':
          Object.assign(result, await this.processPDF(file, options));
          break;
        case 'image':
          Object.assign(result, await this.processImage(file, options));
          break;
        case 'text':
          Object.assign(result, await this.processText(file, options));
          break;
        case 'office':
          Object.assign(result, await this.processOfficeDocument(file, options));
          break;
        default:
          logger.warn('Unsupported file type for processing', { mimetype: file.mimetype });
          result.metadata = await this.extractBasicMetadata(file);
      }

      logger.info('Document processing completed', {
        filename: file.originalname,
        hasContent: !!result.content,
        hasThumbnail: !!result.thumbnailBuffer,
        hasPreview: !!result.previewBuffer,
        wordCount: result.wordCount
      });

      return result;
    } catch (error) {
      logger.error('Document processing failed', error as Error);
      
      // Return basic metadata even if processing fails
      return {
        metadata: await this.extractBasicMetadata(file)
      };
    }
  }

  /**
   * Process PDF files
   */
  private async processPDF(
    file: Express.Multer.File,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {};
    const tempFilePath = path.join(this.tempDir, `${Date.now()}_${file.originalname}`);

    try {
      // Write buffer to temp file
      await fs.writeFile(tempFilePath, file.buffer);

      // Extract text content
      if (options.extractText) {
        try {
          const { stdout } = await execAsync(`pdftotext "${tempFilePath}" -`);
          result.content = stdout.trim();
          result.extractedText = result.content;
          result.wordCount = this.countWords(result.content);
        } catch (error) {
          logger.warn('Failed to extract text from PDF', { filename: file.originalname, error });
        }
      }

      // Get PDF metadata
      try {
        const { stdout } = await execAsync(`pdfinfo "${tempFilePath}"`);
        result.metadata = this.parsePDFInfo(stdout);
        result.pageCount = result.metadata?.pages || 0;
      } catch (error) {
        logger.warn('Failed to extract PDF metadata', { filename: file.originalname, error });
      }

      // Generate thumbnail from first page
      if (options.generateThumbnail) {
        try {
          const convert = pdf2pic.fromPath(tempFilePath, {
            density: 150,
            saveFilename: 'thumbnail',
            savePath: this.tempDir,
            format: 'png',
            width: options.thumbnailSize?.width || 300,
            height: options.thumbnailSize?.height || 400
          });

          const page = await convert(1, true); // Second parameter is saveFilename boolean
          if (page && (page as any).buffer) {
            result.thumbnailBuffer = (page as any).buffer;
          }
        } catch (error) {
          logger.warn('Failed to generate PDF thumbnail', { filename: file.originalname, error });
        }
      }

      return result;
    } finally {
      // Cleanup temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (error) {
        logger.warn('Failed to cleanup temp file', { tempFilePath, error });
      }
    }
  }

  /**
   * Process image files
   */
  private async processImage(
    file: Express.Multer.File,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {};

    try {
      const image = sharp(file.buffer);
      const metadata = await image.metadata();

      // Extract metadata
      result.metadata = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasProfile: metadata.hasProfile,
        hasAlpha: metadata.hasAlpha,
        ...metadata.exif
      };

      // Generate thumbnail
      if (options.generateThumbnail) {
        result.thumbnailBuffer = await image
          .resize(
            options.thumbnailSize?.width || 300,
            options.thumbnailSize?.height || 400,
            { fit: 'inside', withoutEnlargement: true }
          )
          .jpeg({ quality: 80 })
          .toBuffer();
      }

      // Generate preview (higher quality)
      if (options.generatePreview) {
        result.previewBuffer = await image
          .resize(
            options.previewSize?.width || 800,
            options.previewSize?.height || 600,
            { fit: 'inside', withoutEnlargement: true }
          )
          .jpeg({ quality: 90 })
          .toBuffer();
      }

      return result;
    } catch (error) {
      logger.error('Image processing failed', error as Error);
      throw error;
    }
  }

  /**
   * Process text files
   */
  private async processText(
    file: Express.Multer.File,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {};

    try {
      const content = file.buffer.toString('utf-8');
      
      result.content = content;
      result.extractedText = content;
      result.wordCount = this.countWords(content);
      
      result.metadata = {
        encoding: 'utf-8',
        lineCount: content.split('\n').length,
        characterCount: content.length
      };

      return result;
    } catch (error) {
      logger.error('Text processing failed', error as Error);
      throw error;
    }
  }

  /**
   * Process Office documents (Word, Excel, PowerPoint)
   */
  private async processOfficeDocument(
    file: Express.Multer.File,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const result: ProcessingResult = {};
    const tempFilePath = path.join(this.tempDir, `${Date.now()}_${file.originalname}`);

    try {
      // Write buffer to temp file
      await fs.writeFile(tempFilePath, file.buffer);

      // Extract text using LibreOffice (if available)
      if (options.extractText) {
        try {
          const outputPath = path.join(this.tempDir, `${Date.now()}_output.txt`);
          await execAsync(`libreoffice --headless --convert-to txt --outdir "${this.tempDir}" "${tempFilePath}"`);
          
          const textFilePath = tempFilePath.replace(path.extname(tempFilePath), '.txt');
          const content = await fs.readFile(textFilePath, 'utf-8');
          
          result.content = content.trim();
          result.extractedText = result.content;
          result.wordCount = this.countWords(result.content);
          
          // Cleanup text file
          await fs.unlink(textFilePath);
        } catch (error) {
          logger.warn('Failed to extract text from Office document', { filename: file.originalname, error });
        }
      }

      // Generate thumbnail by converting to PDF first, then to image
      if (options.generateThumbnail) {
        try {
          const pdfPath = tempFilePath.replace(path.extname(tempFilePath), '.pdf');
          await execAsync(`libreoffice --headless --convert-to pdf --outdir "${this.tempDir}" "${tempFilePath}"`);
          
          if (await this.fileExists(pdfPath)) {
            const convert = pdf2pic.fromPath(pdfPath, {
              density: 150,
              saveFilename: 'thumbnail',
              savePath: this.tempDir,
              format: 'png',
              width: options.thumbnailSize?.width || 300,
              height: options.thumbnailSize?.height || 400
            });

            const page = await convert(1, true); // Second parameter is saveFilename boolean
            if (page && (page as any).buffer) {
              result.thumbnailBuffer = (page as any).buffer;
            }

            // Cleanup PDF file
            await fs.unlink(pdfPath);
          }
        } catch (error) {
          logger.warn('Failed to generate Office document thumbnail', { filename: file.originalname, error });
        }
      }

      result.metadata = await this.extractBasicMetadata(file);
      return result;
    } finally {
      // Cleanup temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (error) {
        logger.warn('Failed to cleanup temp file', { tempFilePath, error });
      }
    }
  }

  /**
   * Extract basic metadata from any file
   */
  private async extractBasicMetadata(file: Express.Multer.File): Promise<Record<string, any>> {
    return {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      extension: path.extname(file.originalname).toLowerCase(),
      uploadedAt: new Date().toISOString()
    };
  }

  /**
   * Determine file type category
   */
  private getFileType(mimetype: string): string {
    if (mimetype === 'application/pdf') return 'pdf';
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('text/')) return 'text';
    if (mimetype.includes('word') || 
        mimetype.includes('excel') || 
        mimetype.includes('powerpoint') ||
        mimetype.includes('spreadsheet') ||
        mimetype.includes('presentation')) return 'office';
    
    return 'unknown';
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Parse PDF info output
   */
  private parsePDFInfo(pdfInfoOutput: string): Record<string, any> {
    const metadata: Record<string, any> = {};
    const lines = pdfInfoOutput.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        
        if (key === 'pages') {
          metadata.pages = parseInt(value);
        } else if (key === 'page size') {
          metadata.pageSize = value;
        } else if (key === 'file size') {
          metadata.fileSize = value;
        } else {
          metadata[key] = value;
        }
      }
    }

    return metadata;
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate document preview for supported formats
   */
  async generatePreview(
    file: Express.Multer.File,
    format: 'png' | 'jpg' = 'png',
    maxWidth: number = 800,
    maxHeight: number = 600
  ): Promise<Buffer | null> {
    try {
      const fileType = this.getFileType(file.mimetype);
      
      switch (fileType) {
        case 'image':
          return await sharp(file.buffer)
            .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
            .toFormat(format)
            .toBuffer();
        
        case 'pdf':
          const tempFilePath = path.join(this.tempDir, `${Date.now()}_preview.pdf`);
          await fs.writeFile(tempFilePath, file.buffer);
          
          try {
            const convert = pdf2pic.fromPath(tempFilePath, {
              density: 150,
              saveFilename: 'preview',
              savePath: this.tempDir,
              format,
              width: maxWidth,
              height: maxHeight
            });

            const page = await convert(1, true); // Second parameter is saveFilename boolean
            return (page as any)?.buffer || null;
          } finally {
            await fs.unlink(tempFilePath);
          }
        
        default:
          return null;
      }
    } catch (error) {
      logger.error('Preview generation failed', error as Error);
      return null;
    }
  }
}
