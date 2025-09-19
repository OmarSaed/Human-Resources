#!/bin/bash

# Enhanced HRMS Microservice Stack Startup Script
# This script starts the complete infrastructure with monitoring, tracing, and security

set -e

echo "🚀 Starting Enhanced HRMS Microservice Stack..."

# Colors for output
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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources
mkdir -p data/prometheus
mkdir -p data/grafana
mkdir -p data/vault

# Set permissions for Grafana
print_status "Setting up permissions..."
sudo chown -R 472:472 data/grafana 2>/dev/null || echo "Note: Could not set Grafana permissions (running as non-root user)"

print_status "Starting infrastructure services..."

# Start the complete stack
docker-compose -f docker-compose.dev.yml up -d

print_status "Waiting for services to be ready..."

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        print_status "Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    done

    print_warning "$service_name is not responding after $max_attempts attempts"
    return 1
}

# Wait for core infrastructure
print_status "Checking infrastructure services..."

wait_for_service "PostgreSQL" "http://localhost:5432" || true
wait_for_service "Redis" "http://localhost:6379" || true
wait_for_service "Kafka" "http://localhost:9092" || true
wait_for_service "Elasticsearch" "http://localhost:9200"
wait_for_service "MinIO" "http://localhost:9000"
wait_for_service "Prometheus" "http://localhost:9090"
wait_for_service "Grafana" "http://localhost:3001"
wait_for_service "Jaeger" "http://localhost:16686"
wait_for_service "Vault" "http://localhost:8200"

print_status "Setting up Vault secrets..."

# Initialize Vault with demo secrets
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=myroot

# Wait a bit more for Vault to be fully ready
sleep 10

# Create demo secrets
vault kv put secret/database/auth \
    host=postgres \
    port=5432 \
    username=postgres \
    password=postgres \
    database=hrms_auth 2>/dev/null || print_warning "Could not create Vault secrets"

vault kv put secret/jwt/auth \
    secret=your-super-secret-jwt-key-change-in-production \
    issuer=hrms-system \
    expiresIn=7d 2>/dev/null || print_warning "Could not create JWT secrets"

vault kv put secret/redis/auth \
    host=redis \
    port=6379 \
    password=redis123 \
    database=0 2>/dev/null || print_warning "Could not create Redis secrets"

print_success "Vault secrets configured!"

print_status "Importing Grafana dashboards..."

# Wait for Grafana to be ready
sleep 5

# Import the HRMS dashboard
curl -X POST \
  http://admin:admin123@localhost:3001/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana/dashboards/hrms-overview.json \
  2>/dev/null || print_warning "Could not import Grafana dashboard"

print_success "Grafana dashboard imported!"

print_status "Creating Kafka topics..."

# Create necessary Kafka topics
docker exec hrms-kafka kafka-topics --create \
    --topic employee-events \
    --bootstrap-server localhost:9092 \
    --partitions 3 \
    --replication-factor 1 2>/dev/null || print_warning "Employee events topic may already exist"

docker exec hrms-kafka kafka-topics --create \
    --topic recruitment-events \
    --bootstrap-server localhost:9092 \
    --partitions 3 \
    --replication-factor 1 2>/dev/null || print_warning "Recruitment events topic may already exist"

docker exec hrms-kafka kafka-topics --create \
    --topic notification-events \
    --bootstrap-server localhost:9092 \
    --partitions 3 \
    --replication-factor 1 2>/dev/null || print_warning "Notification events topic may already exist"

docker exec hrms-kafka kafka-topics --create \
    --topic audit-events \
    --bootstrap-server localhost:9092 \
    --partitions 3 \
    --replication-factor 1 2>/dev/null || print_warning "Audit events topic may already exist"

print_success "Kafka topics created!"

echo ""
echo "🎉 Enhanced HRMS Stack is ready!"
echo ""
echo "📊 Monitoring & Observability:"
echo "   • Grafana Dashboard: http://localhost:3001 (admin/admin123)"
echo "   • Prometheus Metrics: http://localhost:9090"
echo "   • Jaeger Tracing: http://localhost:16686"
echo "   • Kafka UI: http://localhost:8080"
echo ""
echo "🔒 Security & Configuration:"
echo "   • Vault UI: http://localhost:8200 (token: myroot)"
echo "   • AlertManager: http://localhost:9093"
echo ""
echo "💾 Data & Storage:"
echo "   • MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
echo "   • Elasticsearch: http://localhost:9200"
echo ""
echo "🏥 Health Checks:"
echo "   • Node Exporter: http://localhost:9100"
echo "   • System Health: docker-compose ps"
echo ""
echo "🚀 Next Steps:"
echo "   1. Start your microservices: cd services && npm run dev"
echo "   2. View logs: docker-compose logs -f [service-name]"
echo "   3. Run tests: npm run test:integration"
echo "   4. Monitor metrics in Grafana dashboard"
echo ""
print_success "Happy coding! 🎯"
