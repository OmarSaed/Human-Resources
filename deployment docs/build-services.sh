#!/bin/bash

# HRMS Services Build Script with Network Optimization
# This script provides multiple strategies for building Docker images when facing network issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVICES=(
    "shared-service"
    "api-gateway"
    "auth-service"
    "employee-service"
    "performance-service"
    "learning-service"
    "recruitment-service"
    "time-attendance-service"
    "document-service"
    "notification-service"
)

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to build a single service
build_service() {
    local service=$1
    local strategy=$2
    
    print_status "Building $service using strategy: $strategy"
    
    cd "backend/services/$service"
    
    case $strategy in
        "optimized")
            if [ -f "Dockerfile.optimized" ]; then
                docker build -f Dockerfile.optimized -t "hrms-$service:latest" .
            else
                print_warning "No optimized Dockerfile found for $service, using standard"
                docker build -t "hrms-$service:latest" .
            fi
            ;;
        "offline")
            # Build with offline cache if available
            docker build --network=none -t "hrms-$service:latest" . 2>/dev/null || {
                print_warning "Offline build failed for $service, trying with network"
                docker build -t "hrms-$service:latest" .
            }
            ;;
        "cached")
            # Use build cache aggressively
            docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t "hrms-$service:latest" .
            ;;
        *)
            docker build -t "hrms-$service:latest" .
            ;;
    esac
    
    cd - > /dev/null
}

# Function to setup npm cache
setup_npm_cache() {
    print_status "Setting up npm cache and registry optimization..."
    
    # Create .npmrc with optimized settings
    cat > .npmrc << EOF
registry=https://registry.npmmirror.com/
fetch-timeout=600000
fetch-retry-mintimeout=20000
fetch-retry-maxtimeout=120000
fetch-retries=5
maxsockets=15
progress=false
loglevel=warn
EOF
    
    # Copy .npmrc to all service directories
    for service in "${SERVICES[@]}"; do
        cp .npmrc "backend/services/$service/"
    done
    
    print_status "npm configuration optimized for all services"
}

# Function to cleanup npm cache
cleanup_npm_cache() {
    print_status "Cleaning up npm cache files..."
    find . -name ".npmrc" -not -path "./node_modules/*" -delete 2>/dev/null || true
}

# Function to pre-download dependencies
pre_download_deps() {
    print_status "Pre-downloading dependencies to Docker cache..."
    
    for service in "${SERVICES[@]}"; do
        if [ -d "backend/services/$service" ]; then
            print_status "Pre-caching dependencies for $service"
            docker build --target deps -t "hrms-$service-deps:cache" "backend/services/$service" || {
                print_warning "Failed to pre-cache $service dependencies"
            }
        fi
    done
}

# Main function
main() {
    local strategy=${1:-"standard"}
    local service_filter=${2:-"all"}
    
    echo "===========================================" 
    echo "🏗️  HRMS Docker Build Script"
    echo "Strategy: $strategy"
    echo "Filter: $service_filter"
    echo "==========================================="
    
    case $strategy in
        "setup")
            setup_npm_cache
            pre_download_deps
            print_status "Setup complete! Now run: ./build-services.sh optimized"
            exit 0
            ;;
        "cleanup")
            cleanup_npm_cache
            docker system prune -f
            print_status "Cleanup complete!"
            exit 0
            ;;
        "optimized"|"offline"|"cached"|"standard")
            # Continue with build
            ;;
        *)
            print_error "Unknown strategy: $strategy"
            echo "Available strategies: setup, optimized, offline, cached, standard, cleanup"
            exit 1
            ;;
    esac
    
    # Setup npm optimization if not already done
    if [ ! -f ".npmrc" ]; then
        setup_npm_cache
    fi
    
    # Build services
    local built_count=0
    local failed_count=0
    
    for service in "${SERVICES[@]}"; do
        if [ "$service_filter" != "all" ] && [ "$service_filter" != "$service" ]; then
            continue
        fi
        
        if [ -d "backend/services/$service" ]; then
            print_status "Building $service..."
            if build_service "$service" "$strategy"; then
                print_status "✅ Successfully built $service"
                ((built_count++))
            else
                print_error "❌ Failed to build $service"
                ((failed_count++))
            fi
        else
            print_warning "Service directory not found: $service"
        fi
    done
    
    echo "==========================================="
    echo "🎉 Build Summary:"
    echo "   ✅ Built: $built_count services"
    echo "   ❌ Failed: $failed_count services"
    echo "==========================================="
    
    if [ $failed_count -eq 0 ]; then
        print_status "All services built successfully!"
        exit 0
    else
        print_error "Some services failed to build. Check logs above."
        exit 1
    fi
}

# Help function
show_help() {
    cat << EOF
HRMS Docker Build Script

Usage: $0 [STRATEGY] [SERVICE]

STRATEGIES:
  setup       - Setup npm cache and pre-download dependencies
  optimized   - Build with registry fallbacks and optimization
  offline     - Attempt offline build first, fallback to online
  cached      - Use aggressive Docker build caching
  standard    - Standard docker build (default)
  cleanup     - Clean npm cache and Docker system

SERVICES:
  all         - Build all services (default)
  <service>   - Build specific service (e.g., auth-service)

EXAMPLES:
  $0 setup                    # Setup environment first
  $0 optimized               # Build all services with optimization
  $0 optimized auth-service  # Build only auth service optimized
  $0 cleanup                 # Clean up after builds

EOF
}

# Handle help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Run main function
main "$@"
