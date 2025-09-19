# HRMS Shared Service

This package contains shared utilities, types, and services used across all HRMS microservices.

## 🚀 Features

- **Kafka Integration**: Producer and consumer services for event-driven architecture
- **TypeScript Types**: Comprehensive type definitions for the entire HRMS system
- **Configuration Management**: Environment-based configuration with validation
- **Logging**: Structured logging with Winston
- **Validation**: Request validation with Joi schemas
- **Middleware**: Common Express.js middleware for authentication, authorization, and error handling

## 📦 Installation

```bash
npm install @hrms/shared
```

## 🔧 Usage

### Kafka Services

```typescript
import { KafkaService, TOPICS, EVENT_TYPES } from '@hrms/shared';

// Initialize Kafka service
const kafkaService = KafkaService.getInstance(config.kafka);

// Initialize producer
const producer = await kafkaService.initializeProducer();

// Publish an event
await producer.publishEvent(TOPICS.EMPLOYEE_EVENTS, {
  id: 'event-123',
  type: EVENT_TYPES.EMPLOYEE_CREATED,
  timestamp: new Date(),
  version: '1.0.0',
  source: 'employee-service',
  data: {
    employeeId: 'emp-456',
    email: 'john.doe@company.com',
    firstName: 'John',
    lastName: 'Doe',
    departmentId: 'dept-789'
  }
});

// Initialize consumer
const consumer = await kafkaService.initializeConsumer();

// Register event handler
consumer.registerEventHandler(EVENT_TYPES.EMPLOYEE_CREATED, async (event, metadata) => {
  console.log('Employee created:', event.data);
});

// Subscribe to topics and start consuming
await consumer.subscribe([TOPICS.EMPLOYEE_EVENTS]);
await consumer.startConsuming();
```

### Configuration

```typescript
import { config, getServiceConfig } from '@hrms/shared';

// Get general config
console.log(config.database.host);

// Get service-specific config
const serviceConfig = getServiceConfig('employee-service');
console.log(serviceConfig.kafka.clientId); // 'employee-service-hrms-service'
```

### Logging

```typescript
import { createLogger } from '@hrms/shared';

const logger = createLogger('my-service');

logger.info('Service started');
logger.error('Something went wrong', new Error('Test error'));
logger.auditLog({
  level: 'info',
  userId: 'user-123',
  action: 'CREATE',
  resource: 'employee',
  metadata: { employeeId: 'emp-456' },
  traceId: 'trace-789'
});
```

### Validation

```typescript
import { validate, commonSchemas, employeeSchemas } from '@hrms/shared';
import express from 'express';

const app = express();

// Validate request body
app.post('/employees', 
  validate(employeeSchemas.personalInfo),
  (req, res) => {
    // req.body is now validated and typed
    res.json({ message: 'Employee created' });
  }
);

// Validate query parameters
app.get('/employees',
  validate(commonSchemas.pagination, 'query'),
  (req, res) => {
    // req.query is now validated
    res.json({ employees: [] });
  }
);
```

### Middleware

```typescript
import express from 'express';
import { 
  setupMiddleware, 
  authenticate, 
  authorize, 
  errorHandler,
  notFoundHandler,
  healthCheck,
  UserRole 
} from '@hrms/shared';

const app = express();

// Setup standard middleware
setupMiddleware(app);

// Health check endpoint
app.get('/health', healthCheck);

// Protected routes
app.get('/admin/users', 
  authenticate,
  authorize([UserRole.SUPER_ADMIN, UserRole.HR_MANAGER]),
  (req, res) => {
    res.json({ users: [] });
  }
);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);
```

## 🏗️ Project Structure

```
src/
├── types/           # TypeScript type definitions
├── kafka/           # Kafka producer and consumer services
├── config/          # Configuration management
├── utils/           # Utility functions (logger, validation)
├── middleware/      # Express middleware
└── index.ts         # Main export file
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- TypeScript 5+
- Kafka cluster
- Redis instance
- PostgreSQL database

### Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`

4. Build the project:
```bash
npm run build
```

5. Start in development mode:
```bash
npm run dev
```

### Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm run dev` - Start in development mode with hot reload
- `npm start` - Start production build
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run clean` - Clean build directory

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/staging/production) | `development` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing secret | Required |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `KAFKA_BROKERS` | Kafka broker list | Required |
| `REDIS_HOST` | Redis host | `localhost` |

See `.env.example` for complete list.

## 🚢 Docker

Build and run with Docker:

```bash
# Build image
docker build -t hrms-shared .

# Run container
docker run -p 3000:3000 --env-file .env hrms-shared
```

## 📄 License

MIT License - see LICENSE file for details.
