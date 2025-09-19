@echo off
REM HRMS Authentication Service Setup Script for Windows

echo 🚀 Setting up HRMS Authentication Service...

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

REM Check if shared service is built
if not exist "..\shared\dist" (
    echo 🔨 Building shared service...
    cd ..\shared
    npm install
    npm run build
    cd ..\auth-service
)

REM Generate Prisma client
echo 🔧 Generating Prisma client...
npx prisma generate

REM Check if DATABASE_URL is set in .env file
findstr /C:"DATABASE_URL=" .env >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo 🗄️  Running database migrations...
    npx prisma migrate dev --name init
) else (
    echo ⚠️  DATABASE_URL not set. Skipping database migrations.
    echo    Please set DATABASE_URL and run 'npm run db:migrate'
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
echo ✅ HRMS Authentication Service setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Update the .env file with your configuration values
echo 2. Ensure PostgreSQL and Redis are running
echo 3. Run 'npm run db:migrate' if you haven't already
echo 4. Run 'npm run dev' to start development mode
echo 5. Visit http://localhost:3001/health to verify the service is running
echo.
echo 🔗 Available endpoints:
echo    • Health Check: GET http://localhost:3001/health
echo    • Login: POST http://localhost:3001/api/v1/auth/login
echo    • Register: POST http://localhost:3001/api/v1/auth/register
echo.
