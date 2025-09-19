# HRMS Deployment Scripts

This directory contains all the deployment and setup scripts for the HRMS system. These scripts have been organized into the `deployment docs` folder for better organization and maintainability.

## 📂 Script Organization

### 🚀 **Main Deployment Scripts**
- `auto-deploy.bat` / `auto-deploy.sh` - Complete automated deployment with health checks
- `start-dev.bat` / `start-dev.sh` - Development environment startup  
- `setup-env.bat` / `setup-env.sh` - Environment file creation and configuration

### 🔨 **Build Scripts**
- `build-services.bat` / `build-services.sh` - Build all microservices
- `build-staged.sh` - Staged build process for resource management

### 📁 **scripts/ Subdirectory**
- `start-dev-stack.sh` - Alternative development stack startup
- `deploy-docker-production.sh` - Production Docker deployment
- `deploy-kubernetes-production.sh` - Production Kubernetes deployment
- `deploy-aws-infrastructure.sh` - AWS infrastructure setup
- `build-and-push-images.sh` - Docker image building and registry push
- `init-db.sql` - Database initialization SQL
- `init-multiple-databases.sh` - Multi-database setup script

## 🎯 **Quick Reference**

### For Windows Users:
```cmd
# Complete automated setup
"deployment docs\auto-deploy.bat"

# Development environment
"deployment docs\start-dev.bat"

# Environment setup
"deployment docs\setup-env.bat"
```

### For Linux/macOS Users:
```bash
# Complete automated setup
chmod +x "deployment docs/auto-deploy.sh"
"deployment docs/auto-deploy.sh"

# Development environment  
chmod +x "deployment docs/start-dev.sh"
"deployment docs/start-dev.sh"

# Environment setup
chmod +x "deployment docs/setup-env.sh"
"deployment docs/setup-env.sh"
```

## 🔧 **Script Features**

### Auto-Deploy Scripts
- ✅ Automatic Docker health checks
- ✅ Service dependency management
- ✅ Parallel service building
- ✅ Real-time status monitoring
- ✅ Auto-restart configuration

### Development Scripts
- ✅ Staged service startup
- ✅ Infrastructure services first
- ✅ Backend services coordination
- ✅ Frontend integration
- ✅ Comprehensive logging

### Environment Scripts  
- ✅ Interactive configuration
- ✅ Secure password generation
- ✅ Service port validation
- ✅ Development/production profiles

## 📊 **Access URLs After Deployment**

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:80 | Production UI |
| API Gateway | http://localhost:8000 | Main API entry |
| Grafana | http://localhost:3030 | Monitoring dashboard |
| Prometheus | http://localhost:9090 | Metrics collection |
| Jaeger | http://localhost:16686 | Distributed tracing |

## 🛠️ **Troubleshooting**

### Common Issues:
1. **Port conflicts** - Check if ports are already in use
2. **Docker not running** - Ensure Docker service is started
3. **Permission issues** - Run scripts with appropriate permissions
4. **Environment missing** - Run setup-env script first

### Debug Commands:
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs -f [service-name]

# Restart specific service
docker-compose restart [service-name]

# Complete cleanup
docker-compose down -v
```

## 📝 **Notes**

- All scripts include comprehensive error checking and user feedback
- Scripts are designed to be idempotent (safe to run multiple times)
- Auto-restart policies ensure services stay running after system reboot
- Health checks prevent premature service startup
- Staging deployment prevents resource exhaustion

For detailed deployment guides, see the main documentation files in this directory.
