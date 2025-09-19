#!/bin/bash

# HRMS Production Deployment Script
# =====================================

set -e  # Exit on any error

echo "🚀 Starting HRMS Production Deployment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Prerequisites check passed!"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p data/postgres
    mkdir -p data/redis
    mkdir -p data/elasticsearch
    mkdir -p data/minio
    mkdir -p data/grafana
    mkdir -p data/prometheus
    
    print_success "Directories created!"
}

# Set file permissions
set_permissions() {
    print_status "Setting file permissions..."
    
    chmod +x scripts/init-multiple-databases.sh
    chmod 755 logs
    
    print_success "Permissions set!"
}

# Pull latest images
pull_images() {
    print_status "Pulling latest Docker images..."
    
    docker-compose -f docker-compose.prod.yml pull
    
    print_success "Images pulled!"
}

# Build custom images
build_images() {
    print_status "Building HRMS service images..."
    
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    print_success "Images built!"
}

# Start infrastructure services first
start_infrastructure() {
    print_status "Starting infrastructure services..."
    
    docker-compose -f docker-compose.prod.yml up -d postgres redis zookeeper kafka elasticsearch minio
    
    print_status "Waiting for infrastructure services to be ready..."
    sleep 30
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    until docker exec hrms-postgres-prod pg_isready -U hrms_user -d hrms_production; do
        sleep 2
    done
    
    # Wait for Redis to be ready
    print_status "Waiting for Redis to be ready..."
    until docker exec hrms-redis-prod redis-cli ping; do
        sleep 2
    done
    
    # Wait for Kafka to be ready
    print_status "Waiting for Kafka to be ready..."
    until docker exec hrms-kafka-prod kafka-broker-api-versions --bootstrap-server localhost:9092; do
        sleep 5
    done
    
    print_success "Infrastructure services are ready!"
}

# Start application services
start_applications() {
    print_status "Starting HRMS application services..."
    
    docker-compose -f docker-compose.prod.yml up -d auth-service employee-service time-attendance-service performance-service learning-service
    
    print_status "Waiting for application services to be ready..."
    sleep 20
    
    print_success "Application services started!"
}

# Start API Gateway
start_gateway() {
    print_status "Starting API Gateway..."
    
    docker-compose -f docker-compose.prod.yml up -d api-gateway
    
    print_status "Waiting for API Gateway to be ready..."
    sleep 10
    
    print_success "API Gateway started!"
}

# Start monitoring services
start_monitoring() {
    print_status "Starting monitoring services..."
    
    docker-compose -f docker-compose.prod.yml up -d prometheus grafana jaeger
    
    print_success "Monitoring services started!"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    local services=("api-gateway:3000" "auth-service:3001" "employee-service:3002" "time-attendance-service:3003" "performance-service:3004" "learning-service:3005")
    
    for service in "${services[@]}"; do
        local service_name="${service%:*}"
        local port="${service#*:}"
        
        print_status "Checking $service_name..."
        
        local retries=0
        local max_retries=30
        
        while [ $retries -lt $max_retries ]; do
            if curl -f "http://localhost:$port/health" &> /dev/null; then
                print_success "$service_name is healthy!"
                break
            else
                retries=$((retries + 1))
                if [ $retries -eq $max_retries ]; then
                    print_warning "$service_name health check failed after $max_retries attempts"
                else
                    sleep 2
                fi
            fi
        done
    done
}

# Display service status
show_status() {
    print_status "Deployment Status:"
    echo
    docker-compose -f docker-compose.prod.yml ps
    echo
    
    print_status "Service URLs:"
    echo "🌐 API Gateway:      http://localhost:3000"
    echo "🔐 Auth Service:     http://localhost:3001"
    echo "👥 Employee Service: http://localhost:3002"
    echo "⏰ Time Service:     http://localhost:3003"
    echo "📊 Performance:      http://localhost:3004"
    echo "📚 Learning:         http://localhost:3005"
    echo "📈 Grafana:          http://localhost:3001 (admin/grafana_admin_password_2024)"
    echo "🔍 Prometheus:       http://localhost:9090"
    echo "🔍 Jaeger:           http://localhost:16686"
    echo "📁 MinIO:            http://localhost:9001 (hrms_admin/minio_secure_password_2024)"
    echo
}

# Cleanup function
cleanup() {
    print_status "Cleaning up old containers and images..."
    
    docker system prune -f
    docker volume prune -f
    
    print_success "Cleanup completed!"
}

# Main deployment process
main() {
    echo "============================================="
    echo "🏢 HRMS Production Deployment Script"
    echo "============================================="
    echo
    
    check_prerequisites
    create_directories
    set_permissions
    
    # Ask for confirmation
    read -p "Do you want to proceed with production deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled by user"
        exit 0
    fi
    
    pull_images
    build_images
    start_infrastructure
    start_applications
    start_gateway
    start_monitoring
    health_check
    show_status
    
    print_success "🎉 HRMS Production Deployment Completed Successfully!"
    print_status "You can now access the HRMS system at http://localhost:3000"
    
    echo
    echo "============================================="
    echo "📚 Next Steps:"
    echo "1. Configure your domain and SSL certificates"
    echo "2. Set up proper backup procedures"
    echo "3. Configure monitoring alerts"
    echo "4. Review security settings"
    echo "5. Set up log rotation"
    echo "============================================="
}

# Trap to handle script interruption
trap 'print_error "Deployment interrupted!"; exit 1' INT TERM

# Run main function
main "$@"
