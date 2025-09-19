@echo off
REM HRMS Shared Service Setup Script for Windows

echo 🚀 Setting up HRMS Shared Service...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo ✅ Node.js found: 
node -v

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Copy environment file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please update the .env file with your configuration values
)

REM Build the project
echo 🔨 Building the project...
npm run build

REM Run tests
echo 🧪 Running tests...
npm test

REM Run linting
echo 🔍 Running linter...
npm run lint

echo.
echo ✅ HRMS Shared Service setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Update the .env file with your configuration values
echo 2. Start Kafka and Redis services
echo 3. Run 'npm run dev' to start development mode
echo 4. Import shared utilities in your microservices:
echo    import { KafkaService, authenticate, validate } from '@hrms/shared'
echo.
