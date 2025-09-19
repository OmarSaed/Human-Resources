#!/bin/bash

# HRMS Development Startup Script

echo "🚀 Starting HRMS Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp .env.example .env
    echo "📝 Please update the .env file with your configuration."
fi

# Create Docker network if it doesn't exist
docker network create hrms-network 2>/dev/null || true

echo "🏗️  Building and starting services..."

# Start infrastructure services first
echo "🗄️  Starting infrastructure services (PostgreSQL, Redis, Kafka)..."
docker-compose up -d postgres redis zookeeper kafka

# Wait for infrastructure to be ready
echo "⏳ Waiting for infrastructure services to be ready..."
sleep 10

# Start monitoring services
echo "📊 Starting monitoring services (Prometheus, Grafana, Jaeger)..."
docker-compose up -d prometheus grafana jaeger

# Start backend services
echo "⚙️  Starting backend services..."
docker-compose up -d shared-service api-gateway auth-service employee-service time-attendance-service performance-service learning-service recruitment-service document-service notification-service

# Wait for backend services to be ready
echo "⏳ Waiting for backend services to be ready..."
sleep 15

# Start frontend
echo "🎨 Starting frontend..."
docker-compose up -d frontend

echo "✅ HRMS Development Environment Started!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 API Gateway: http://localhost:8000"
echo "📊 Grafana: http://localhost:3030 (admin/admin)"
echo "🔍 Prometheus: http://localhost:9090"
echo "🕵️  Jaeger: http://localhost:16686"
echo ""
echo "To view logs: docker-compose logs -f [service-name]"
echo "To stop all services: docker-compose down"
echo "To stop and remove volumes: docker-compose down -v"
echo ""
echo "📋 Services Status:"
docker-compose ps
