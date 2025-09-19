# Performance Management Service

A comprehensive microservice for managing performance reviews, goals, development plans, and competency assessments in the HRMS system.

## 🎯 Features

### Core Functionality
- **Performance Reviews**: Complete review lifecycle management
- **Goal Management**: OKRs, KPIs, and personal development goals
- **Development Plans**: Structured employee development planning
- **Competency Assessments**: Skills and competency tracking
- **Performance Metrics**: Quantitative performance tracking
- **Analytics & Reporting**: Performance insights and trends

### Technical Features
- **Event-Driven Architecture**: Real-time notifications and updates
- **Audit Logging**: Complete audit trail for all actions
- **Role-Based Access Control**: Granular permission system
- **Multi-Status Workflows**: Complex approval workflows
- **External Service Integration**: Employee and auth service integration

## 🏗️ Architecture

```
Performance Service
├── Performance Reviews
│   ├── Annual/Quarterly Reviews
│   ├── Probationary Reviews
│   ├── Project-Based Reviews
│   └── Continuous Feedback
├── Goal Management
│   ├── Goal Setting & Tracking
│   ├── Milestone Management
│   ├── Progress Updates
│   └── Achievement Analytics
├── Development Plans
│   ├── Learning Objectives
│   ├── Skill Development
│   ├── Resource Management
│   └── Progress Tracking
└── Competency Assessments
    ├── Framework Management
    ├── Skill Gap Analysis
    ├── Development Recommendations
    └── Benchmarking
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)
- Kafka (for event streaming)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # Seed data (optional)
   npm run db:seed
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:3002`

## 📚 API Documentation

### Performance Reviews

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/performance-reviews` | POST | Create performance review |
| `/api/v1/performance-reviews/search` | GET | Search reviews |
| `/api/v1/performance-reviews/:id` | GET | Get review details |
| `/api/v1/performance-reviews/:id` | PUT | Update review |
| `/api/v1/performance-reviews/:id/submit` | POST | Submit review |
| `/api/v1/performance-reviews/:id/approve` | POST | Approve review |
| `/api/v1/performance-reviews/due-soon` | GET | Get reviews due soon |
| `/api/v1/performance-reviews/overdue` | GET | Get overdue reviews |
| `/api/v1/performance-reviews/statistics` | GET | Get review statistics |

### Authentication

All endpoints require JWT authentication:
```
Authorization: Bearer <your-jwt-token>
```

### Permissions

Required permissions for operations:
- `performance.reviews.read` - View reviews
- `performance.reviews.create` - Create reviews  
- `performance.reviews.update` - Update reviews
- `performance.reviews.delete` - Delete reviews
- `performance.reviews.submit` - Submit reviews
- `performance.reviews.approve` - Approve reviews
- `performance.reviews.analytics` - View analytics

## 📊 Database Schema

### Core Entities

#### PerformanceReview
- Comprehensive review management
- Multi-stage workflow support
- Flexible goal integration
- Audit trail tracking

#### Goal
- Hierarchical goal structure
- Progress tracking
- Milestone management
- Performance linkage

#### DevelopmentPlan
- Structured learning paths
- Resource management
- Budget tracking
- Activity monitoring

#### CompetencyAssessment
- Framework-based assessments
- Gap analysis
- Development recommendations
- Benchmarking support

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3002 |
| `DATABASE_URL` | PostgreSQL connection | - |
| `JWT_SECRET` | JWT signing secret | - |
| `REDIS_HOST` | Redis host | localhost |
| `EMPLOYEE_SERVICE_URL` | Employee service endpoint | http://localhost:3001 |

### Review Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `REVIEW_CYCLES` | Available review cycles | Q1,Q2,Q3,Q4,Annual |
| `DEFAULT_REVIEW_TYPE` | Default review type | ANNUAL |
| `AUTO_ARCHIVE_DAYS` | Auto-archive after days | 365 |
| `GOAL_REMINDER_DAYS` | Goal reminder period | 7 |
| `REVIEW_REMINDER_DAYS` | Review reminder period | 3 |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:3002/health
```

### Metrics
Prometheus metrics available at `http://localhost:9002/metrics`

### Logging
Structured JSON logging with configurable levels:
- `error` - Error conditions
- `warn` - Warning conditions  
- `info` - Informational messages
- `debug` - Debug-level messages

## 🔄 Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |

### Project Structure

```
src/
├── config/           # Configuration management
├── controllers/      # Request handlers
├── services/         # Business logic
├── repositories/     # Data access layer
├── routes/          # API routes
├── middleware/      # Custom middleware
├── validation/      # Request validation
├── types/           # TypeScript types
└── __tests__/       # Test files
```

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -t hrms-performance-service .

# Run container
docker run -p 3002:3002 hrms-performance-service
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods -l app=performance-service
```

## 🤝 Integration

### Event Sourcing
The service publishes events for:
- Review lifecycle changes
- Goal progress updates
- Development plan milestones
- Competency assessments

### External Dependencies
- **Employee Service**: Employee data validation
- **Auth Service**: Authentication and authorization
- **Notification Service**: Email and push notifications

## 📋 Roadmap

### Upcoming Features
- [ ] 360-degree feedback
- [ ] AI-powered goal suggestions
- [ ] Advanced analytics dashboard
- [ ] Mobile API support
- [ ] Integration with learning platforms

### Performance Optimizations
- [ ] Query optimization
- [ ] Caching strategy
- [ ] Database indexing
- [ ] Connection pooling

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` format
   - Verify PostgreSQL is running
   - Check network connectivity

2. **Authentication Failures**
   - Verify `JWT_SECRET` configuration
   - Check token expiration
   - Validate user permissions

3. **External Service Errors**
   - Check service URLs
   - Verify network connectivity
   - Review service health status

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review API documentation at `/api/docs`

## 📄 License

This project is licensed under the MIT License.
