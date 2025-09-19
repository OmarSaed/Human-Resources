import { KafkaProducer, KafkaConsumer, EVENT_TYPES } from '../kafka';
import { EmployeeCreatedEvent } from '../types';

// Mock kafkajs
jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue([{ partition: 0, baseOffset: '0' }]),
      transaction: jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue(undefined),
        commit: jest.fn().mockResolvedValue(undefined),
        abort: jest.fn().mockResolvedValue(undefined),
      }),
    })),
    consumer: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
    }),
  })),
}));

describe('Kafka Services', () => {
  const clientId = 'test-client';
  const brokers = ['localhost:9092'];
  const groupId = 'test-group';

  describe('KafkaProducer', () => {
    let producer: KafkaProducer;

    beforeEach(() => {
      producer = new KafkaProducer(clientId, brokers);
    });

    it('should create producer instance', () => {
      expect(producer).toBeInstanceOf(KafkaProducer);
    });

    it('should connect successfully', async () => {
      await expect(producer.connect()).resolves.toBeUndefined();
      expect(producer.isHealthy()).toBe(true);
    });

    it('should publish event successfully', async () => {
      await producer.connect();
      
      const event: EmployeeCreatedEvent = {
        id: 'test-event-1',
        type: EVENT_TYPES.EMPLOYEE_CREATED,
        timestamp: new Date(),
        version: '1.0.0',
        source: 'test-service',
        data: {
          employeeId: 'emp-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          departmentId: 'dept-456',
        },
      };

      await expect(producer.publishEvent('test-topic', event)).resolves.toBeUndefined();
    });

    it('should disconnect successfully', async () => {
      await producer.connect();
      await expect(producer.disconnect()).resolves.toBeUndefined();
      expect(producer.isHealthy()).toBe(false);
    });
  });

  describe('KafkaConsumer', () => {
    let consumer: KafkaConsumer;

    beforeEach(() => {
      consumer = new KafkaConsumer(clientId, groupId, brokers);
    });

    it('should create consumer instance', () => {
      expect(consumer).toBeInstanceOf(KafkaConsumer);
    });

    it('should connect successfully', async () => {
      await expect(consumer.connect()).resolves.toBeUndefined();
      expect(consumer.isHealthy()).toBe(true);
    });

    it('should register event handler', () => {
      const handler = jest.fn();
      expect(() => {
        consumer.registerEventHandler(EVENT_TYPES.EMPLOYEE_CREATED, handler);
      }).not.toThrow();
    });

    it('should subscribe to topics', async () => {
      await consumer.connect();
      await expect(consumer.subscribe(['test-topic'])).resolves.toBeUndefined();
    });

    it('should disconnect successfully', async () => {
      await consumer.connect();
      await expect(consumer.disconnect()).resolves.toBeUndefined();
      expect(consumer.isHealthy()).toBe(false);
    });
  });
});
