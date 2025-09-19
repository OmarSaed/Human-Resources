@echo off
REM HRMS Development Startup Script for Windows

echo 🚀 Starting HRMS Development Environment...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo ⚠️  .env file not found. Creating from example...
    copy .env.example .env
    echo 📝 Please update the .env file with your configuration.
)

REM Create Docker network if it doesn't exist
docker network create hrms-network 2>nul

echo 🏗️  Building and starting services...

REM Start infrastructure services first
echo 🗄️  Starting infrastructure services (PostgreSQL, Redis, Kafka)...
docker-compose up -d postgres redis zookeeper kafka

REM Wait for infrastructure to be ready
echo ⏳ Waiting for infrastructure services to be ready...
timeout /t 10

REM Start monitoring services
echo 📊 Starting monitoring services (Prometheus, Grafana, Jaeger)...
docker-compose up -d prometheus grafana jaeger

REM Start backend services
echo ⚙️  Starting backend services...
docker-compose up -d shared-service api-gateway auth-service employee-service time-attendance-service performance-service learning-service recruitment-service document-service notification-service

REM Wait for backend services to be ready
echo ⏳ Waiting for backend services to be ready...
timeout /t 15

REM Start frontend
echo 🎨 Starting frontend...
docker-compose up -d frontend

echo ✅ HRMS Development Environment Started!
echo.
echo 📱 Frontend: http://localhost:3000
echo 🔧 API Gateway: http://localhost:8000
echo 📊 Grafana: http://localhost:3030 (admin/admin)
echo 🔍 Prometheus: http://localhost:9090
echo 🕵️  Jaeger: http://localhost:16686
echo.
echo To view logs: docker-compose logs -f [service-name]
echo To stop all services: docker-compose down
echo To stop and remove volumes: docker-compose down -v
echo.
echo 📋 Services Status:
docker-compose ps
