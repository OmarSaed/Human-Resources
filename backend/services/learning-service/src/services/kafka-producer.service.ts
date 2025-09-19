import { KafkaProducer, createLogger, getServiceConfig } from '@hrms/shared';
import { LearningEvent } from '../models/events.models';

const logger = createLogger('kafka-producer');


export class KafkaProducerService {
  private producer: KafkaProducer;
  private isInitialized = false;
  private config = getServiceConfig('learning-service');

  constructor() {
    this.producer = KafkaProducer.getInstance(this.config.kafka.clientId);
  }

  async initialize(): Promise<void> {
    try {
      await this.producer.connect();
      this.isInitialized = true;
      logger.info('Kafka producer service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka producer service', error as Error);
      throw error;
    }
  }

  async publishEvent(topic: string, event: LearningEvent): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Kafka producer not initialized');
    }

    try {
      await this.producer.publishEvent(topic, event);
      logger.debug('Event published successfully', {
        topic,
        eventType: event.type,
        eventId: event.id,
      });
    } catch (error) {
      logger.error('Failed to publish event', {
        topic,
        eventType: event.type,
        eventId: event.id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async publishCourseEnrolledEvent(enrollmentData: any): Promise<void> {
    await this.publishEvent('learning-events', {
      id: `course_enrolled_${enrollmentData.id}`,
      type: 'learning.course.enrolled',
      timestamp: new Date(),
      version: '1.0.0',
      source: 'learning-service',
      data: enrollmentData,
    });
  }

  async publishCourseCompletedEvent(completionData: any): Promise<void> {
    await this.publishEvent('learning-events', {
      id: `course_completed_${completionData.enrollmentId}`,
      type: 'learning.course.completed',
      timestamp: new Date(),
      version: '1.0.0',
      source: 'learning-service',
      data: completionData,
    });
  }

  async publishCertificateEarnedEvent(certificateData: any): Promise<void> {
    await this.publishEvent('learning-events', {
      id: `certificate_earned_${certificateData.id}`,
      type: 'learning.certificate.earned',
      timestamp: new Date(),
      version: '1.0.0',
      source: 'learning-service',
      data: certificateData,
    });
  }

  async publishSkillAcquiredEvent(skillData: any): Promise<void> {
    await this.publishEvent('learning-events', {
      id: `skill_acquired_${skillData.id}`,
      type: 'learning.skill.acquired',
      timestamp: new Date(),
      version: '1.0.0',
      source: 'learning-service',
      data: skillData,
    });
  }

  async publishAssessmentCompletedEvent(assessmentData: any): Promise<void> {
    await this.publishEvent('learning-events', {
      id: `assessment_completed_${assessmentData.attemptId}`,
      type: 'learning.assessment.completed',
      timestamp: new Date(),
      version: '1.0.0',
      source: 'learning-service',
      data: assessmentData,
    });
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isInitialized) {
        await this.producer.disconnect();
        this.isInitialized = false;
        logger.info('Kafka producer service cleaned up');
      }
    } catch (error) {
      logger.error('Error during Kafka producer cleanup', error as Error);
    }
  }

  isHealthy(): boolean {
    return this.isInitialized && this.producer.isHealthy();
  }
}
