# Employee Management Service

The Employee Management Service is a core microservice of the HRMS system that handles all employee-related operations, including employee profiles, departments, positions, performance reviews, and organizational hierarchy management.

## 🌟 Features

### Employee Management
- **Complete Employee Lifecycle**: Create, read, update, delete employee records
- **Employee Profiles**: Personal information, contact details, emergency contacts
- **Employment Details**: Department, position, manager, hire date, employment type
- **Compensation Management**: Salary, currency, payroll schedule
- **Skills & Certifications**: Professional qualifications and competencies
- **Education & Experience**: Academic background and work history

### Organizational Structure
- **Department Management**: Hierarchical department structure
- **Position Management**: Job titles, levels, salary ranges, requirements
- **Reporting Relationships**: Manager-employee hierarchies
- **Organizational Chart**: Visual representation of company structure

### Advanced Features
- **Employee Search**: Advanced filtering and search capabilities
- **Analytics & Reporting**: Employee demographics, turnover, departmental statistics
- **Event-Driven Architecture**: Publishes events for other services
- **Audit Logging**: Complete audit trail for all employee changes
- **Notifications**: Automated notifications for important events

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Running HRMS Shared Service

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

3. **Database setup**
```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed database with sample data
npm run db:seed
```

4. **Build the project**
```bash
npm run build
```

5. **Start development server**
```bash
npm run dev
```

6. **Start production server**
```bash
npm start
```

## 📋 API Endpoints

### Employee Management

#### Core Operations
```
POST   /api/v1/employees              # Create employee
GET    /api/v1/employees/search       # Search employees
GET    /api/v1/employees/:id          # Get employee by ID
PUT    /api/v1/employees/:id          # Update employee
DELETE /api/v1/employees/:id          # Delete employee
```

#### Specialized Queries
```
GET    /api/v1/employees/number/:employeeNumber    # Get by employee number
GET    /api/v1/employees/department/:departmentId  # Get by department
GET    /api/v1/employees/manager/:managerId        # Get by manager
GET    /api/v1/employees/hierarchy/:managerId      # Get hierarchy
```

#### Events & Analytics
```
GET    /api/v1/employees/birthdays/upcoming        # Upcoming birthdays
GET    /api/v1/employees/anniversaries/upcoming    # Work anniversaries
GET    /api/v1/employees/analytics                 # Employee analytics
```

### Department Management
```
POST   /api/v1/departments           # Create department
GET    /api/v1/departments           # List departments
GET    /api/v1/departments/:id       # Get department
PUT    /api/v1/departments/:id       # Update department
DELETE /api/v1/departments/:id       # Delete department
```

### Position Management
```
POST   /api/v1/positions             # Create position
GET    /api/v1/positions             # List positions
GET    /api/v1/positions/:id         # Get position
PUT    /api/v1/positions/:id         # Update position
DELETE /api/v1/positions/:id         # Delete position
```

### Health Checks
```
GET    /health                       # Basic health check
GET    /health/detailed              # Detailed health with stats
GET    /health/ready                 # Readiness probe
GET    /health/live                  # Liveness probe
```

## 🏗️ Architecture

### Repository Pattern
```typescript
// Base repository with common CRUD operations
abstract class BaseRepository<T extends BaseEntity>

// Specific repositories
class EmployeeRepository extends PrismaRepository<Employee>
class DepartmentRepository extends PrismaRepository<Department>
class PositionRepository extends PrismaRepository<Position>
```

### Service Layer
```typescript
// Business logic and orchestration
class EmployeeService
class DepartmentService
class PositionService
class AuditService
class NotificationService
```

### Controller Layer
```typescript
// HTTP request/response handling
class EmployeeController
class DepartmentController
class PositionController
```

### Event-Driven Integration
```typescript
// Publishes events to Kafka
EventFactory.publishEvent(EVENT_TYPE, data)

// Event types
- employee.created
- employee.updated
- employee.deleted
- department.created
- position.created
```

## 🗄️ Database Schema

### Core Entities
- **Employee**: Complete employee profile and employment details
- **Department**: Organizational departments with hierarchy
- **Position**: Job positions with levels and salary ranges
- **EmployeeHistory**: Audit trail of employee changes

### Supporting Entities
- **PerformanceReview**: Employee performance evaluations
- **Goal**: Individual and team objectives
- **EmployeeTraining**: Training records and certifications
- **TimeEntry**: Time tracking and attendance
- **LeaveRequest**: Leave applications and approvals
- **AuditLog**: System audit trail

## 🔐 Authentication & Authorization

### JWT Authentication
All API endpoints require valid JWT tokens from the Auth Service.

### Permission-Based Access Control
```typescript
// Permission examples
'employees.create'     // Create employees
'employees.read'       // Read employee data
'employees.update'     // Update employee records
'employees.delete'     // Delete employees
'employees.analytics'  // View analytics
```

### Role-Based Access
- **SUPER_ADMIN**: Full system access
- **HR_MANAGER**: All HR operations
- **HR_SPECIALIST**: Limited HR operations
- **DEPARTMENT_MANAGER**: Team management
- **EMPLOYEE**: Own data access only

## 📊 Search & Filtering

### Employee Search Parameters
```typescript
interface EmployeeSearchParams {
  query?: string;                    // Name, email, employee number
  departmentId?: string;             // Filter by department
  positionId?: string;               // Filter by position
  managerId?: string;                // Filter by manager
  status?: EmployeeStatus;           // Employment status
  employmentType?: EmploymentType;   // Full-time, part-time, etc.
  workLocation?: WorkLocation;       // Office, remote, hybrid
  hireDate?: { from?: string; to?: string; };  // Hire date range
  skills?: string[];                 // Required skills
  sortBy?: string;                   // Sort field
  sortOrder?: 'asc' | 'desc';       // Sort direction
}
```

### Advanced Filtering
- Text search across multiple fields
- Date range filtering
- Multi-value filtering (skills, certifications)
- Hierarchical filtering (department trees)
- Status-based filtering

## 📈 Analytics & Reporting

### Employee Analytics
```typescript
interface EmployeeAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
  terminations: number;
  turnoverRate: number;
  averageTenure: number;
  departmentBreakdown: DepartmentStats[];
  positionBreakdown: PositionStats[];
  demographicBreakdown: DemographicStats;
}
```

### Department Analytics
- Employee count per department
- Average salary by department
- Department budget utilization
- Manager workload distribution

### Position Analytics
- Position vacancy rates
- Salary range analysis
- Career progression paths
- Skill gap analysis

## 🔔 Notifications

### Automated Notifications
- **New Employee Welcome**: Sent to new hires
- **Profile Updates**: Significant changes notification
- **Work Anniversaries**: Annual celebration notifications
- **Birthday Reminders**: Birthday wishes
- **Department Changes**: Team movement notifications

### Event Publishing
All notifications are published as events to the notification service via Kafka.

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Test Coverage
```bash
npm run test:coverage
```

### API Testing
Use the provided Postman collection or API documentation for endpoint testing.

## 🐳 Docker Deployment

### Build Image
```bash
docker build -t hrms-employee-service .
```

### Run Container
```bash
docker run -p 3002:3002 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_HOST=redis \
  hrms-employee-service
```

### Docker Compose
```yaml
version: '3.8'
services:
  employee-service:
    build: ./backend/services/employee-service
    ports:
      - "3002:3002"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/hrms_employee
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
      - shared-service
```

## 🔧 Configuration

### Environment Variables
See `env.example` for all available configuration options.

### Key Settings
- **Employee Number Generation**: Customizable prefix and format
- **Performance Reviews**: Configurable cycles and rating scales
- **Time Tracking**: Flexible working hours and overtime rules
- **Leave Management**: Customizable leave types and approval workflows
- **Security**: Field-level security and data masking options

## 🔍 Monitoring

### Health Checks
- Basic health endpoint for load balancer
- Detailed health with database connectivity
- Kubernetes-ready readiness and liveness probes

### Metrics
- Employee count and growth metrics
- Department distribution metrics
- System performance metrics
- Database connection metrics

### Logging
- Structured logging with correlation IDs
- Request/response logging
- Audit trail logging
- Error tracking and alerting

## 🔗 Integration

### Inter-Service Communication
- **Auth Service**: User authentication and authorization
- **Notification Service**: Email and push notifications
- **Payroll Service**: Salary and compensation data
- **Analytics Service**: Advanced reporting and insights

### Event Publishing
- Employee lifecycle events
- Organizational structure changes
- Performance milestone events
- Compliance and audit events

## 🚨 Error Handling

### Validation Errors
- Comprehensive input validation with Joi
- Detailed error messages with field-level feedback
- Business rule validation

### Database Errors
- Connection error handling
- Transaction rollback on failures
- Data integrity constraint handling

### Authentication Errors
- Token validation errors
- Permission denial handling
- Session management errors

## 🔄 Data Migration

### Employee Import
- CSV import functionality
- Bulk employee creation
- Data validation and error reporting
- Rollback capability

### Organizational Changes
- Department restructuring tools
- Position reclassification
- Manager reassignment utilities

## 🤝 Contributing

1. Follow the established repository pattern
2. Add comprehensive tests for new features
3. Update API documentation
4. Follow TypeScript best practices
5. Ensure audit logging for all changes

## 📄 License

MIT License - see LICENSE file for details.
