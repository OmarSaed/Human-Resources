/**
 * Delivery channel interfaces and models for notification service
 */

export interface EmailRequest {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface PushNotificationRequest {
  token: string | string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  clickAction?: string;
}

export interface SMSRequest {
  to: string;
  message: string;
}
