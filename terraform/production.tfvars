# Production Environment Configuration for HRMS

# Basic Configuration
environment  = "production"
aws_region   = "us-east-1"
project_name = "hrms"

# Domain Configuration
domain_name     = "hrms.company.com"
certificate_arn = ""  # Will be created automatically or specify existing ARN
waf_arn        = ""  # Specify WAF WebACL ARN for production

# EKS Configuration
node_group_capacity = {
  min_size     = 3
  max_size     = 10
  desired_size = 6
}

spot_node_group_capacity = {
  min_size     = 0
  max_size     = 5
  desired_size = 2
}

# RDS Configuration
rds_instance_class     = "db.r6g.xlarge"
rds_allocated_storage  = 200
backup_retention_period = 30
enable_deletion_protection = true

# ElastiCache Configuration
elasticache_node_type = "cache.r6g.xlarge"

# MSK Configuration
msk_instance_type    = "kafka.m5.2xlarge"
msk_ebs_volume_size  = 200

# Network Configuration
enable_nat_gateway   = true
single_nat_gateway   = false  # Use NAT Gateway per AZ for HA
enable_vpn_gateway   = false
enable_flow_logs     = true

# S3 Configuration
create_s3_buckets     = true
s3_versioning_enabled = true
s3_bucket_force_destroy = false  # Prevent accidental deletion

# Monitoring Configuration
monitoring_enabled  = true
log_retention_days  = 30

# Security Configuration
enable_secrets_manager   = true
enable_parameter_store   = true

# Additional AWS Auth Users (Update with actual ARNs)
additional_aws_auth_users = [
  # {
  #   userarn  = "arn:aws:iam::ACCOUNT_ID:user/admin1"
  #   username = "admin1"
  #   groups   = ["system:masters"]
  # }
]

additional_aws_auth_roles = [
  # {
  #   rolearn  = "arn:aws:iam::ACCOUNT_ID:role/ProductionAdminRole"
  #   username = "production-admin"
  #   groups   = ["system:masters"]
  # }
]

# Cluster Add-ons with specific versions for production
cluster_addons = {
  coredns = {
    addon_version     = "v1.10.1-eksbuild.5"
    resolve_conflicts = "OVERWRITE"
  }
  kube-proxy = {
    addon_version     = "v1.28.2-eksbuild.2"
    resolve_conflicts = "OVERWRITE"
  }
  vpc-cni = {
    addon_version     = "v1.15.1-eksbuild.1"
    resolve_conflicts = "OVERWRITE"
  }
  aws-ebs-csi-driver = {
    addon_version     = "v1.24.0-eksbuild.1"
    resolve_conflicts = "OVERWRITE"
  }
}

# Additional Tags
tags = {
  Environment = "production"
  Project     = "HRMS"
  Terraform   = "true"
  CostCenter  = "Business"
  Owner       = "Platform Team"
  Backup      = "required"
  Monitoring  = "critical"
}
