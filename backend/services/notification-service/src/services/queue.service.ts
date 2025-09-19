import Bull from 'bull';
import Redis from 'ioredis';
import { createLogger, getServiceConfig } from '@hrms/shared';
import { NotificationJob } from '../models/queue.models';

const logger = createLogger('queue-service');
const config = getServiceConfig('notification-service');


export class QueueService {
  private redis: Redis | null = null;
  private notificationQueue: Bull.Queue<NotificationJob> | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      if (!config.features.queue) {
        logger.info('Queue service disabled in configuration');
        return;
      }

      // Initialize Redis connection
      this.redis = new Redis(config.redis.url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      await this.redis.connect();

      // Initialize Bull queue
      this.notificationQueue = new Bull<NotificationJob>('notification-queue', {
        redis: config.redis.url,
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50,      // Keep last 50 failed jobs
          attempts: 3,           // Retry failed jobs up to 3 times
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      });

      // Set up job processors
      this.setupJobProcessors();

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      logger.info('Queue service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize queue service', error as Error);
      throw error;
    }
  }

  private setupJobProcessors(): void {
    if (!this.notificationQueue) return;

    // Process notification jobs
    this.notificationQueue.process('send-notification', 10, async (job) => {
      const { notificationId } = job.data;
      
      logger.info('Processing notification job', {
        jobId: job.id,
        notificationId,
        attempt: job.attemptsMade + 1,
      });

      // The actual sending will be handled by the notification service
      // This is just a placeholder - in the real implementation, you'd import
      // and call the notification service method here
      
      // For now, we'll just log and mark as processed
      logger.info('Notification job processed', {
        jobId: job.id,
        notificationId,
      });

      return { notificationId, status: 'processed' };
    });
  }

  private setupEventListeners(): void {
    if (!this.notificationQueue) return;

    this.notificationQueue.on('completed', (job, result) => {
      logger.info('Job completed', {
        jobId: job.id,
        type: job.name,
        result,
      });
    });

    this.notificationQueue.on('failed', (job, error) => {
      logger.error('Job failed', {
        jobId: job.id,
        type: job.name,
        error: error.message,
        attemptsMade: job.attemptsMade,
      });
    });

    this.notificationQueue.on('stalled', (job) => {
      logger.warn('Job stalled', {
        jobId: job.id,
        type: job.name,
      });
    });

    this.notificationQueue.on('progress', (job, progress) => {
      logger.debug('Job progress', {
        jobId: job.id,
        type: job.name,
        progress,
      });
    });
  }

  async addNotificationJob(notificationId: string, scheduledAt?: Date): Promise<Bull.Job<NotificationJob>> {
    if (!this.isInitialized || !this.notificationQueue) {
      throw new Error('Queue service not initialized');
    }

    const jobOptions: Bull.JobOptions = {
      priority: 0, // Normal priority
    };

    if (scheduledAt) {
      jobOptions.delay = scheduledAt.getTime() - Date.now();
    }

    const job = await this.notificationQueue.add('send-notification', {
      notificationId,
      scheduledAt,
    }, jobOptions);

    logger.info('Notification job added to queue', {
      jobId: job.id,
      notificationId,
      scheduledAt: scheduledAt?.toISOString(),
    });

    return job;
  }

  async addUrgentNotificationJob(notificationId: string): Promise<Bull.Job<NotificationJob>> {
    if (!this.isInitialized || !this.notificationQueue) {
      throw new Error('Queue service not initialized');
    }

    const job = await this.notificationQueue.add('send-notification', {
      notificationId,
    }, {
      priority: 100, // High priority
      delay: 0,      // Send immediately
    });

    logger.info('Urgent notification job added to queue', {
      jobId: job.id,
      notificationId,
    });

    return job;
  }

  async getQueueStats(): Promise<any> {
    if (!this.isInitialized || !this.notificationQueue) {
      throw new Error('Queue service not initialized');
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.notificationQueue.getWaiting(),
      this.notificationQueue.getActive(),
      this.notificationQueue.getCompleted(),
      this.notificationQueue.getFailed(),
      this.notificationQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }

  async getJobs(type: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed', start = 0, end = 10): Promise<Bull.Job[]> {
    if (!this.isInitialized || !this.notificationQueue) {
      throw new Error('Queue service not initialized');
    }

    switch (type) {
      case 'waiting':
        return this.notificationQueue.getWaiting(start, end);
      case 'active':
        return this.notificationQueue.getActive(start, end);
      case 'completed':
        return this.notificationQueue.getCompleted(start, end);
      case 'failed':
        return this.notificationQueue.getFailed(start, end);
      case 'delayed':
        return this.notificationQueue.getDelayed(start, end);
      default:
        throw new Error(`Invalid job type: ${type}`);
    }
  }

  async retryJob(jobId: string): Promise<void> {
    if (!this.isInitialized || !this.notificationQueue) {
      throw new Error('Queue service not initialized');
    }

    const job = await this.notificationQueue.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await job.retry();
    logger.info('Job retried', { jobId });
  }

  async removeJob(jobId: string): Promise<void> {
    if (!this.isInitialized || !this.notificationQueue) {
      throw new Error('Queue service not initialized');
    }

    const job = await this.notificationQueue.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await job.remove();
    logger.info('Job removed', { jobId });
  }

  async pauseQueue(): Promise<void> {
    if (!this.isInitialized || !this.notificationQueue) {
      throw new Error('Queue service not initialized');
    }

    await this.notificationQueue.pause();
    logger.info('Queue paused');
  }

  async resumeQueue(): Promise<void> {
    if (!this.isInitialized || !this.notificationQueue) {
      throw new Error('Queue service not initialized');
    }

    await this.notificationQueue.resume();
    logger.info('Queue resumed');
  }

  async cleanup(): Promise<void> {
    try {
      if (this.notificationQueue) {
        await this.notificationQueue.close();
        logger.info('Notification queue closed');
      }

      if (this.redis) {
        await this.redis.disconnect();
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.error('Error during queue service cleanup', error as Error);
    }
  }

  isHealthy(): boolean {
    return this.isInitialized && 
           this.redis?.status === 'ready' && 
           this.notificationQueue !== null;
  }
}
