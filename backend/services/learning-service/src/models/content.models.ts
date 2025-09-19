/**
 * Content processing-related interfaces and models for learning service
 */

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
