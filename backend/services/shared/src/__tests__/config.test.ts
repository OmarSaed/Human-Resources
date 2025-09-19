import { config } from '../config';

describe('Configuration', () => {
  beforeEach(() => {
    // Set required environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.DB_NAME = 'hrms_test';
    process.env.DB_USER = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.KAFKA_BROKERS = 'localhost:9092';
    process.env.KAFKA_GROUP_ID = 'test-group';
  });

  it('should have default values', () => {
    expect(config.port).toBe(3000);
    expect(config.env).toBe('test');
  });

  it('should load JWT configuration', () => {
    expect(config.jwt.secret).toBe('test-secret-key');
    expect(config.jwt.expiresIn).toBe('7d');
    expect(config.jwt.refreshExpiresIn).toBe('30d');
  });

  it('should load database configuration', () => {
    expect(config.database.host).toBe('localhost');
    expect(config.database.port).toBe(5432);
    expect(config.database.database).toBe('hrms_test');
    expect(config.database.username).toBe('test');
    expect(config.database.password).toBe('test');
  });

  it('should load Kafka configuration', () => {
    expect(config.kafka.clientId).toBe('hrms-service');
    expect(config.kafka.brokers).toEqual(['localhost:9092']);
    expect(config.kafka.groupId).toBe('test-group');
  });
});
