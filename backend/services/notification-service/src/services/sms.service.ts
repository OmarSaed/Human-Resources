import { Twilio } from 'twilio';
import { createLogger, getServiceConfig } from '@hrms/shared';
import { SMSRequest } from '../models/delivery.models';

const logger = createLogger('sms-service');
const config = getServiceConfig('notification-service');


export class SMSService {
  private twilio: Twilio | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      if (!config.features.sms) {
        logger.info('SMS service disabled in configuration');
        return;
      }

      if (!config.sms.accountSid || !config.sms.authToken || !config.sms.phoneNumber) {
        logger.warn('SMS service not configured - missing Twilio credentials');
        return;
      }

      this.twilio = new Twilio(config.sms.accountSid, config.sms.authToken);
      
      // Test the connection by fetching account info
      await this.twilio.api.accounts(config.sms.accountSid).fetch();
      
      this.isInitialized = true;
      logger.info('SMS service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SMS service', error as Error);
      // Don't throw - allow service to continue without SMS
      this.isInitialized = false;
    }
  }

  async sendSMS(request: SMSRequest): Promise<void> {
    if (!this.isInitialized || !this.twilio) {
      throw new Error('SMS service not initialized');
    }

    try {
      // Format phone number (ensure it starts with + for international format)
      let phoneNumber = request.to.trim();
      if (!phoneNumber.startsWith('+')) {
        // Assume US number if no country code
        phoneNumber = '+1' + phoneNumber.replace(/\D/g, '');
      }

      const message = await this.twilio.messages.create({
        body: request.message,
        from: config.sms.phoneNumber,
        to: phoneNumber,
      });

      logger.info('SMS sent successfully', {
        to: phoneNumber,
        messageSid: message.sid,
        status: message.status,
      });
    } catch (error) {
      logger.error('Failed to send SMS', {
        to: request.to,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async sendBulkSMS(requests: SMSRequest[]): Promise<void> {
    if (!this.isInitialized || !this.twilio) {
      throw new Error('SMS service not initialized');
    }

    const promises = requests.map(request => this.sendSMS(request));
    await Promise.allSettled(promises);
  }

  async cleanup(): Promise<void> {
    // Twilio client doesn't need explicit cleanup
    logger.info('SMS service cleanup completed');
  }

  isHealthy(): boolean {
    return this.isInitialized && this.twilio !== null;
  }
}
