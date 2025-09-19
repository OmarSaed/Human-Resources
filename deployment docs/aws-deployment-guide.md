# HRMS AWS Deployment Guide 🚀

This guide provides comprehensive instructions for deploying the HRMS application to AWS using the enhanced CI/CD pipeline and Terraform infrastructure.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [AWS Infrastructure Setup](#aws-infrastructure-setup)
- [GitHub Actions Configuration](#github-actions-configuration)
- [Application Deployment](#application-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## 📜 Deployment Scripts

All deployment scripts are now consolidated in the `deployment docs/scripts/` directory. See the [Scripts README](scripts/README.md) for detailed information about each script.

**Key scripts for AWS deployment:**
- `deploy-aws-infrastructure.sh` - Infrastructure deployment with Terraform
- `build-and-push-images.sh` - Docker image build and push
- `deploy-kubernetes-production.sh` - Kubernetes application deployment

## 🔧 Prerequisites

### Required Tools

1. **AWS CLI** (v2.0+)
   ```bash
   # Install AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Configure credentials
   aws configure
   ```

2. **Terraform** (v1.0+)
   ```bash
   # Install Terraform
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

3. **kubectl** (v1.28+)
   ```bash
   # Install kubectl
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
   ```

4. **Helm** (v3.0+)
   ```bash
   # Install Helm
   curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
   ```

5. **eksctl** (for EKS management)
   ```bash
   # Install eksctl
   curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
   sudo mv /tmp/eksctl /usr/local/bin
   ```

### AWS Account Setup

1. **IAM Permissions**: Ensure your AWS user/role has the following permissions:
   - EC2 Full Access
   - EKS Full Access
   - RDS Full Access
   - ElastiCache Full Access
   - MSK Full Access
   - S3 Full Access
   - IAM Full Access
   - Secrets Manager Full Access
   - CloudWatch Full Access
   - Route53 Full Access (if using custom domain)

2. **Service Quotas**: Check AWS service quotas for:
   - VPC Elastic IPs
   - NAT Gateways
   - EKS Clusters
   - RDS Instances

## 🏗️ AWS Infrastructure Setup

### Step 1: Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd hrms

# Make deployment script executable
chmod +x "deployment docs/scripts/deploy-aws-infrastructure.sh"
```

### Step 2: Review Terraform Variables

1. **Staging Configuration** (`terraform/staging.tfvars`):
   - Cost-optimized settings
   - Smaller instance sizes
   - Single NAT Gateway
   - Short retention periods

2. **Production Configuration** (`terraform/production.tfvars`):
   - High availability setup
   - Larger instance sizes
   - Multiple NAT Gateways
   - Extended retention periods

### Step 3: Deploy Infrastructure

#### Staging Deployment
```bash
# Plan staging infrastructure
export DB_PASSWORD="your-secure-password"
"./deployment docs/scripts/deploy-aws-infrastructure.sh" staging plan

# Deploy staging infrastructure
"./deployment docs/scripts/deploy-aws-infrastructure.sh" staging apply
```

#### Production Deployment
```bash
# Plan production infrastructure
export DB_PASSWORD="your-very-secure-password"
"./deployment docs/scripts/deploy-aws-infrastructure.sh" production plan

# Deploy production infrastructure (requires confirmation)
"./deployment docs/scripts/deploy-aws-infrastructure.sh" production apply
```

### Step 4: Verify Infrastructure

```bash
# Check EKS cluster
kubectl get nodes

# Check AWS resources
aws eks list-clusters
aws rds describe-db-instances
aws elasticache describe-cache-clusters
```

## ⚙️ GitHub Actions Configuration

### Required Secrets

Configure the following secrets in your GitHub repository:

#### AWS Credentials
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
```

#### Database Credentials
```
DB_PASSWORD=your-secure-database-password
```

#### Application Secrets
```
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
ENCRYPTION_KEY=your-32-character-encryption-key
```

#### External Service Credentials
```
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your-smtp-password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Environment Protection Rules

1. **Staging Environment**:
   - No required reviewers
   - Deploy from `develop` branch

2. **Production Environment**:
   - Require 2 reviewers
   - Deploy from `main` branch only
   - Manual approval required

## 🚀 Application Deployment

### Automatic Deployment

The enhanced CI/CD pipeline automatically deploys when:

1. **Staging**: Push to `develop` branch
2. **Production**: Push to `main` branch or manual trigger

### Manual Deployment

```bash
# Trigger deployment via GitHub Actions
gh workflow run "HRMS CI/CD Pipeline" \
  --field environment=staging

# Or use the GitHub web interface
```

### Deployment Process

The pipeline performs the following steps:

1. **Code Quality & Security Checks**
   - ESLint and code formatting
   - SonarCloud analysis
   - TruffleHog secret scanning
   - Trivy container scanning

2. **Testing**
   - Unit tests with coverage
   - Integration tests
   - Database migration tests
   - End-to-end tests
   - Performance tests (production only)

3. **Build & Push**
   - Docker image builds
   - Multi-architecture support
   - Container registry push

4. **Deploy to Staging**
   - AWS Load Balancer Controller setup
   - External Secrets Operator deployment
   - Application deployment
   - Smoke tests

5. **Deploy to Production** (after staging success)
   - Blue-green deployment strategy
   - Production smoke tests
   - Traffic switching
   - Blue environment cleanup

## 📊 Monitoring and Maintenance

### Access Monitoring

```bash
# Port forward to Grafana
kubectl port-forward svc/grafana 3000:3000 -n hrms-monitoring

# Port forward to Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n hrms-monitoring

# View application logs
kubectl logs -f deployment/hrms-api-gateway -n hrms-production
```

### Database Management

```bash
# Connect to RDS instance
# Get connection details from Terraform outputs or AWS Secrets Manager

# Run database migrations manually if needed
kubectl exec -it deployment/hrms-auth-service -n hrms-production -- npm run db:migrate
```

### Scaling

```bash
# Scale application horizontally
kubectl scale deployment hrms-api-gateway --replicas=5 -n hrms-production

# Scale EKS nodes (update desired capacity)
aws eks update-nodegroup-config \
  --cluster-name hrms-production \
  --nodegroup-name main-node-group \
  --scaling-config desiredSize=8
```

### Backup and Recovery

```bash
# RDS automated backups are configured
# Manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier hrms-production-postgres \
  --db-snapshot-identifier hrms-manual-snapshot-$(date +%Y%m%d)

# S3 versioning is enabled for document storage
# ElastiCache has daily snapshots configured
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. EKS Cluster Access Issues
```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name hrms-production

# Check IAM permissions
aws sts get-caller-identity
kubectl auth can-i "*" "*" --all-namespaces
```

#### 2. Load Balancer Not Provisioning
```bash
# Check AWS Load Balancer Controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Verify security groups and subnets
kubectl describe ingress hrms-ingress -n hrms-production
```

#### 3. Database Connection Issues
```bash
# Check security groups
aws ec2 describe-security-groups --group-ids <rds-security-group-id>

# Test connectivity from pod
kubectl run test-pod --image=postgres:15 -it --rm -- bash
# Then: psql -h <rds-endpoint> -U postgres -d hrms
```

#### 4. External Secrets Not Working
```bash
# Check External Secrets Operator
kubectl logs -n external-secrets-system deployment/external-secrets

# Verify IAM role and permissions
kubectl describe secretstore aws-secretsmanager -n hrms-production
```

### Debug Commands

```bash
# Check all resources in namespace
kubectl get all -n hrms-production

# Describe problematic resources
kubectl describe pod <pod-name> -n hrms-production
kubectl describe ingress hrms-ingress -n hrms-production

# Check events
kubectl get events -n hrms-production --sort-by='.lastTimestamp'

# View resource usage
kubectl top nodes
kubectl top pods -n hrms-production
```

### Log Analysis

```bash
# Application logs
kubectl logs -f deployment/hrms-api-gateway -n hrms-production

# Previous container logs (if crashed)
kubectl logs deployment/hrms-api-gateway -n hrms-production --previous

# Multi-container pod logs
kubectl logs -f deployment/hrms-auth-service -c auth-service -n hrms-production
```

## 🔒 Security Best Practices

### Secrets Management
- All secrets stored in AWS Secrets Manager
- Kubernetes secrets created via External Secrets Operator
- Regular secret rotation (manually or automated)

### Network Security
- Private subnets for all application components
- Security groups with minimal required access
- WAF protection for production ALB

### Access Control
- RBAC configured for different user roles
- Service accounts with minimal required permissions
- Regular access reviews

### Compliance
- Encryption at rest for all data stores
- Encryption in transit via TLS
- Audit logging enabled
- Regular security scans

## 📈 Performance Optimization

### Resource Limits
- CPU and memory limits set for all pods
- Horizontal Pod Autoscaler configured
- Cluster Autoscaler for node scaling

### Database Optimization
- Connection pooling configured
- Read replicas for read-heavy workloads
- Performance Insights enabled

### Caching Strategy
- Redis for session and application caching
- CloudFront CDN for static assets
- HTTP caching headers configured

## 🆘 Disaster Recovery

### Backup Strategy
- RDS automated backups (30 days retention)
- S3 cross-region replication
- Kubernetes cluster backup via Velero

### Recovery Procedures
1. **Database Recovery**: Restore from RDS snapshot
2. **Application Recovery**: Redeploy from latest images
3. **Data Recovery**: Restore from S3 backups

### Testing
- Regular disaster recovery drills
- Backup verification procedures
- RTO/RPO monitoring

## 📞 Support

For issues and questions:
- Create GitHub issues for bugs
- Check CloudWatch logs for application errors
- Review Kubernetes events for deployment issues
- Contact the Platform Team for infrastructure issues

---

## 📝 Additional Resources

- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [External Secrets Operator](https://external-secrets.io/)
- [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/)
