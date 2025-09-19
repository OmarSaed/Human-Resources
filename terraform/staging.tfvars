# Staging Environment Configuration for HRMS

# Basic Configuration
environment  = "staging"
aws_region   = "us-east-1"
project_name = "hrms"

# Domain Configuration
domain_name     = "staging.hrms.company.com"
certificate_arn = ""  # Will be created automatically

# EKS Configuration
node_group_capacity = {
  min_size     = 2
  max_size     = 5
  desired_size = 3
}

spot_node_group_capacity = {
  min_size     = 0
  max_size     = 3
  desired_size = 1
}

# RDS Configuration
rds_instance_class     = "db.t3.medium"
rds_allocated_storage  = 20
backup_retention_period = 3
enable_deletion_protection = false

# ElastiCache Configuration
elasticache_node_type = "cache.r6g.medium"

# MSK Configuration
msk_instance_type    = "kafka.m5.large"
msk_ebs_volume_size  = 50

# Network Configuration
enable_nat_gateway   = true
single_nat_gateway   = true  # Use single NAT for cost optimization
enable_vpn_gateway   = false
enable_flow_logs     = false

# S3 Configuration
create_s3_buckets     = true
s3_versioning_enabled = true
s3_bucket_force_destroy = true  # Allow destruction for testing

# Monitoring Configuration
monitoring_enabled  = true
log_retention_days  = 7

# Security Configuration
enable_secrets_manager   = true
enable_parameter_store   = true

# Additional Tags
tags = {
  Environment = "staging"
  Project     = "HRMS"
  Terraform   = "true"
  CostCenter  = "Engineering"
  Owner       = "Platform Team"
}
