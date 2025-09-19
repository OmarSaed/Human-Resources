#!/bin/bash

# AWS Infrastructure Deployment Script for HRMS
# This script deploys the complete AWS infrastructure using Terraform

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-"staging"}
ACTION=${2:-"plan"}
AWS_REGION=${3:-"us-east-1"}
TERRAFORM_DIR="terraform"

echo -e "${BLUE}🏗️  HRMS AWS Infrastructure Deployment${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Action: ${YELLOW}${ACTION}${NC}"
echo -e "AWS Region: ${YELLOW}${AWS_REGION}${NC}"
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

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking Prerequisites"
    
    # Check if required tools are installed
    command -v terraform >/dev/null 2>&1 || { 
        echo -e "${RED}❌ Terraform is required but not installed${NC}"
        echo "Please install Terraform: https://www.terraform.io/downloads.html"
        exit 1
    }
    
    command -v aws >/dev/null 2>&1 || { 
        echo -e "${RED}❌ AWS CLI is required but not installed${NC}"
        echo "Please install AWS CLI: https://aws.amazon.com/cli/"
        exit 1
    }
    
    command -v kubectl >/dev/null 2>&1 || { 
        echo -e "${RED}❌ kubectl is required but not installed${NC}"
        echo "Please install kubectl: https://kubernetes.io/docs/tasks/tools/"
        exit 1
    }
    
    # Check AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || {
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        echo "Please configure AWS credentials: aws configure"
        exit 1
    }
    
    # Check if environment is valid
    if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
        echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
        echo "Valid environments: staging, production"
        exit 1
    fi
    
    # Check if action is valid
    if [[ ! "$ACTION" =~ ^(plan|apply|destroy)$ ]]; then
        echo -e "${RED}❌ Invalid action: $ACTION${NC}"
        echo "Valid actions: plan, apply, destroy"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
    echo ""
}

# Function to setup Terraform backend
setup_terraform_backend() {
    print_step "Setting up Terraform Backend"
    
    BUCKET_NAME="hrms-terraform-state-$(aws sts get-caller-identity --query Account --output text)"
    TABLE_NAME="hrms-terraform-locks"
    
    # Create S3 bucket for Terraform state
    if ! aws s3 ls "s3://$BUCKET_NAME" 2>/dev/null; then
        echo "Creating S3 bucket for Terraform state..."
        aws s3 mb "s3://$BUCKET_NAME" --region $AWS_REGION
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket $BUCKET_NAME \
            --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption \
            --bucket $BUCKET_NAME \
            --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'
        
        echo -e "${GREEN}✅ S3 bucket created: $BUCKET_NAME${NC}"
    else
        echo -e "${GREEN}✅ S3 bucket already exists: $BUCKET_NAME${NC}"
    fi
    
    # Create DynamoDB table for state locking
    if ! aws dynamodb describe-table --table-name $TABLE_NAME --region $AWS_REGION >/dev/null 2>&1; then
        echo "Creating DynamoDB table for state locking..."
        aws dynamodb create-table \
            --table-name $TABLE_NAME \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --region $AWS_REGION
        
        # Wait for table to be created
        aws dynamodb wait table-exists --table-name $TABLE_NAME --region $AWS_REGION
        echo -e "${GREEN}✅ DynamoDB table created: $TABLE_NAME${NC}"
    else
        echo -e "${GREEN}✅ DynamoDB table already exists: $TABLE_NAME${NC}"
    fi
    
    # Update backend configuration
    cat > ${TERRAFORM_DIR}/backend.tf << EOF
terraform {
  backend "s3" {
    bucket         = "$BUCKET_NAME"
    key            = "infrastructure/$ENVIRONMENT/terraform.tfstate"
    region         = "$AWS_REGION"
    dynamodb_table = "$TABLE_NAME"
    encrypt        = true
  }
}
EOF
    
    echo ""
}

# Function to run Terraform
run_terraform() {
    print_step "Running Terraform $ACTION"
    
    cd $TERRAFORM_DIR
    
    # Initialize Terraform
    echo "Initializing Terraform..."
    terraform init
    check_success "Terraform initialization"
    
    # Validate configuration
    echo "Validating Terraform configuration..."
    terraform validate
    check_success "Terraform validation"
    
    # Format check
    terraform fmt -check=true
    check_success "Terraform format check"
    
    case $ACTION in
        "plan")
            echo "Running Terraform plan..."
            terraform plan -var-file="${ENVIRONMENT}.tfvars" -var="db_password=$DB_PASSWORD"
            ;;
        "apply")
            echo "Running Terraform apply..."
            if [ "$ENVIRONMENT" = "production" ]; then
                echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
                echo -e "${YELLOW}This will create real AWS resources and incur costs.${NC}"
                read -p "Are you sure you want to continue? (yes/no): " -r
                if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
                    echo -e "${YELLOW}Deployment cancelled${NC}"
                    exit 0
                fi
            fi
            terraform apply -var-file="${ENVIRONMENT}.tfvars" -var="db_password=$DB_PASSWORD" -auto-approve
            check_success "Terraform apply"
            ;;
        "destroy")
            echo -e "${RED}⚠️  WARNING: You are about to DESTROY infrastructure!${NC}"
            echo -e "${YELLOW}This will delete all resources in $ENVIRONMENT environment.${NC}"
            read -p "Type 'destroy' to confirm: " -r
            if [[ $REPLY != "destroy" ]]; then
                echo -e "${YELLOW}Destruction cancelled${NC}"
                exit 0
            fi
            terraform destroy -var-file="${ENVIRONMENT}.tfvars" -var="db_password=$DB_PASSWORD" -auto-approve
            check_success "Terraform destroy"
            ;;
    esac
    
    cd ..
}

# Function to setup Kubernetes access
setup_kubernetes_access() {
    if [ "$ACTION" = "apply" ]; then
        print_step "Setting up Kubernetes Access"
        
        # Get cluster name from Terraform output
        CLUSTER_NAME=$(cd $TERRAFORM_DIR && terraform output -raw cluster_name)
        
        # Update kubeconfig
        aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
        check_success "Kubernetes configuration update"
        
        # Test connectivity
        kubectl get nodes
        check_success "Kubernetes connectivity test"
        
        echo ""
    fi
}

# Function to deploy Kubernetes addons
deploy_kubernetes_addons() {
    if [ "$ACTION" = "apply" ]; then
        print_step "Deploying Kubernetes Add-ons"
        
        # Install External Secrets Operator
        echo "Installing External Secrets Operator..."
        helm repo add external-secrets https://charts.external-secrets.io
        helm repo update
        
        helm upgrade --install external-secrets external-secrets/external-secrets \
            --namespace external-secrets-system \
            --create-namespace \
            --wait
        check_success "External Secrets Operator installation"
        
        # Install AWS Load Balancer Controller
        echo "Installing AWS Load Balancer Controller..."
        helm repo add eks https://aws.github.io/eks-charts
        helm repo update
        
        CLUSTER_NAME=$(cd $TERRAFORM_DIR && terraform output -raw cluster_name)
        
        helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
            --namespace kube-system \
            --set clusterName=$CLUSTER_NAME \
            --set serviceAccount.create=false \
            --set serviceAccount.name=aws-load-balancer-controller \
            --wait
        check_success "AWS Load Balancer Controller installation"
        
        echo ""
    fi
}

# Function to display outputs
display_outputs() {
    if [ "$ACTION" = "apply" ]; then
        print_step "Deployment Outputs"
        
        cd $TERRAFORM_DIR
        
        echo -e "${GREEN}🎉 Infrastructure deployed successfully!${NC}"
        echo ""
        echo "📊 Key Information:"
        echo "  • Cluster Name: $(terraform output -raw cluster_name)"
        echo "  • Cluster Endpoint: $(terraform output -raw cluster_endpoint)"
        echo "  • RDS Endpoint: $(terraform output -raw rds_instance_endpoint)"
        echo "  • Redis Endpoint: $(terraform output -raw elasticache_cluster_address)"
        echo ""
        echo "📝 Next Steps:"
        echo "  1. Deploy the HRMS application using GitHub Actions"
        echo "  2. Configure DNS records for your domain"
        echo "  3. Set up monitoring and alerting"
        echo "  4. Configure backup policies"
        echo ""
        echo "🔧 Useful Commands:"
        echo "  • View pods: kubectl get pods -A"
        echo "  • View services: kubectl get svc -A"
        echo "  • View ingress: kubectl get ingress -A"
        echo ""
        
        cd ..
    fi
}

# Main execution
main() {
    # Check for required environment variables
    if [ -z "$DB_PASSWORD" ]; then
        echo -e "${YELLOW}⚠️  Database password not set${NC}"
        read -s -p "Enter database password: " DB_PASSWORD
        echo ""
        export DB_PASSWORD
    fi
    
    check_prerequisites
    
    if [ "$ACTION" != "destroy" ]; then
        setup_terraform_backend
    fi
    
    run_terraform
    
    if [ "$ACTION" = "apply" ]; then
        setup_kubernetes_access
        deploy_kubernetes_addons
        display_outputs
    fi
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo -e "${BLUE}Usage: $0 <environment> <action> [aws-region]${NC}"
    echo ""
    echo "Arguments:"
    echo "  environment  : staging | production"
    echo "  action      : plan | apply | destroy"
    echo "  aws-region  : AWS region (default: us-east-1)"
    echo ""
    echo "Examples:"
    echo "  $0 staging plan"
    echo "  $0 staging apply"
    echo "  $0 production plan"
    echo "  $0 production apply us-west-2"
    echo ""
    exit 1
fi

# Run main function
main
