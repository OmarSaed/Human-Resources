#!/bin/bash

# HRMS API Gateway Setup Script
echo "🌐 Setting up HRMS API Gateway..."

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the api-gateway directory."
    exit 1
fi

# Check Node.js version
print_status "Checking Node.js version..."
node_version=$(node --version | sed 's/v//')
required_version="18.0.0"

if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
    print_error "Node.js version $required_version or higher is required. Current version: $node_version"
    exit 1
fi
print_success "Node.js version check passed: $node_version"

# Check npm
print_status "Checking npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm is available"

# Install dependencies
print_status "Installing dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Install shared service
print_status "Installing shared service..."
if [ -d "../shared" ]; then
    cd ../shared
    if [ ! -d "node_modules" ]; then
        print_status "Installing shared service dependencies..."
        npm install
    fi
    if [ ! -d "dist" ]; then
        print_status "Building shared service..."
        npm run build
    fi
    cd ../api-gateway
    print_success "Shared service ready"
else
    print_warning "Shared service not found at ../shared"
fi

# Setup environment file
print_status "Setting up environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        cp env.example .env
        print_success "Environment file created from example"
        print_warning "Please edit .env file with your configuration"
    else
        print_error "env.example file not found"
        exit 1
    fi
else
    print_warning ".env file already exists"
fi

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs
print_success "Logs directory created"

# Build TypeScript
print_status "Building TypeScript..."
if npm run build; then
    print_success "TypeScript build completed"
else
    print_error "TypeScript build failed"
    exit 1
fi

# Run tests
print_status "Running tests..."
if npm test; then
    print_success "All tests passed"
else
    print_warning "Some tests failed - check output above"
fi

# Check linting
print_status "Running linter..."
if npm run lint; then
    print_success "Code linting passed"
else
    print_warning "Linting issues found - check output above"
fi

# Validate configuration
print_status "Validating configuration..."
if node -e "
const { validateGatewayConfig } = require('./dist/config');
try {
    validateGatewayConfig();
    console.log('✓ Configuration is valid');
} catch (error) {
    console.error('✗ Configuration validation failed:', error.message);
    process.exit(1);
}
"; then
    print_success "Configuration validation passed"
else
    print_error "Configuration validation failed"
    exit 1
fi

# Setup complete
print_success "🎉 API Gateway setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit the .env file with your service URLs and configuration"
echo "2. Ensure Redis is running for distributed rate limiting"
echo "3. Start the development server: npm run dev"
echo "4. Or start the production server: npm start"
echo ""
echo "Useful commands:"
echo "  npm run dev          - Start development server with hot reload"
echo "  npm start            - Start production server"
echo "  npm test             - Run tests"
echo "  npm run build        - Build for production"
echo "  npm run lint         - Check code style"
echo ""
echo "Health check URL: http://localhost:3000/health"
echo "Admin metrics URL: http://localhost:3000/metrics (requires admin token)"
echo ""
print_success "Happy coding! 🚀"
