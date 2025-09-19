import { Kafka, Consumer, EachMessagePayload, ConsumerSubscribeTopics } from 'kafkajs';
import { logger } from '../utils/logger';
import { DomainEvent } from '../types';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T, metadata: EventMetadata) => Promise<void>;

export interface EventMetadata {
  topic: string;
  partition: number;
  offset: string;
  headers: Record<string, any>;
  timestamp: string;
}

export class KafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private isConnected: boolean = false;

  constructor(clientId: string, groupId: string, brokers: string[]) {
    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
    
    this.consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000,
      allowAutoTopicCreation: true,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.consumer.connect();
      this.isConnected = true;
      logger.info('Kafka consumer connected successfully');
    } catch (error) {
      logger.error('Failed to connect Kafka consumer:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.consumer.disconnect();
      this.isConnected = false;
      logger.info('Kafka consumer disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka consumer:', error);
      throw error;
    }
  }

  registerEventHandler<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler as EventHandler);
    logger.info(`Registered handler for event type: ${eventType}`);
  }

  async subscribe(topics: string[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Consumer is not connected');
    }

    try {
      const subscribeTopics: ConsumerSubscribeTopics = {
        topics,
        fromBeginning: false
      };

      await this.consumer.subscribe(subscribeTopics);
      logger.info('Subscribed to topics:', topics);
    } catch (error) {
      logger.error('Failed to subscribe to topics:', error);
      throw error;
    }
  }

  async startConsuming(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Consumer is not connected');
    }

    try {
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });
      
      logger.info('Started consuming messages');
    } catch (error) {
      logger.error('Error starting message consumption:', error);
      throw error;
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      if (!message.value) {
        logger.warn('Received message with no value', { topic, partition, offset: message.offset });
        return;
      }

      const event = JSON.parse(message.value.toString()) as DomainEvent;
      const metadata: EventMetadata = {
        topic,
        partition,
        offset: message.offset,
        headers: this.parseHeaders(message.headers || {}),
        timestamp: message.timestamp,
      };

      logger.debug('Processing event', {
        eventType: event.type,
        eventId: event.id,
        topic,
        partition,
        offset: message.offset,
      });

      // Get handlers for this event type
      const handlers = this.eventHandlers.get(event.type) || [];
      
      if (handlers.length === 0) {
        logger.warn(`No handlers registered for event type: ${event.type}`);
        return;
      }

      // Execute all handlers in parallel
      const promises = handlers.map(handler => 
        this.executeHandler(handler, event, metadata)
      );

      await Promise.all(promises);

      logger.info('Event processed successfully', {
        eventType: event.type,
        eventId: event.id,
        handlersCount: handlers.length,
      });

    } catch (error) {
      logger.error('Error processing message:', {
        topic,
        partition,
        offset: message.offset,
        error: (error as Error).message,
      });
      
      // In production, you might want to implement dead letter queue here
      throw error;
    }
  }

  private async executeHandler(handler: EventHandler, event: DomainEvent, metadata: EventMetadata): Promise<void> {
    try {
      await handler(event, metadata);
    } catch (error) {
      logger.error('Handler execution failed:', {
        eventType: event.type,
        eventId: event.id,
        error: (error as Error).message,
      });
      
      // Re-throw to ensure message is not committed if handler fails
      throw error;
    }
  }

  private parseHeaders(headers: Record<string, any>): Record<string, any> {
    const parsed: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      if (Buffer.isBuffer(value)) {
        parsed[key] = value.toString();
      } else {
        parsed[key] = value;
      }
    }
    
    return parsed;
  }

  // Health check
  isHealthy(): boolean {
    return this.isConnected;
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    logger.info('Initiating consumer shutdown...');
    await this.disconnect();
    logger.info('Consumer shutdown completed');
  }
}
