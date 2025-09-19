import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { logger } from '../utils/logger';
import { DomainEvent } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class KafkaProducer {
  private static instance: KafkaProducer;
  private kafka: Kafka;
  private producer: Producer;
  private isConnected: boolean = false;

  private constructor(clientId: string, brokers: string[]) {
    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
    
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Kafka producer connected successfully');
    } catch (error) {
      logger.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Kafka producer disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka producer:', error);
      throw error;
    }
  }

  async publishEvent(topic: string, event: DomainEvent): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Producer is not connected');
    }

    try {
      const message = {
        key: event.id,
        value: JSON.stringify(event),
        headers: {
          eventType: event.type,
          source: event.source,
          version: event.version,
          correlationId: event.correlationId || uuidv4(),
        },
      };

      const record: ProducerRecord = {
        topic,
        messages: [message],
      };

      const result = await this.producer.send(record);
      
      logger.info('Event published successfully', {
        topic,
        eventType: event.type,
        eventId: event.id,
        partition: result[0].partition,
        offset: result[0].baseOffset,
      });
    } catch (error) {
      logger.error('Failed to publish event:', {
        topic,
        eventType: event.type,
        eventId: event.id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async publishBatch(topic: string, events: DomainEvent[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Producer is not connected');
    }

    try {
      const messages = events.map(event => ({
        key: event.id,
        value: JSON.stringify(event),
        headers: {
          eventType: event.type,
          source: event.source,
          version: event.version,
          correlationId: event.correlationId || uuidv4(),
        },
      }));

      const record: ProducerRecord = {
        topic,
        messages,
      };

      const result = await this.producer.send(record);
      
      logger.info('Batch events published successfully', {
        topic,
        eventCount: events.length,
        partitions: result.map(r => ({ partition: r.partition, offset: r.baseOffset })),
      });
    } catch (error) {
      logger.error('Failed to publish batch events:', {
        topic,
        eventCount: events.length,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  // Transaction support for exactly-once semantics
  async publishInTransaction(topic: string, event: DomainEvent): Promise<void> {
    const transaction = await this.producer.transaction();
    
    try {
      const message = {
        key: event.id,
        value: JSON.stringify(event),
        headers: {
          eventType: event.type,
          source: event.source,
          version: event.version,
          correlationId: event.correlationId || uuidv4(),
        },
      };

      await transaction.send({
        topic,
        messages: [message],
      });

      await transaction.commit();
      
      logger.info('Event published in transaction successfully', {
        topic,
        eventType: event.type,
        eventId: event.id,
      });
    } catch (error) {
      await transaction.abort();
      logger.error('Failed to publish event in transaction:', {
        topic,
        eventType: event.type,
        eventId: event.id,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Get singleton instance of KafkaProducer
   */
  static getInstance(clientId?: string, brokers?: string[]): KafkaProducer {
    if (!KafkaProducer.instance) {
      if (!clientId || !brokers) {
        throw new Error('KafkaProducer not initialized. Provide clientId and brokers for first call.');
      }
      KafkaProducer.instance = new KafkaProducer(clientId, brokers);
    }
    return KafkaProducer.instance;
  }

  /**
   * Initialize singleton instance
   */
  static async initialize(clientId: string, brokers: string[]): Promise<KafkaProducer> {
    const instance = KafkaProducer.getInstance(clientId, brokers);
    if (!instance.isConnected) {
      await instance.connect();
    }
    return instance;
  }

  /**
   * Send messages using the raw Kafka producer API
   */
  async send(record: ProducerRecord): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka producer is not connected');
    }

    try {
      await this.producer.send(record);
      logger.debug('Message sent successfully', {
        topic: record.topic,
        messageCount: record.messages.length
      });
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  }
}
