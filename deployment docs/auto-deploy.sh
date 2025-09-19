#!/bin/bash

# HRMS Auto-Deploy Script for Linux/macOS
# This script ensures all services start and run automatically

echo "🚀 Starting HRMS Auto-Deploy Process..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo "📝 Creating basic .env file..."
        ./setup-env.sh
    fi
    echo "📝 Please update the .env file with your configuration."
    read -p "Press enter to continue..."
fi

echo "🧹 Cleaning up any existing containers..."
docker-compose down

echo "🏗️  Building and deploying all services with auto-restart..."

# Create Docker network if it doesn't exist
docker network create hrms-network 2>/dev/null || true

echo "📦 Building services (this may take a few minutes)..."
docker-compose build --parallel

echo "🚀 Starting all services with auto-restart enabled..."
docker-compose up -d

echo "⏳ Waiting for services to initialize..."
sleep 30

echo "📊 Checking service status..."
docker-compose ps

echo "✅ HRMS Auto-Deploy Completed!"
echo ""
echo "🌐 Access URLs:"
echo "📱 Frontend: http://localhost:80 (Production) or http://localhost:3000 (Development)"
echo "🔧 API Gateway: http://localhost:8000"
echo "📊 Grafana: http://localhost:3030 (admin/admin)"
echo "🔍 Prometheus: http://localhost:9090"
echo "🕵️  Jaeger: http://localhost:16686"
echo ""
echo "📋 Service Management:"
echo "  View all logs: docker-compose logs -f"
echo "  View specific service: docker-compose logs -f [service-name]"
echo "  Restart service: docker-compose restart [service-name]"
echo "  Stop all: docker-compose down"
echo "  Full cleanup: docker-compose down -v"
echo ""
echo "🔄 All services are configured with auto-restart (restart: unless-stopped)"
echo "   They will automatically start when Docker starts or after system reboot."
echo ""

# Wait a bit more and show final status
sleep 10
echo "📈 Final Health Check:"
docker-compose ps --filter "status=running"

echo ""
echo "🎉 Deployment complete! All services should now be running automatically."
