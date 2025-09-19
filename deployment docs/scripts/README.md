# HRMS Deployment Scripts 📜

This directory contains all deployment-related scripts for the HRMS application. All scripts have been consolidated here for easy management and to eliminate duplicates.

## 📋 Available Scripts

### 🐳 Docker & Container Management

#### `build-and-push-images.sh`
**Purpose**: Build and push Docker images for all HRMS microservices
**Usage**: 
```bash
./build-and-push-images.sh [registry] [version] [services...]
```
**Examples**:
```bash
# Build all services with latest tag
./build-and-push-images.sh

# Build specific services with custom version
./build-and-push-images.sh hrms v1.2.0 auth-service,api-gateway

# Build for ECR registry
./build-and-push-images.sh 123456789012.dkr.ecr.us-east-1.amazonaws.com/hrms v1.0.0
```

---

### ☁️ AWS & Infrastructure

#### `deploy-aws-infrastructure.sh`
**Purpose**: Deploy complete AWS infrastructure using Terraform (EKS, RDS, ElastiCache, etc.)
**Usage**:
```bash
./deploy-aws-infrastructure.sh <environment> <action> [aws-region]
```
**Examples**:
```bash
# Plan staging infrastructure
./deploy-aws-infrastructure.sh staging plan

# Deploy to production
export DB_PASSWORD="secure-password"
./deploy-aws-infrastructure.sh production apply us-east-1
```

---

### 🚀 Application Deployment

#### `deploy-kubernetes-production.sh`
**Purpose**: Deploy HRMS application to Kubernetes (EKS) for production
**Usage**:
```bash
./deploy-kubernetes-production.sh [version] [environment]
```
**Examples**:
```bash
# Deploy latest version to production
./deploy-kubernetes-production.sh

# Deploy specific version to staging
./deploy-kubernetes-production.sh v1.2.0 staging
```

#### `deploy-docker-production.sh`
**Purpose**: Deploy HRMS application using Docker Compose for production
**Usage**:
```bash
./deploy-docker-production.sh
```
**Note**: Alternative to Kubernetes deployment for simpler production setups

---

### 🛠️ Development & Testing

#### `start-dev-stack.sh`
**Purpose**: Start complete development environment with monitoring and observability
**Usage**:
```bash
./start-dev-stack.sh
```
**Includes**: PostgreSQL, Redis, Kafka, Prometheus, Grafana, Jaeger, Vault

---

### 🗄️ Database Management

#### `init-db.sql`
**Purpose**: Initialize HRMS databases with required schemas and extensions
**Usage**: Automatically executed during PostgreSQL container startup or run manually:
```bash
psql -U postgres -f init-db.sql
```

#### `init-multiple-databases.sh`
**Purpose**: Create multiple databases for microservices during PostgreSQL initialization
**Usage**: Set `POSTGRES_MULTIPLE_DATABASES` environment variable in docker-compose
**Example**: `POSTGRES_MULTIPLE_DATABASES=hrms_auth,hrms_employee,hrms_hr`

---

## 🔧 Script Dependencies

### Prerequisites
- **Docker** (v20.0+) and **Docker Compose** (v2.0+)
- **AWS CLI** (v2.0+) configured with appropriate permissions
- **kubectl** (v1.28+) for Kubernetes deployments
- **Terraform** (v1.0+) for infrastructure deployment
- **Helm** (v3.0+) for Kubernetes package management

### Environment Variables
Make sure to set these before running scripts:
```bash
export DB_PASSWORD="your-secure-password"
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="123456789012"
```

## 🚀 Quick Start Guide

### For Development:
```bash
# 1. Start development stack
./start-dev-stack.sh

# 2. Build images (if needed)
./build-and-push-images.sh local latest
```

### For AWS Production:
```bash
# 1. Deploy infrastructure
export DB_PASSWORD="secure-password"
./deploy-aws-infrastructure.sh production apply

# 2. Build and push images
./build-and-push-images.sh <your-ecr-registry> v1.0.0

# 3. Deploy application
./deploy-kubernetes-production.sh v1.0.0 production
```

### For Docker Production:
```bash
# 1. Build images
./build-and-push-images.sh

# 2. Deploy with Docker Compose
./deploy-docker-production.sh
```

## 📚 Additional Resources

- [Docker Setup Guide](../docker-setup.md)
- [AWS Deployment Guide](../aws-deployment-guide.md)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/cluster-administration/manage-deployment/)
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## 🐛 Troubleshooting

### Common Issues:
1. **Permission denied**: Make scripts executable with `chmod +x script-name.sh`
2. **Docker not running**: Start Docker daemon
3. **AWS credentials**: Configure with `aws configure`
4. **Kubernetes access**: Update kubeconfig with `aws eks update-kubeconfig`

### Getting Help:
- Check script logs and error messages
- Verify prerequisites are installed
- Ensure environment variables are set
- Review the detailed deployment guides

---

*Last updated: September 2025*
