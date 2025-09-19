import nodemailer from 'nodemailer';
import { createLogger, getServiceConfig } from '@hrms/shared';
import { EmailRequest } from '../models/delivery.models';

const logger = createLogger('email-service');
const config = getServiceConfig('notification-service');


export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      if (!config.features.email) {
        logger.info('Email service disabled in configuration');
        return;
      }

      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465, // true for 465, false for other ports
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates in development
        },
      });

      // Verify connection
      if (config.email.user && config.email.pass && this.transporter) {
        await this.transporter.verify();
        logger.info('Email service connected successfully');
      } else {
        logger.warn('Email service initialized without authentication (development mode)');
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize email service', error as Error);
      // Don't throw - allow service to continue without email
      this.isInitialized = false;
    }
  }

  async sendEmail(request: EmailRequest): Promise<void> {
    if (!this.isInitialized || !this.transporter) {
      throw new Error('Email service not initialized');
    }

    try {
      const recipients = Array.isArray(request.to) ? request.to : [request.to];
      
      for (const recipient of recipients) {
        const mailOptions = {
          from: config.email.from,
          to: recipient,
          subject: request.subject,
          text: request.text,
          html: request.html,
          attachments: request.attachments,
        };

        const result = await this.transporter.sendMail(mailOptions);
        
        logger.info('Email sent successfully', {
          to: recipient,
          subject: request.subject,
          messageId: result.messageId,
        });
      }
    } catch (error) {
      logger.error('Failed to send email', {
        to: request.to,
        subject: request.subject,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async sendBulkEmail(requests: EmailRequest[]): Promise<void> {
    if (!this.isInitialized || !this.transporter) {
      throw new Error('Email service not initialized');
    }

    const promises = requests.map(request => this.sendEmail(request));
    await Promise.allSettled(promises);
  }

  async cleanup(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      logger.info('Email service transporter closed');
    }
  }

  isHealthy(): boolean {
    return this.isInitialized && this.transporter !== null;
  }
}
