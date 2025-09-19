#!/bin/bash

# HRMS Shared Service Setup Script

echo "🚀 Setting up HRMS Shared Service..."

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
echo "✅ HRMS Shared Service setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update the .env file with your configuration values"
echo "2. Start Kafka and Redis services"
echo "3. Run 'npm run dev' to start development mode"
echo "4. Import shared utilities in your microservices:"
echo "   import { KafkaService, authenticate, validate } from '@hrms/shared'"
echo ""
