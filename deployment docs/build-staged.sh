#!/bin/bash

# Staged Docker Build Script
# This script builds services in stages to prevent resource exhaustion

set -e

echo "🚀 Starting staged Docker build process..."

# Function to build a group of services
build_group() {
    local group_name=$1
    shift
    local services=("$@")
    
    echo "📦 Building group: $group_name"
    echo "Services: ${services[*]}"
    
    # Build only the specified services
    for service in "${services[@]}"; do
        echo "  🔨 Building $service..."
        docker-compose build "$service" || {
            echo "❌ Failed to build $service"
            return 1
        }
        echo "  ✅ $service built successfully"
    done
    
    echo "✅ Group $group_name completed successfully"
    echo
}

# Stage 1: Infrastructure services (no build needed)
echo "🏗️  Stage 1: Starting infrastructure services..."
docker-compose up -d postgres redis kafka zookeeper prometheus grafana jaeger
echo "✅ Infrastructure services started"
echo

# Stage 2: Shared service (dependency for others)
echo "🏗️  Stage 2: Building shared service..."
build_group "Core Dependencies" shared-service
docker-compose up -d shared-service
echo

# Stage 3: Core backend services
echo "🏗️  Stage 3: Building core backend services..."
build_group "Core Backend" auth-service api-gateway employee-service
docker-compose up -d auth-service api-gateway employee-service
echo

# Stage 4: Business services group 1
echo "🏗️  Stage 4: Building business services (Group 1)..."
build_group "Business Group 1" performance-service learning-service
docker-compose up -d performance-service learning-service
echo

# Stage 5: Business services group 2
echo "🏗️  Stage 5: Building business services (Group 2)..."
build_group "Business Group 2" recruitment-service document-service
docker-compose up -d recruitment-service document-service
echo

# Stage 6: Support services
echo "🏗️  Stage 6: Building support services..."
build_group "Support Services" notification-service time-attendance-service
docker-compose up -d notification-service time-attendance-service
echo

# Stage 7: Frontend
echo "🏗️  Stage 7: Building frontend..."
build_group "Frontend" frontend
docker-compose up -d frontend
echo

echo "🎉 All services built and started successfully!"
echo "📊 Checking service status..."
docker-compose ps

echo
echo "🔗 Services should be available at:"
echo "  Frontend: http://localhost:3000"
echo "  API Gateway: http://localhost:8080"
echo "  Grafana: http://localhost:3001"
echo
echo "✅ Staged build completed successfully!"
