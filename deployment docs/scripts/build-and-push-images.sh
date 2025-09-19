#!/bin/bash

# HRMS Docker Images Build and Push Script
# Usage: ./scripts/build-and-push-images.sh [registry] [version] [services...]

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
REGISTRY=${1:-"hrms"}
VERSION=${2:-$(git rev-parse --short HEAD 2>/dev/null || echo "latest")}
SERVICES=${3:-"all"}

# All available services
ALL_SERVICES=(
    "api-gateway"
    "auth-service"
    "employee-service"
    "performance-service"
    "learning-service"
    "time-attendance-service"
    "document-service"
    "notification-service"
    "recruitment-service"
)

echo -e "${BLUE}🐳 HRMS Docker Build & Push Script${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "Registry: ${YELLOW}${REGISTRY}${NC}"
echo -e "Version: ${YELLOW}${VERSION}${NC}"
echo -e "Services: ${YELLOW}${SERVICES}${NC}"
echo ""

# Function to print step headers
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        exit 1
    fi
}

# Function to build and push a single service
build_and_push_service() {
    local service=$1
    local service_path="backend/services/${service}"
    
    if [ ! -d "${service_path}" ]; then
        echo -e "${RED}❌ Service directory not found: ${service_path}${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}🔨 Building ${service}...${NC}"
    
    # Build image
    docker build \
        -t "${REGISTRY}/${service}:${VERSION}" \
        -t "${REGISTRY}/${service}:latest" \
        -f "${service_path}/Dockerfile" \
        "${service_path}"
    
    check_success "Built ${service}"
    
    # Push versioned image
    echo -e "${YELLOW}📤 Pushing ${service}:${VERSION}...${NC}"
    docker push "${REGISTRY}/${service}:${VERSION}"
    check_success "Pushed ${service}:${VERSION}"
    
    # Push latest tag
    echo -e "${YELLOW}📤 Pushing ${service}:latest...${NC}"
    docker push "${REGISTRY}/${service}:latest"
    check_success "Pushed ${service}:latest"
    
    echo ""
}

# Function to create Dockerfile if it doesn't exist
create_dockerfile() {
    local service=$1
    local service_path="backend/services/${service}"
    local dockerfile="${service_path}/Dockerfile"
    
    if [ ! -f "${dockerfile}" ]; then
        echo -e "${YELLOW}⚠️  Creating Dockerfile for ${service}...${NC}"
        
        cat > "${dockerfile}" <<EOF
# Multi-stage build for ${service}
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S ${service} -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy any additional required files
COPY prisma/ ./prisma/ 2>/dev/null || true

# Change ownership to non-root user
RUN chown -R ${service}:nodejs /app
USER ${service}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \\
  CMD curl -f http://localhost:\${PORT:-3000}/health || exit 1

# Expose port
EXPOSE \${PORT:-3000}

# Start application
CMD ["npm", "start"]
EOF
        
        echo -e "${GREEN}✅ Created Dockerfile for ${service}${NC}"
    fi
}

# Check prerequisites
print_step "Checking Prerequisites"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker is required but not installed${NC}"; exit 1; }
docker info >/dev/null 2>&1 || { echo -e "${RED}❌ Docker daemon is not running${NC}"; exit 1; }

# Check if logged into registry
if [[ "${REGISTRY}" == *"."* ]]; then
    echo -e "${YELLOW}🔐 Checking registry authentication...${NC}"
    docker info | grep -q "Username:" || {
        echo -e "${YELLOW}⚠️  Not logged into registry. Please run: docker login ${REGISTRY}${NC}"
        read -p "Press Enter after logging in..."
    }
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Determine which services to build
if [ "${SERVICES}" = "all" ]; then
    SERVICES_TO_BUILD=("${ALL_SERVICES[@]}")
else
    IFS=',' read -ra SERVICES_TO_BUILD <<< "${SERVICES}"
fi

echo -e "${BLUE}Services to build: ${SERVICES_TO_BUILD[*]}${NC}"
echo ""

# Build shared library first
print_step "Building Shared Library"
if [ -d "backend/services/shared" ]; then
    echo -e "${YELLOW}📚 Building shared library...${NC}"
    cd backend/services/shared
    npm ci
    npm run build
    cd - >/dev/null
    check_success "Built shared library"
else
    echo -e "${YELLOW}⚠️  Shared library not found, skipping...${NC}"
fi
echo ""

# Build and push services
print_step "Building and Pushing Services"

# Track build statistics
SUCCESS_COUNT=0
FAILED_SERVICES=()

for service in "${SERVICES_TO_BUILD[@]}"; do
    echo -e "${BLUE}🏗️  Processing ${service}...${NC}"
    
    # Create Dockerfile if missing
    create_dockerfile "${service}"
    
    # Build and push
    if build_and_push_service "${service}"; then
        ((SUCCESS_COUNT++))
    else
        FAILED_SERVICES+=("${service}")
    fi
done

echo ""

# Summary
print_step "Build Summary"

if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 All ${SUCCESS_COUNT} services built and pushed successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  ${SUCCESS_COUNT} services succeeded, ${#FAILED_SERVICES[@]} failed${NC}"
    echo -e "${RED}Failed services: ${FAILED_SERVICES[*]}${NC}"
fi

echo ""
echo "📊 Build Details:"
echo "  • Registry: ${REGISTRY}"
echo "  • Version: ${VERSION}"
echo "  • Services: ${SUCCESS_COUNT}/${#SERVICES_TO_BUILD[@]}"
echo ""

# Generate image list for deployment
echo "🐳 Built Images:"
for service in "${SERVICES_TO_BUILD[@]}"; do
    if [[ ! " ${FAILED_SERVICES[@]} " =~ " ${service} " ]]; then
        echo "  • ${REGISTRY}/${service}:${VERSION}"
    fi
done
echo ""

# Generate update commands
echo "🔄 Update Commands:"
echo "# Update deployments with new images:"
for service in "${SERVICES_TO_BUILD[@]}"; do
    if [[ ! " ${FAILED_SERVICES[@]} " =~ " ${service} " ]]; then
        echo "kubectl set image deployment/${service} ${service}=${REGISTRY}/${service}:${VERSION} -n hrms"
    fi
done

echo ""

# Optional: Tag and push additional versions
if [ "${VERSION}" != "latest" ] && [ "${VERSION}" != "$(git rev-parse --short HEAD 2>/dev/null)" ]; then
    read -p "Would you like to tag this version as a release? (y/n): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter release tag (e.g., v1.0.0): " RELEASE_TAG
        
        echo -e "${BLUE}🏷️  Tagging as release ${RELEASE_TAG}...${NC}"
        
        for service in "${SERVICES_TO_BUILD[@]}"; do
            if [[ ! " ${FAILED_SERVICES[@]} " =~ " ${service} " ]]; then
                docker tag "${REGISTRY}/${service}:${VERSION}" "${REGISTRY}/${service}:${RELEASE_TAG}"
                docker push "${REGISTRY}/${service}:${RELEASE_TAG}"
                echo -e "${GREEN}✅ Tagged and pushed ${service}:${RELEASE_TAG}${NC}"
            fi
        done
    fi
fi

# Cleanup old images (optional)
read -p "Would you like to clean up old local images? (y/n): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
    docker image prune -f
    echo -e "${GREEN}✅ Cleanup completed${NC}"
fi

echo ""
echo -e "${GREEN}✨ Build and push script completed!${NC}"

# Exit with error code if any builds failed
if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    exit 1
fi
