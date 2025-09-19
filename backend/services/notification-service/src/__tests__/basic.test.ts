import { EmailService } from '../services/email.service';
import { NotificationService } from '../services/notification.service';
import { SMSService } from '../services/sms.service';
import { PushService } from '../services/push.service';
import { QueueService } from '../services/queue.service';

describe('Notification Service Basic Tests', () => {
  describe('EmailService', () => {
    let emailService: EmailService;

    beforeEach(() => {
      emailService = new EmailService();
    });

    it('should initialize without errors', async () => {
      await expect(emailService.initialize()).resolves.not.toThrow();
    });

    it('should send email successfully', async () => {
      await emailService.initialize();
      
      const emailRequest = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
        html: '<p>This is a test email</p>',
      };

      await expect(emailService.sendEmail(emailRequest)).resolves.toBeDefined();
    });

    it('should send bulk emails', async () => {
      await emailService.initialize();
      
      const emailRequests = [
        {
          to: 'test1@example.com',
          subject: 'Test Email 1',
          text: 'This is test email 1',
        },
        {
          to: 'test2@example.com',
          subject: 'Test Email 2',
          text: 'This is test email 2',
        },
      ];

      await expect(emailService.sendBulkEmail(emailRequests)).resolves.not.toThrow();
    });
  });

  describe('SMSService', () => {
    let smsService: SMSService;

    beforeEach(() => {
      smsService = new SMSService();
    });

    it('should initialize without errors', async () => {
      await expect(smsService.initialize()).resolves.not.toThrow();
    });

    it('should send SMS successfully', async () => {
      await smsService.initialize();
      
      const smsRequest = {
        to: '+1234567890',
        message: 'Test SMS message',
      };

      await expect(smsService.sendSMS(smsRequest)).resolves.toBeDefined();
    });

    it('should send bulk SMS', async () => {
      await smsService.initialize();
      
      const smsRequests = [
        {
          to: '+1234567890',
          message: 'Test SMS 1',
        },
        {
          to: '+1234567891',
          message: 'Test SMS 2',
        },
      ];

      await expect(smsService.sendBulkSMS(smsRequests)).resolves.not.toThrow();
    });
  });

  describe('PushService', () => {
    let pushService: PushService;

    beforeEach(() => {
      pushService = new PushService();
    });

    it('should initialize without errors', async () => {
      await expect(pushService.initialize()).resolves.not.toThrow();
    });

    it('should send push notification successfully', async () => {
      await pushService.initialize();
      
      const pushRequest = {
        token: 'device-token-123',
        title: 'Test Notification',
        body: 'This is a test push notification',
        data: { type: 'test' },
      };

      await expect(pushService.sendPushNotification(pushRequest)).resolves.toBeDefined();
    });

    it('should check if service is healthy', async () => {
      await pushService.initialize();
      
      const isHealthy = pushService.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('QueueService', () => {
    let queueService: QueueService;

    beforeEach(() => {
      queueService = new QueueService();
    });

    it('should initialize without errors', async () => {
      await expect(queueService.initialize()).resolves.not.toThrow();
    });

    it('should add notification job to queue', async () => {
      await queueService.initialize();
      
      const notificationId = 'notification-123';
      const scheduledAt = new Date();

      await expect(queueService.addNotificationJob(notificationId, scheduledAt)).resolves.toBeDefined();
    });

    it('should get queue statistics', async () => {
      await queueService.initialize();
      
      const stats = await queueService.getQueueStats();
      
      expect(stats).toBeDefined();
    });
  });

  describe('NotificationService', () => {
    let notificationService: NotificationService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        notification: {
          create: jest.fn().mockResolvedValue({
            id: 'notification-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({
            id: 'notification-123',
            isRead: true,
          }),
          count: jest.fn().mockResolvedValue(0),
          groupBy: jest.fn().mockResolvedValue([]),
        },
        notificationTemplate: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        userNotificationPreference: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        deliveryLog: {
          create: jest.fn().mockResolvedValue({ id: 'log-123' }),
        },
      };
      
      notificationService = new NotificationService(mockPrisma);
    });

    it('should send notification successfully', async () => {
      const notificationData = {
        type: 'EMPLOYEE_WELCOME' as const,
        channel: 'EMAIL' as const,
        priority: 'NORMAL' as const,
        userId: 'user-123',
        email: 'test@example.com',
        subject: 'Welcome to HRMS',
        message: 'Welcome to our HR Management System',
        source: 'employee-service',
      };

      await expect(notificationService.sendNotification(notificationData)).resolves.toBeDefined();
    });

    it('should list user notifications', async () => {
      const userId = 'user-123';
      const options = {
        unreadOnly: false,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      await expect(notificationService.listUserNotifications(userId, options)).resolves.toBeDefined();
    });

    it('should mark notification as read', async () => {
      const notificationId = 'notification-123';
      const userId = 'user-123';

      mockPrisma.notification.findUnique.mockResolvedValueOnce({
        id: notificationId,
        userId,
        isRead: false,
      });

      await expect(notificationService.markAsRead(notificationId, userId)).resolves.not.toThrow();
    });

    it('should get notification statistics', async () => {
      const userId = 'user-123';

      const stats = await notificationService.getNotificationStatistics(userId);
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalNotifications).toBe('number');
      expect(typeof stats.unreadNotifications).toBe('number');
    });

    it('should check if service is working', async () => {
      // Test that the service can be used for basic operations
      const userId = 'user-123';
      await expect(notificationService.getNotificationStatistics(userId)).resolves.toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should have required environment variables', () => {
      expect(process.env.NODE_ENV).toBeDefined();
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.EMAIL_HOST).toBeDefined();
      expect(process.env.TWILIO_ACCOUNT_SID).toBeDefined();
      expect(process.env.FIREBASE_PROJECT_ID).toBeDefined();
    });
  });
});
