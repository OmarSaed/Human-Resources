/**
 * File storage and upload related interfaces
 */

export interface UploadOptions {
  allowedTypes?: string[];
  maxSizeBytes?: number;
  generateThumbnail?: boolean;
  resizeImage?: boolean;
  folder?: string;
}

export interface FileMetadata {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: Date;
  category?: string;
  tags?: string[];
}

export interface UploadResult {
  success: boolean;
  file?: FileMetadata;
  error?: string;
  validationErrors?: string[];
}
