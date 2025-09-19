# HRMS Docker Setup Guide

## 📜 Deployment Scripts

All deployment scripts are consolidated in the `scripts/` directory within this folder. See the [Scripts README](scripts/README.md) for detailed information.

**Key scripts for Docker deployment:**
- `start-dev-stack.sh` - Complete development environment setup
- `deploy-docker-production.sh` - Docker Compose production deployment  
- `build-and-push-images.sh` - Build and push Docker images
- `init-db.sql` & `init-multiple-databases.sh` - Database initialization

## 🐳 Quick Start

1. **Clone the repository** and navigate to the project root
2. **Create environment file** by copying the example:
   ```bash
   copy .env.example .env
   ```
   Or on Linux/Mac:
   ```bash
   cp .env.example .env
   ```

3. **Update environment variables** in `.env` file:
   - Set secure passwords for `DB_PASSWORD`, `REDIS_PASSWORD`, etc.
   - Configure SMTP settings for email functionality
   - Update JWT secrets for production

4. **Start all services**:
   ```bash
   docker-compose up -d
   ```

5. **View logs**:
   ```bash
   docker-compose logs -f
   ```

## 🏗️ Architecture Overview

The Docker setup includes:

### **Infrastructure Services:**
- **PostgreSQL** (port 5432) - Main database with multiple schemas
- **Redis** (port 6379) - Caching and session storage
- **Kafka + Zookeeper** (port 9092) - Message broker for microservices
- **Prometheus** (port 9090) - Metrics collection
- **Grafana** (port 3030) - Monitoring dashboards
- **Jaeger** (port 16686) - Distributed tracing

### **HRMS Microservices:**
- **API Gateway** (port 8000) - Main entry point
- **Auth Service** (port 3001) - Authentication & authorization
- **Employee Service** (port 3002) - Employee management
- **Time & Attendance Service** (port 3003) - Time tracking & attendance
- **Performance Service** (port 3004) - Performance reviews & goals
- **Learning Service** (port 3005) - Training & development
- **Recruitment Service** (port 3006) - Hiring & onboarding
- **Document Service** (port 3007) - Document management
- **Notification Service** (port 3008) - Email & notifications

## 🚀 Service Commands

### Start all services:
```bash
docker-compose up -d
```

### Start specific services:
```bash
docker-compose up -d postgres redis kafka
docker-compose up -d api-gateway auth-service
```

### Stop all services:
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ Data will be lost):
```bash
docker-compose down -v
```

### View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Last 50 lines
docker-compose logs --tail=50 -f api-gateway
```

### Restart a service:
```bash
docker-compose restart auth-service
```

### Rebuild and restart:
```bash
docker-compose up -d --build auth-service
```

## 🔧 Development Commands

### Execute commands in containers:
```bash
# Access auth service container
docker-compose exec auth-service sh

# Run Prisma migration
docker-compose exec auth-service npx prisma migrate dev

# View database
docker-compose exec postgres psql -U postgres -d hrms_auth
```

### Scale services:
```bash
docker-compose up -d --scale auth-service=3
```

## 📊 Monitoring & Health Checks

### Access monitoring tools:
- **Grafana Dashboard**: http://localhost:3030 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Jaeger Tracing**: http://localhost:16686

### Check service health:
```bash
# API Gateway health
curl http://localhost:8000/health

# Auth Service health
curl http://localhost:3001/health

# All service status
docker-compose ps
```

## 🗃️ Database Management

### Access databases:
```bash
# Main database
docker-compose exec postgres psql -U postgres -d hrms

# Auth service database
docker-compose exec postgres psql -U postgres -d hrms_auth

# Employee service database
docker-compose exec postgres psql -U postgres -d hrms_employee
```

### Backup database:
```bash
docker-compose exec postgres pg_dump -U postgres hrms > backup.sql
```

### Restore database:
```bash
docker-compose exec -T postgres psql -U postgres hrms < backup.sql
```

## 📁 Persistent Data

Data is persisted in Docker volumes:
- `hrms-postgres-data` - Database data
- `hrms-redis-data` - Redis data
- `hrms-employee-uploads` - Employee files
- `hrms-recruitment-uploads` - Recruitment files
- `hrms-document-uploads` - Document files

### List volumes:
```bash
docker volume ls | grep hrms
```

### Backup volumes:
```bash
docker run --rm -v hrms-postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .
```

## 🔐 Security Configuration

### Production Security Checklist:
- [ ] Change all default passwords in `.env`
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Enable firewall rules
- [ ] Configure secure SMTP settings
- [ ] Enable audit logging
- [ ] Set up backup strategies

### Environment Variables to Change for Production:
```bash
DB_PASSWORD=your-secure-db-password
REDIS_PASSWORD=your-secure-redis-password
JWT_SECRET=your-super-secret-jwt-key-32-chars-min
JWT_ACCESS_SECRET=your-access-token-secret
JWT_REFRESH_SECRET=your-refresh-token-secret
SESSION_SECRET=your-session-secret-key
GRAFANA_PASSWORD=your-grafana-password
```

## 🐛 Troubleshooting

### Common issues:

**Services won't start:**
```bash
# Check logs
docker-compose logs

# Check if ports are in use
netstat -tulpn | grep :3000

# Remove and recreate
docker-compose down
docker-compose up -d
```

**Database connection issues:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify connection
docker-compose exec postgres psql -U postgres -c "SELECT version();"
```

**File permission issues:**
```bash
# Fix upload directory permissions
sudo chown -R 1001:1001 uploads/
```

**Out of disk space:**
```bash
# Clean up Docker
docker system prune -f
docker volume prune -f

# Remove unused images
docker image prune -a -f
```

## 🔄 Updates & Maintenance

### Update services:
```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

### Backup before updates:
```bash
# Backup databases
docker-compose exec postgres pg_dumpall -U postgres > full-backup.sql

# Backup volumes
docker run --rm -v hrms-postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz -C /data .
```

## 📈 Performance Tuning

### For production, consider:
```yaml
# In docker-compose.yml, add resource limits:
deploy:
  resources:
    limits:
      cpus: '0.50'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

### PostgreSQL tuning:
```bash
# Add to postgres environment:
POSTGRES_INITDB_ARGS: "--data-checksums"
# Mount custom postgresql.conf for production settings
```

## 🎯 Next Steps

1. **Frontend Integration**: Connect React frontend to API Gateway (port 3000)
2. **Load Testing**: Use tools like Artillery or k6 to test performance
3. **CI/CD Pipeline**: Set up automated deployments
4. **Kubernetes Migration**: For production scaling
5. **SSL/TLS**: Configure HTTPS for production
6. **Monitoring Alerts**: Set up Grafana alerts and notifications
