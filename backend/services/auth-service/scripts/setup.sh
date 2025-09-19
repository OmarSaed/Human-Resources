#!/bin/bash

# HRMS Authentication Service Setup Script

echo "🚀 Setting up HRMS Authentication Service..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your configuration values"
fi

# Check if shared service is built
if [ ! -d "../shared/dist" ]; then
    echo "🔨 Building shared service..."
    cd ../shared
    npm install
    npm run build
    cd ../auth-service
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations (only if DATABASE_URL is set)
if [ ! -z "$DATABASE_URL" ] || grep -q "DATABASE_URL=" .env; then
    echo "🗄️  Running database migrations..."
    npx prisma migrate dev --name init
else
    echo "⚠️  DATABASE_URL not set. Skipping database migrations."
    echo "   Please set DATABASE_URL and run 'npm run db:migrate'"
fi

# Build the project
echo "🔨 Building the project..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm test

# Run linting
echo "🔍 Running linter..."
npm run lint

echo ""
echo "✅ HRMS Authentication Service setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update the .env file with your configuration values"
echo "2. Ensure PostgreSQL and Redis are running"
echo "3. Run 'npm run db:migrate' if you haven't already"
echo "4. Run 'npm run dev' to start development mode"
echo "5. Visit http://localhost:3001/health to verify the service is running"
echo ""
echo "🔗 Available endpoints:"
echo "   • Health Check: GET http://localhost:3001/health"
echo "   • Login: POST http://localhost:3001/api/v1/auth/login"
echo "   • Register: POST http://localhost:3001/api/v1/auth/register"
echo ""
