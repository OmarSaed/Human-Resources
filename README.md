# 🏢 Human Resource Management System (HRMS)

**A comprehensive, enterprise-grade HRMS built with modern microservices architecture**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18+-blue.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/docker-required-blue.svg)](https://docker.com/)
[![Kubernetes](https://img.shields.io/badge/kubernetes-supported-blue.svg)](https://kubernetes.io/)

## 📋 Table of Contents

- [🔍 Overview](#-overview)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [💻 Development Setup](#-development-setup)
- [🐳 Docker Deployment](#-docker-deployment)
- [☸️ Kubernetes Deployment](#️-kubernetes-deployment)
- [📊 Monitoring & Observability](#-monitoring--observability)
- [🔧 Configuration](#-configuration)
- [🧪 Testing](#-testing)
- [🚀 Production Deployment](#-production-deployment)
- [🛠️ Troubleshooting](#️-troubleshooting)
- [📚 Documentation](#-documentation)

## 🔍 Overview

The HRMS is a comprehensive Human Resource Management System designed to handle all aspects of HR operations in modern organizations. Built with microservices architecture, it provides scalability, maintainability, and flexibility for growing businesses.

### ✨ Key Features

- **👥 Employee Management** - Complete employee lifecycle management
- **🎯 Recruitment & Onboarding** - Streamlined hiring process
- **⏰ Time & Attendance** - Advanced time tracking and attendance management
- **📈 Performance Management** - Goal setting, reviews, and performance tracking
- **🎓 Learning & Development** - Training programs and skill development
- **📄 Document Management** - Secure document storage and management
- **📧 Notification System** - Email and real-time notifications
- **📊 Analytics & Reporting** - Comprehensive business intelligence
- **🔐 Authentication & Security** - Enterprise-grade security features

### 🛠️ Technology Stack

#### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (multiple schemas)
- **Cache**: Redis
- **Message Broker**: Apache Kafka
- **ORM**: Prisma
- **Authentication**: JWT + OAuth 2.0
- **API Documentation**: Swagger/OpenAPI 3.0

#### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI (MUI)
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios with React Query

#### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes
- **Monitoring**: Prometheus + Grafana
- **Tracing**: Jaeger
- **API Gateway**: Express-based gateway
- **File Storage**: AWS S3 / MinIO

## 🏗️ Architecture

### Microservices Overview

The HRMS follows a microservices architecture with the following services:

```
┌─────────────────┐    ┌─────────────────────────────────┐
│   React Frontend │    │         API Gateway             │
│   (Port 3000)   │────▶│        (Port 3000)              │
└─────────────────┘    └─────────────────────────────────┘
                                        │
                       ┌────────────────┼────────────────┐
                       │                │                │
                       ▼                ▼                ▼
                 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                 │ Auth Service│ │Employee Svc │ │ Time & Att. │
                 │ (Port 3001) │ │(Port 3002)  │ │(Port 3003)  │
                 └─────────────┘ └─────────────┘ └─────────────┘
                       │                │                │
                 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                 │Performance  │ │ Learning    │ │Recruitment  │
                 │(Port 3004)  │ │(Port 3005)  │ │(Port 3006)  │
                 └─────────────┘ └─────────────┘ └─────────────┘
                       │                │                │
                 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                 │ Document    │ │Notification │ │ Analytics   │
                 │(Port 3007)  │ │(Port 3008)  │ │(Port 3009)  │
                 └─────────────┘ └─────────────┘ └─────────────┘
                                        │
                       ┌────────────────┼────────────────┐
                       │                │                │
                       ▼                ▼                ▼
                 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                 │ PostgreSQL  │ │   Redis     │ │   Kafka     │
                 │(Port 5432)  │ │(Port 6379)  │ │(Port 9092)  │
                 └─────────────┘ └─────────────┘ └─────────────┘
```

### Service Descriptions

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | 3000 | Central entry point, routing, rate limiting, authentication |
| **Auth Service** | 3001 | User authentication, authorization, JWT management |
| **Employee Service** | 3002 | Employee CRUD operations, profile management |
| **Time & Attendance** | 3003 | Time tracking, attendance, schedule management |
| **Performance Service** | 3004 | Performance reviews, goals, evaluations |
| **Learning Service** | 3005 | Training courses, certifications, skill tracking |
| **Recruitment Service** | 3006 | Job postings, candidate management, hiring process |
| **Document Service** | 3007 | File upload, document storage, version control |
| **Notification Service** | 3008 | Email, SMS, in-app notifications |
| **Analytics Service** | 3009 | Reporting, business intelligence, data analytics |

### Database Architecture

The system uses a **database-per-service** pattern with multiple PostgreSQL schemas:

- `hrms_auth` - Authentication and user management
- `hrms_employee` - Employee profiles and organizational data
- `hrms_performance` - Performance reviews and goals
- `hrms_learning` - Training and development records
- `hrms_recruitment` - Candidate and job data
- `hrms_notification` - Notification logs and templates
- `hrms_document` - File metadata and permissions
- `hrms_attendance` - Time tracking and attendance records

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git**
- At least **8GB RAM** and **4 CPU cores** recommended

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Human Resources"
```

### 2. Environment Setup

Choose your platform and run the setup script:

**For Linux/Mac:**
```bash
chmod +x "deployment docs/setup-env.sh"
"deployment docs/setup-env.sh"
```

**For Windows:**
```cmd
"deployment docs\setup-env.bat"
```

This creates a `.env` file with all necessary environment variables.

### 3. Start the Complete Stack

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access the Application

After startup (2-3 minutes), access:

- **API Gateway**: http://localhost:3000
- **Grafana Dashboard**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Jaeger Tracing**: http://localhost:16686

## 💻 Development Setup

### Local Development Environment

For active development on specific services:

#### 1. Install Dependencies

```bash
# Frontend dependencies
cd frontend
npm install

# Backend services (example for auth-service)
cd backend/services/auth-service
npm install

# Shared utilities
cd backend/services/shared
npm install
```

#### 2. Start Infrastructure Only

```bash
# Start only databases and infrastructure
docker-compose up -d postgres redis kafka prometheus grafana jaeger
```

#### 3. Run Services Locally

**Start individual services:**

```bash
# Auth Service
cd backend/services/auth-service
npm run dev

# Employee Service
cd backend/services/employee-service
npm run dev

# API Gateway
cd backend/services/api-gateway
npm run dev
```

**Start Frontend:**

```bash
cd frontend
npm start
```

### Database Setup

#### Run Migrations

```bash
# Run for each service
cd backend/services/auth-service
npx prisma migrate dev

cd backend/services/employee-service
npx prisma migrate dev
```

#### Seed Development Data

```bash
# Run the database initialization script
docker-compose exec postgres psql -U postgres -d hrms_auth -f /docker-entrypoint-initdb.d/init-db.sql
```

## 🐳 Docker Deployment

### Complete Stack Deployment

The Docker Compose setup includes:

- **9 Microservices** (auth, employee, time-attendance, performance, learning, recruitment, document, notification, analytics)
- **Infrastructure** (PostgreSQL, Redis, Kafka, Zookeeper)
- **Monitoring** (Prometheus, Grafana, Jaeger)
- **API Gateway** with routing and rate limiting

#### Environment Configuration

Edit `.env` file for your environment:

```bash
# Database
DB_PASSWORD=your-secure-password

# JWT Secrets
JWT_SECRET=your-super-secret-32-character-key
JWT_ACCESS_SECRET=your-access-token-secret
JWT_REFRESH_SECRET=your-refresh-token-secret

# Redis
REDIS_PASSWORD=your-redis-password

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@company.com
SMTP_PASS=your-app-password
```

#### Deployment Commands

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis kafka
docker-compose up -d auth-service employee-service

# View logs
docker-compose logs -f auth-service

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ Data loss)
docker-compose down -v

# Rebuild specific service
docker-compose up -d --build auth-service
```

#### Service Health Checks

```bash
# Check all service status
docker-compose ps

# Check API Gateway health
curl http://localhost:3000/health

# Check specific service health
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Employee Service
```

## ☸️ Kubernetes Deployment

### Production Kubernetes Setup

The project includes complete Kubernetes manifests in `backend/k8s/`:

```bash
backend/k8s/
├── namespace.yaml      # HRMS namespace
├── configmaps.yaml     # Configuration maps
├── secrets.yaml        # Sensitive data
├── statefulsets.yaml   # Databases (PostgreSQL, Redis)
├── deployments.yaml    # Application services
└── services.yaml       # Service exposure
```

#### Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f backend/k8s/

# Check deployment status
kubectl get pods -n hrms

# View logs
kubectl logs -f deployment/auth-service -n hrms

# Access services (port-forward for development)
kubectl port-forward service/api-gateway 3000:3000 -n hrms
```

#### Production Considerations

For production deployment:

1. **Update secrets** in `secrets.yaml` with base64-encoded values
2. **Configure ingress** for external access
3. **Set up persistent volumes** for databases
4. **Configure resource limits** and requests
5. **Set up horizontal pod autoscaling**

## 📊 Monitoring & Observability

### Grafana Dashboards

Access Grafana at http://localhost:3030 (admin/admin123):

- **HRMS Overview** - System health and performance metrics
- **Service Metrics** - Individual service performance
- **Infrastructure** - Database, Redis, Kafka metrics
- **Business Metrics** - HR-specific KPIs

### Prometheus Metrics

Monitor at http://localhost:9090:

- Application metrics (response time, error rate)
- Infrastructure metrics (CPU, memory, disk)
- Custom business metrics
- Alert rules for critical issues

### Distributed Tracing

Use Jaeger at http://localhost:16686:

- Request tracing across microservices
- Performance bottleneck identification
- Error tracking and debugging

### Log Aggregation

Logs are collected from all services:

```bash
# View aggregated logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f auth-service

# Follow logs in real-time
docker-compose logs -f --tail=100
```

## 🔧 Configuration

### Environment Variables

Key configuration options in `.env`:

#### Application Settings
```bash
NODE_ENV=development|production
HOST=0.0.0.0
```

#### Service Ports
```bash
API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
EMPLOYEE_SERVICE_PORT=3002
# ... other services
```

#### Database Configuration
```bash
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DATABASE_URL=postgresql://postgres:password@postgres:5432/hrms
```

#### Security Settings
```bash
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

#### Feature Flags
```bash
ENABLE_GPS_TRACKING=false
ENABLE_BIOMETRIC=false
ENABLE_MFA=false
ENABLE_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
```

### Service Configuration

Each service can be configured independently:

```typescript
// Example: Auth Service Configuration
interface AuthConfig {
  port: number;
  jwtSecret: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  emailService: EmailConfig;
}
```

## 🧪 Testing

### Test Strategy

The project implements a comprehensive testing pyramid:

```
        E2E Tests (Cypress)
       /                  \
      /                    \
  Integration Tests (Jest + Supertest)
   /                              \
  /                                \
Unit Tests (Jest + React Testing Library)
```

### Running Tests

#### Unit Tests
```bash
# Backend unit tests
cd backend/services/auth-service
npm test

# Frontend unit tests
cd frontend
npm test
```

#### Integration Tests
```bash
# API integration tests
npm run test:integration

# Database integration tests
npm run test:db
```

#### End-to-End Tests
```bash
# Start application stack
docker-compose up -d

# Run E2E tests
cd frontend
npm run test:e2e
```

#### Test Coverage
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

### Test Data Management

```bash
# Reset test database
npm run db:reset:test

# Seed test data
npm run db:seed:test

# Run specific test suite
npm test -- --testNamePattern="Auth Service"
```

## 🚀 Production Deployment

### Production Checklist

Before deploying to production:

#### Security
- [ ] Update all default passwords and secrets
- [ ] Configure proper CORS origins
- [ ] Enable HTTPS/TLS encryption
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Enable audit logging

#### Performance
- [ ] Configure resource limits
- [ ] Set up horizontal pod autoscaling
- [ ] Configure database connection pooling
- [ ] Enable caching strategies
- [ ] Optimize Docker images

#### Monitoring
- [ ] Set up alerting rules
- [ ] Configure log aggregation
- [ ] Set up backup strategies
- [ ] Configure health checks
- [ ] Set up error tracking

#### Deployment
- [ ] Use production environment variables
- [ ] Configure CI/CD pipeline
- [ ] Set up rolling deployments
- [ ] Configure database migrations
- [ ] Test disaster recovery

### Production Environment Variables

Update these for production:

```bash
NODE_ENV=production
DB_PASSWORD=super-secure-production-password
JWT_SECRET=production-jwt-secret-32-chars-minimum
REDIS_PASSWORD=production-redis-password
CORS_ORIGINS=https://your-domain.com
SMTP_HOST=your-production-smtp.com
ENABLE_MFA=true
ENABLE_AUDIT_LOGGING=true
```

### CI/CD Pipeline

The project includes GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
name: HRMS CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run unit tests
      - name: Run integration tests
      - name: Security scan
      - name: Code quality check
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker images
      - name: Push to registry
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
      - name: Run smoke tests
```

## 🛠️ Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check Docker daemon
docker info

# Check port conflicts
netstat -tulpn | grep :3000

# View service logs
docker-compose logs auth-service

# Restart specific service
docker-compose restart auth-service
```

#### Database Connection Issues

```bash
# Check PostgreSQL status
docker-compose ps postgres

# Verify database connection
docker-compose exec postgres psql -U postgres -c "SELECT version();"

# Check database logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

#### Memory/Performance Issues

```bash
# Check system resources
docker stats

# Clean up Docker
docker system prune -f
docker volume prune -f

# Monitor service performance
curl http://localhost:3000/metrics
```

#### Authentication Issues

```bash
# Check JWT configuration
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Verify Redis connection
docker-compose exec redis redis-cli ping

# Check session storage
docker-compose exec redis redis-cli keys "*"
```

### Development Tips

#### Hot Reloading

For faster development:

```bash
# Enable hot reloading for backend
cd backend/services/auth-service
npm run dev

# Frontend hot reloading (automatic)
cd frontend
npm start
```

#### Database Debugging

```bash
# Access database directly
docker-compose exec postgres psql -U postgres -d hrms_auth

# View database schema
\dt  # List tables
\d employees  # Describe table

# Monitor slow queries
# Add to postgresql.conf:
log_min_duration_statement = 100
```

#### API Testing

```bash
# Test API endpoints
curl -X GET http://localhost:3000/api/employees \
  -H "Authorization: Bearer your-jwt-token"

# Use Postman collection
# Import: docs/postman/HRMS-API.postman_collection.json
```

### Performance Optimization

#### Database Optimization

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_attendance_date ON attendance(date);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM employees WHERE department_id = 1;
```

#### Caching Strategy

```typescript
// Redis caching example
const cacheKey = `employee:${employeeId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const employee = await db.employee.findUnique({ where: { id: employeeId } });
await redis.setex(cacheKey, 3600, JSON.stringify(employee));
```

## 📚 Documentation

### API Documentation

- **Swagger UI**: http://localhost:3000/api-docs (when running)
- **Postman Collection**: `docs/postman/HRMS-API.postman_collection.json`
- **API Reference**: [hrms_architecture_guide.md](hrms_architecture_guide.md)

### Additional Resources

- **Architecture Guide**: [hrms_architecture_guide.md](hrms_architecture_guide.md)
- **Docker Setup**: [docker-setup.md](docker-setup.md)
- **Development Workflow**: `docs/development/workflow.md`
- **Deployment Guide**: `docs/deployment/production.md`

### Code Documentation

```bash
# Generate TypeScript documentation
npm run docs:generate

# View API documentation
npm run docs:serve
```

### Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Support

For support and questions:

- **Issues**: Create a GitHub issue
- **Documentation**: Check the `docs/` directory
- **Community**: Join our development discussion

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern TypeScript and React
- Inspired by enterprise HR systems
- Uses industry best practices for microservices
- Implements comprehensive security measures

---

**Happy coding! 🚀**

*Built with ❤️ by the HRMS Development Team*
