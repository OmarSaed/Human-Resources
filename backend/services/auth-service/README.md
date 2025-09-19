# HRMS Authentication Service

A comprehensive authentication and authorization service for the Human Resource Management System.

## 🚀 Features

### 🔐 Authentication
- **Email/Password Login** with secure password hashing (bcrypt)
- **Multi-Factor Authentication (MFA)** with TOTP and backup codes
- **JWT Token Management** with access and refresh tokens
- **Session Management** with Redis for high performance
- **Password Reset** with secure token-based flow
- **Email Verification** for new accounts

### 🛡️ Security
- **Role-Based Access Control (RBAC)** with 5 user roles
- **Account Lockout Protection** against brute force attacks
- **Rate Limiting** on sensitive endpoints
- **Audit Logging** for all security events
- **Password Policy Enforcement** with complexity requirements
- **Session Security** with automatic expiration and cleanup

### 👤 User Management
- **User Registration** with email verification
- **Profile Management** with secure updates
- **Permission System** with granular access control
- **Multi-Session Support** with device tracking
- **Account Security** with activity monitoring

### 📊 Monitoring & Analytics
- **Security Metrics** tracking login patterns
- **Audit Trail** for compliance requirements
- **Performance Monitoring** with structured logging
- **Alert System** for suspicious activities

## 🏗️ Architecture

### Technology Stack
- **Node.js 18+** with TypeScript
- **Express.js** web framework
- **Prisma** ORM with PostgreSQL
- **Redis** for session storage
- **JWT** for token-based authentication
- **Speakeasy** for MFA implementation
- **Nodemailer** for email notifications

### Database Schema
```sql
Users → Sessions → Audit Logs
  ↓        ↓         ↓
Permissions ← Roles → Refresh Tokens
```

### Security Layers
1. **Rate Limiting** - Prevent abuse
2. **Input Validation** - Sanitize requests
3. **Authentication** - Verify identity
4. **Authorization** - Check permissions
5. **Audit Logging** - Track activities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker (optional)

### Installation

1. **Install dependencies:**
```bash
cd backend/services/auth-service
npm install
```

2. **Setup environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Setup database:**
```bash
npm run db:migrate
npm run db:seed
```

4. **Start the service:**
```bash
npm run dev
```

The service will be available at `http://localhost:3001`

### Docker Setup

```bash
# Build and run with docker-compose
docker-compose up auth-service

# Or build manually
docker build -t hrms-auth-service .
docker run -p 3001:3001 --env-file .env hrms-auth-service
```

## 📡 API Endpoints

### Public Endpoints
```http
POST /api/v1/auth/login              # User login
POST /api/v1/auth/register           # User registration
POST /api/v1/auth/refresh-token      # Refresh access token
POST /api/v1/auth/forgot-password    # Request password reset
POST /api/v1/auth/reset-password     # Reset password with token
POST /api/v1/auth/verify-email       # Verify email address
```

### Protected Endpoints
```http
GET  /api/v1/auth/profile            # Get user profile
PUT  /api/v1/auth/profile            # Update profile
POST /api/v1/auth/change-password    # Change password
POST /api/v1/auth/logout             # Logout user
GET  /api/v1/auth/validate-token     # Validate token

# Session Management
GET  /api/v1/auth/sessions           # Get active sessions
DELETE /api/v1/auth/sessions/:id     # Terminate session
DELETE /api/v1/auth/sessions         # Logout all devices

# Multi-Factor Authentication
GET  /api/v1/auth/mfa/status         # Get MFA status
POST /api/v1/auth/mfa/setup          # Setup MFA
POST /api/v1/auth/mfa/enable         # Enable MFA
POST /api/v1/auth/mfa/disable        # Disable MFA
POST /api/v1/auth/mfa/backup-codes   # Generate backup codes
```

### Admin Endpoints
```http
GET  /api/v1/admin/users             # List users
POST /api/v1/admin/users             # Create user
PUT  /api/v1/admin/users/:id         # Update user
DELETE /api/v1/admin/users/:id       # Delete user
GET  /api/v1/admin/audit-logs        # Get audit logs
GET  /api/v1/admin/security-metrics  # Security metrics
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection | Required |
| `REDIS_HOST` | Redis host | `localhost` |
| `JWT_SECRET` | JWT signing secret | Required |
| `SMTP_HOST` | Email SMTP server | Required |

See `.env.example` for complete configuration options.

### User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `SUPER_ADMIN` | System administrator | All permissions |
| `HR_MANAGER` | HR department manager | Employee management, reports |
| `HR_SPECIALIST` | HR team member | Employee operations |
| `DEPARTMENT_MANAGER` | Department head | Team management |
| `EMPLOYEE` | Regular employee | Self-service only |

### Password Policy

- Minimum 8 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain number
- Must contain special character
- Cannot reuse last 5 passwords
- Maximum age: 90 days

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage
- Unit tests for all services
- Integration tests for API endpoints
- Security tests for authentication flows
- Performance tests for rate limiting

## 📊 Monitoring

### Health Checks
```bash
curl http://localhost:3001/health
```

### Metrics
The service exposes metrics for:
- Login success/failure rates
- Active session counts
- Token refresh rates
- MFA usage statistics
- Security incidents

### Logs
Structured JSON logs with:
- Request/response tracking
- Security events
- Performance metrics
- Error details

## 🔒 Security Features

### Brute Force Protection
- Account lockout after 5 failed attempts
- Progressive delays between attempts
- IP-based rate limiting

### Session Security
- Secure session tokens
- Automatic session expiration
- Multi-device session management
- Session hijacking protection

### Audit Trail
- All authentication events logged
- User activity tracking
- Security incident detection
- Compliance reporting

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Redis connection tested
- [ ] Email service configured
- [ ] SSL certificates installed
- [ ] Monitoring setup
- [ ] Backup strategy implemented

### Scaling Considerations
- **Horizontal Scaling**: Multiple service instances
- **Session Storage**: Redis cluster for high availability
- **Database**: Read replicas for better performance
- **Load Balancing**: Distribute traffic across instances

## 🤝 Contributing

1. Follow TypeScript best practices
2. Write comprehensive tests
3. Update documentation
4. Follow security guidelines
5. Use conventional commits

## 📄 License

MIT License - see LICENSE file for details.
