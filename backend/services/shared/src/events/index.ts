import { BaseEvent } from '../types';
import { KafkaProducer } from '../kafka/producer';

/**
 * Event Factory for creating standardized events
 */
export class EventFactory {
  static createEvent<T extends Record<string, any>>(
    type: string,
    source: string,
    data: T,
    correlationId?: string
  ): BaseEvent & { data: T } {
    return {
      id: this.generateEventId(),
      type,
      timestamp: new Date(),
      version: '1.0.0',
      source,
      correlationId: correlationId || this.generateCorrelationId(),
      data,
    };
  }

  static createSystemEvent<T extends Record<string, any>>(
    type: string,
    source: string,
    data: T,
    correlationId?: string
  ): BaseEvent & { data: T } {
    return this.createEvent(type, source, data, correlationId);
  }

  private static generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Publish an event to Kafka
   */
  static async publishEvent(eventType: string, data: Record<string, any>, source?: string): Promise<void> {
    try {
      // Create a standardized event
      const event = this.createEvent(eventType, source || 'system', data);
      
      // Get the appropriate topic for this event type
      const topic = EventRouter.getTopicForEventType(eventType);
      
      try {
        // Get Kafka producer instance
        const producer = KafkaProducer.getInstance();
        
        // Publish the event to Kafka
        await producer.send({
          topic,
          messages: [
            {
              key: event.id,
              value: JSON.stringify(event),
              headers: {
                'event-type': eventType,
                'event-source': event.source,
                'correlation-id': event.correlationId,
                'event-version': event.version,
                'timestamp': event.timestamp.toISOString()
              }
            }
          ]
        });

        console.log(`Event published successfully: ${eventType} to topic: ${topic}`);
      } catch (kafkaError) {
        // If Kafka is not available, log the event locally as fallback
        console.warn(`Kafka unavailable, logging event locally: ${eventType}`, {
          event,
          topic,
          error: kafkaError
        });
      }
    } catch (error) {
      console.error(`Failed to publish event ${eventType}:`, error);
      throw error;
    }
  }

  /**
   * Publish multiple events in a batch
   */
  static async publishEvents(events: Array<{
    eventType: string;
    data: Record<string, any>;
    source?: string;
  }>): Promise<void> {
    try {
      // Group events by topic
      const eventsByTopic: Record<string, any[]> = {};
      
      for (const { eventType, data, source } of events) {
        const event = this.createEvent(eventType, source || 'system', data);
        const topic = EventRouter.getTopicForEventType(eventType);
        
        if (!eventsByTopic[topic]) {
          eventsByTopic[topic] = [];
        }
        
        eventsByTopic[topic].push({
          key: event.id,
          value: JSON.stringify(event),
          headers: {
            'event-type': eventType,
            'event-source': event.source,
            'correlation-id': event.correlationId,
            'event-version': event.version,
            'timestamp': event.timestamp.toISOString()
          }
        });
      }
      
      try {
        const producer = KafkaProducer.getInstance();
        
        // Send events for each topic
        const promises = Object.entries(eventsByTopic).map(([topic, messages]) =>
          producer.send({ topic, messages })
        );
        
        await Promise.all(promises);
        console.log(`Batch published ${events.length} events across ${Object.keys(eventsByTopic).length} topics`);
      } catch (kafkaError) {
        // If Kafka is not available, log events locally as fallback
        console.warn(`Kafka unavailable, logging ${events.length} events locally`, {
          eventsByTopic,
          error: kafkaError
        });
      }
    } catch (error) {
      console.error('Failed to publish event batch:', error);
      throw error;
    }
  }
}

/**
 * Event Validation Utilities
 */
export class EventValidator {
  static validateEventStructure(event: any): event is BaseEvent {
    return (
      typeof event === 'object' &&
      typeof event.id === 'string' &&
      typeof event.type === 'string' &&
      event.timestamp instanceof Date &&
      typeof event.version === 'string' &&
      typeof event.source === 'string'
    );
  }

  static validateEventType(event: BaseEvent, expectedType: string): boolean {
    return event.type === expectedType;
  }

  static validateEventSource(event: BaseEvent, expectedSource: string): boolean {
    return event.source === expectedSource;
  }
}

/**
 * Event Routing Utilities
 */
export class EventRouter {
  /**
   * Determine which topic an event should be published to based on its type
   */
  static getTopicForEventType(eventType: string): string {
    const [domain] = eventType.split('.');
    
    switch (domain) {
      case 'user':
      case 'auth':
        return 'system-events';
      case 'notification':
        return 'notification-events';
      case 'audit':
        return 'audit-events';
      case 'employee':
        return 'employee-events';
      case 'recruitment':
      case 'candidate':
        return 'recruitment-events';
      case 'performance':
        return 'performance-events';
      case 'learning':
        return 'learning-events';
      case 'attendance':
        return 'attendance-events';
      case 'payroll':
        return 'payroll-events';
      default:
        return 'general-events';
    }
  }

  /**
   * Check if a service should handle a specific event type
   */
  static shouldServiceHandleEvent(serviceName: string, eventType: string): boolean {
    const [domain] = eventType.split('.');
    
    const serviceEventMappings: Record<string, string[]> = {
      'auth-service': ['user', 'auth'],
      'employee-service': ['employee', 'user'],
      'recruitment-service': ['recruitment', 'candidate', 'employee'],
      'performance-service': ['performance', 'employee'],
      'learning-service': ['learning', 'employee'],
      'notification-service': ['notification', 'user', 'employee'],
      'analytics-service': ['*'], // Analytics listens to all events
      'audit-service': ['audit', '*'], // Audit logs everything
    };

    const domains = serviceEventMappings[serviceName] || [];
    return domains.includes('*') || domains.includes(domain);
  }
}

export * from './contracts';
