# HRMS API Gateway

The API Gateway serves as the single entry point for all client requests to the HRMS microservices ecosystem. It provides routing, authentication, rate limiting, load balancing, and monitoring capabilities.

## 🌟 Features

### Core Functionality
- **Service Routing**: Intelligent routing to microservices based on request paths
- **Load Balancing**: Multiple strategies (round-robin, least-connections, fastest-response)
- **Service Discovery**: Automatic health monitoring and service registration
- **Circuit Breaker**: Prevents cascade failures and improves system resilience

### Security
- **JWT Authentication**: Token-based authentication with role and permission validation
- **API Key Support**: External integration authentication
- **Rate Limiting**: Multiple levels (global, per-user, per-endpoint, API key)
- **CORS Configuration**: Flexible cross-origin resource sharing setup
- **Security Headers**: Helmet.js integration for enhanced security

### Monitoring & Observability
- **Health Checks**: Gateway and downstream service health monitoring
- **Request Metrics**: Detailed request/response tracking and analytics
- **Logging**: Comprehensive request/response logging with correlation IDs
- **Circuit Breaker Metrics**: Service failure detection and recovery tracking

### Performance
- **Response Compression**: Gzip compression for improved performance
- **Request Caching**: Configurable caching rules for common requests
- **Connection Pooling**: Efficient downstream service connections
- **Adaptive Rate Limiting**: Dynamic rate limits based on system load

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Redis (for distributed rate limiting)
- Running HRMS microservices

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Setup environment**
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Build the project**
```bash
npm run build
```

4. **Start development server**
```bash
npm run dev
```

5. **Start production server**
```bash
npm start
```

### Docker Setup

1. **Build Docker image**
```bash
docker build -t hrms-api-gateway .
```

2. **Run container**
```bash
docker run -p 8000:8000 \
  -e AUTH_SERVICE_URL=http://auth-service:3001 \
  -e EMPLOYEE_SERVICE_URL=http://employee-service:3002 \
  hrms-api-gateway
```

## 📋 Configuration

### Environment Variables

#### Basic Configuration
```bash
NODE_ENV=development          # Environment (development/production)
GATEWAY_PORT=8000            # Gateway port
GATEWAY_HOST=0.0.0.0         # Gateway host
```

#### Service URLs
```bash
AUTH_SERVICE_URL=http://localhost:3001
EMPLOYEE_SERVICE_URL=http://localhost:3002
RECRUITMENT_SERVICE_URL=http://localhost:3003
# ... other services
```

#### Rate Limiting
```bash
GLOBAL_RATE_WINDOW=60000     # Global rate limit window (ms)
GLOBAL_RATE_MAX=100          # Global rate limit max requests
AUTH_RATE_WINDOW=300000      # Auth rate limit window (ms)
AUTH_RATE_MAX=10             # Auth rate limit max requests
```

#### Security
```bash
JWT_SECRET=your-secret-key
API_KEYS=key1,key2,key3
CORS_ORIGINS=http://localhost:3000
```

### Service Configuration

The gateway automatically discovers and monitors configured services:

```typescript
const services = {
  auth: 'http://localhost:3001',
  employee: 'http://localhost:3002',
  recruitment: 'http://localhost:3003',
  // ... other services
};
```

## 🛣️ API Routes

### Public Routes (No Authentication)
```
POST   /api/v1/auth/login           # User login
POST   /api/v1/auth/register        # User registration
POST   /api/v1/auth/refresh-token   # Token refresh
GET    /api/v1/jobs/public         # Public job listings
GET    /health                     # Gateway health check
```

### Protected Routes (Authentication Required)
```
# Authentication
GET    /api/v1/auth/profile        # User profile
POST   /api/v1/auth/logout         # User logout

# Employee Management
GET    /api/v1/employees           # List employees
POST   /api/v1/employees           # Create employee
GET    /api/v1/employees/:id       # Get employee
PUT    /api/v1/employees/:id       # Update employee

# Recruitment
GET    /api/v1/candidates          # List candidates
POST   /api/v1/candidates          # Create candidate
GET    /api/v1/jobs                # List jobs

# Performance
GET    /api/v1/performance/reviews # Performance reviews
GET    /api/v1/goals               # Goals and objectives

# Learning & Development
GET    /api/v1/courses             # Training courses
POST   /api/v1/learning/enroll     # Course enrollment

# Analytics (Manager+ only)
GET    /api/v1/analytics           # Analytics data
GET    /api/v1/reports             # Generated reports
```

### Admin Routes (Admin Only)
```
GET    /api/v1/admin/users         # User management
GET    /admin/services             # Service status
POST   /admin/services/refresh     # Refresh health checks
GET    /metrics                    # Gateway metrics
```

### External API (API Key Required)
```
GET    /api/external/v1/*          # External integrations
```

## 🔐 Authentication & Authorization

### JWT Authentication
The gateway validates JWT tokens and extracts user information:

```typescript
// Token payload structure
{
  userId: string,
  email: string,
  role: 'SUPER_ADMIN' | 'HR_MANAGER' | 'HR_SPECIALIST' | 'DEPARTMENT_MANAGER' | 'EMPLOYEE',
  permissions: string[],
  sessionId: string
}
```

### Role-Based Access Control
- **SUPER_ADMIN**: Full system access
- **HR_MANAGER**: HR operations and reporting
- **HR_SPECIALIST**: HR operations (limited)
- **DEPARTMENT_MANAGER**: Department-specific access
- **EMPLOYEE**: Basic access to personal data

### Route Protection
Routes are automatically protected based on:
- **Role requirements**: Specific roles needed
- **Permission requirements**: Granular permissions
- **Resource ownership**: User can only access own data

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
GET /health
```

Response:
```json
{
  "success": true,
  "data": {
    "gateway": {
      "status": "healthy",
      "uptime": 3600,
      "version": "1.0.0"
    },
    "system": {
      "status": "healthy",
      "services": 7,
      "healthyServices": 7
    },
    "services": {
      "auth": { "healthy": 2, "total": 2 },
      "employee": { "healthy": 1, "total": 1 }
    }
  }
}
```

### Metrics Endpoint (Admin Only)
```bash
GET /metrics
```

Response includes:
- Gateway performance metrics
- Service health status
- Request/response statistics
- Rate limiting metrics

## 🚦 Rate Limiting

### Multiple Rate Limiting Levels
1. **Global**: All requests from IP/user
2. **Per-User**: Authenticated user requests
3. **Per-Endpoint**: Specific endpoint limits
4. **API Key**: External integration limits

### Adaptive Rate Limiting
Rate limits automatically adjust based on:
- System load
- Service health
- Historical traffic patterns

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## 🔧 Load Balancing

### Strategies
- **Round Robin**: Equal distribution
- **Least Connections**: Route to least busy instance
- **Fastest Response**: Route to fastest responding instance
- **Random**: Random distribution

### Health Monitoring
- Automatic health checks every 30 seconds
- Failed instances automatically removed
- Recovered instances automatically re-added

## 🐳 Docker Configuration

### Docker Compose Integration
```yaml
version: '3.8'
services:
  api-gateway:
    build: ./backend/services/api-gateway
    ports:
      - "3000:3000"
    environment:
      - AUTH_SERVICE_URL=http://auth-service:3001
      - EMPLOYEE_SERVICE_URL=http://employee-service:3002
    depends_on:
      - auth-service
      - employee-service
      - redis
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
npm run test:load
```

## 🔍 Troubleshooting

### Common Issues

#### Service Unavailable (503)
- Check if target service is running
- Verify service URLs in configuration
- Check service health endpoints

#### Authentication Failed (401)
- Verify JWT secret configuration
- Check token expiration
- Validate issuer/audience settings

#### Rate Limited (429)
- Review rate limiting configuration
- Check if Redis is available
- Monitor request patterns

#### Circuit Breaker Open
- Check service health
- Review failure thresholds
- Wait for automatic recovery

### Debug Mode
Enable debug logging:
```bash
GATEWAY_LOG_LEVEL=debug npm run dev
```

### Health Diagnostics
```bash
# Check gateway health
curl http://localhost:3000/health

# Check individual service health
curl http://localhost:3000/admin/services
```

## 📈 Performance Tuning

### Optimization Tips
1. **Enable compression** for better bandwidth usage
2. **Configure caching** for frequently accessed data
3. **Tune rate limits** based on expected traffic
4. **Monitor metrics** to identify bottlenecks
5. **Use Redis** for distributed rate limiting

### Scaling Considerations
- Gateway can be horizontally scaled
- Use Redis for shared state
- Configure load balancer health checks
- Monitor resource usage

## 🔒 Security Best Practices

1. **JWT Security**
   - Use strong secret keys
   - Set appropriate token expiration
   - Validate issuer and audience

2. **Rate Limiting**
   - Configure appropriate limits
   - Use Redis for distributed limiting
   - Monitor for abuse patterns

3. **API Keys**
   - Use strong, unique keys
   - Rotate keys regularly
   - Monitor API key usage

4. **Network Security**
   - Use HTTPS in production
   - Configure proper CORS
   - Enable security headers

## 📚 API Documentation

For detailed API documentation, see:
- [Authentication API](../auth-service/README.md)
- [Employee API](../employee-service/README.md)
- [Recruitment API](../recruitment-service/README.md)

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Follow security guidelines

## 📄 License

MIT License - see LICENSE file for details.
