#!/bin/bash

# HRMS Production Deployment Script
# Usage: ./scripts/deploy-production.sh [version] [environment]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
VERSION=${1:-"latest"}
ENVIRONMENT=${2:-"production"}
NAMESPACE="hrms"
REGISTRY="your-registry.com"

echo -e "${BLUE}🚀 HRMS Deployment Script${NC}"
echo -e "${BLUE}=============================${NC}"
echo -e "Version: ${YELLOW}${VERSION}${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Namespace: ${YELLOW}${NAMESPACE}${NC}"
echo ""

# Function to print step headers
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 completed successfully${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Function to wait for deployment rollout
wait_for_rollout() {
    local deployment=$1
    echo -e "${YELLOW}⏳ Waiting for ${deployment} rollout...${NC}"
    kubectl rollout status deployment/${deployment} -n ${NAMESPACE} --timeout=600s
    check_success "${deployment} rollout"
}

# Check prerequisites
print_step "Checking Prerequisites"
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}❌ kubectl is required but not installed${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ docker is required but not installed${NC}"; exit 1; }

# Check kubectl connection
kubectl cluster-info >/dev/null 2>&1 || { echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"; exit 1; }
echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Confirm deployment
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
    echo -e "${YELLOW}This will affect live users and data.${NC}"
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
fi

# Create namespace if it doesn't exist
print_step "Setting Up Namespace"
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
check_success "Namespace setup"
echo ""

# Apply secrets (only if they don't exist)
print_step "Applying Secrets"
if ! kubectl get secret hrms-secrets -n ${NAMESPACE} >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  hrms-secrets not found. Please create secrets manually:${NC}"
    echo "kubectl create secret generic hrms-secrets --from-env-file=backend/.env.${ENVIRONMENT} --namespace=${NAMESPACE}"
    echo ""
    read -p "Press Enter once secrets are created..."
else
    echo -e "${GREEN}✅ Secrets already exist${NC}"
fi
echo ""

# Apply ConfigMaps
print_step "Applying ConfigMaps"
kubectl apply -f backend/k8s/configmaps.yaml
check_success "ConfigMaps application"
echo ""

# Deploy infrastructure components first
print_step "Deploying Infrastructure Components"
echo "Deploying StatefulSets (PostgreSQL, Redis, Kafka, etc.)..."
kubectl apply -f backend/k8s/statefulsets.yaml
check_success "StatefulSets application"

echo "Deploying Services..."
kubectl apply -f backend/k8s/services.yaml
check_success "Services application"

# Wait for databases to be ready
echo -e "${YELLOW}⏳ Waiting for database services to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgresql --timeout=300s -n ${NAMESPACE} || {
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    exit 1
}
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

kubectl wait --for=condition=ready pod -l app=redis --timeout=300s -n ${NAMESPACE} || {
    echo -e "${RED}❌ Redis failed to start${NC}"
    exit 1
}
echo -e "${GREEN}✅ Redis is ready${NC}"

echo ""

# Update image tags if version is specified
if [ "$VERSION" != "latest" ]; then
    print_step "Updating Image Tags"
    
    # Create temporary deployment file with updated image tags
    cp backend/k8s/deployments.yaml backend/k8s/deployments.tmp.yaml
    
    # Update image tags
    sed -i.bak "s|image: hrms/\([^:]*\):.*|image: ${REGISTRY}/hrms/\1:${VERSION}|g" backend/k8s/deployments.tmp.yaml
    
    echo -e "${GREEN}✅ Image tags updated to ${VERSION}${NC}"
    echo ""
fi

# Deploy application services
print_step "Deploying Application Services"

# Deploy in dependency order
services=("auth-service" "employee-service" "performance-service" "learning-service" "time-attendance-service" "api-gateway")

for service in "${services[@]}"; do
    echo -e "${YELLOW}📦 Deploying ${service}...${NC}"
    
    if [ "$VERSION" != "latest" ]; then
        kubectl apply -f backend/k8s/deployments.tmp.yaml
    else
        kubectl apply -f backend/k8s/deployments.yaml
    fi
    
    wait_for_rollout ${service}
    echo ""
done

# Clean up temporary file
if [ "$VERSION" != "latest" ]; then
    rm -f backend/k8s/deployments.tmp.yaml backend/k8s/deployments.tmp.yaml.bak
fi

# Run database migrations
print_step "Running Database Migrations"
echo -e "${YELLOW}📊 Executing database migrations...${NC}"

# Create migration job
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-${VERSION//[^a-zA-Z0-9]/-}
  namespace: ${NAMESPACE}
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: ${REGISTRY}/hrms/auth-service:${VERSION}
        command: ["npm", "run", "db:migrate"]
        envFrom:
        - configMapRef:
            name: hrms-config
        - secretRef:
            name: hrms-secrets
      restartPolicy: Never
  backoffLimit: 3
EOF

# Wait for migration job to complete
kubectl wait --for=condition=complete job/db-migration-${VERSION//[^a-zA-Z0-9]/-} -n ${NAMESPACE} --timeout=300s
check_success "Database migration"

# Clean up migration job
kubectl delete job db-migration-${VERSION//[^a-zA-Z0-9]/-} -n ${NAMESPACE}
echo ""

# Verify deployment
print_step "Verifying Deployment"

echo "Checking pod status..."
kubectl get pods -n ${NAMESPACE}
echo ""

echo "Checking service status..."
kubectl get svc -n ${NAMESPACE}
echo ""

# Health check
echo -e "${YELLOW}🔍 Running health checks...${NC}"

# Port forward for health check
kubectl port-forward svc/api-gateway 8080:3000 -n ${NAMESPACE} &
PF_PID=$!
sleep 5

# Test health endpoint
if curl -f http://localhost:8080/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ API Gateway health check passed${NC}"
else
    echo -e "${RED}❌ API Gateway health check failed${NC}"
fi

# Kill port forward
kill $PF_PID 2>/dev/null || true

echo ""

# Display ingress information
print_step "Ingress Information"
if kubectl get ingress -n ${NAMESPACE} >/dev/null 2>&1; then
    kubectl get ingress -n ${NAMESPACE}
else
    echo -e "${YELLOW}⚠️  No ingress configured. External access not available.${NC}"
    echo "To access the API Gateway:"
    echo "kubectl port-forward svc/api-gateway 8080:3000 -n ${NAMESPACE}"
fi
echo ""

# Final summary
print_step "Deployment Summary"
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📊 Deployment Details:"
echo "  • Version: ${VERSION}"
echo "  • Environment: ${ENVIRONMENT}"
echo "  • Namespace: ${NAMESPACE}"
echo "  • Services deployed: ${#services[@]}"
echo ""
echo "🔍 Useful Commands:"
echo "  • View pods: kubectl get pods -n ${NAMESPACE}"
echo "  • View logs: kubectl logs -f deployment/api-gateway -n ${NAMESPACE}"
echo "  • Port forward: kubectl port-forward svc/api-gateway 8080:3000 -n ${NAMESPACE}"
echo ""
echo "📈 Monitoring:"
echo "  • Grafana: kubectl port-forward svc/grafana 3000:3000 -n hrms-monitoring"
echo "  • Prometheus: kubectl port-forward svc/prometheus 9090:9090 -n hrms-monitoring"
echo ""

# Optional: Open monitoring dashboards
read -p "Would you like to open monitoring dashboards? (y/n): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🖥️  Opening monitoring dashboards...${NC}"
    
    # Open Grafana
    kubectl port-forward svc/grafana 3001:3000 -n hrms-monitoring &
    echo "Grafana: http://localhost:3001 (admin/admin)"
    
    # Open Prometheus
    kubectl port-forward svc/prometheus 9091:9090 -n hrms-monitoring &
    echo "Prometheus: http://localhost:9091"
    
    echo ""
    echo "Press Ctrl+C to stop port forwarding when done."
    
    # Wait for user to stop
    trap 'echo -e "\n${YELLOW}Stopping port forwarding...${NC}"; jobs -p | xargs -r kill; exit 0' SIGINT
    wait
fi

echo -e "${GREEN}✨ Deployment script completed!${NC}"
