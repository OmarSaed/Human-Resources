# AWS Infrastructure Variables for HRMS

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "hrms"
}

variable "db_password" {
  description = "Password for the RDS instance"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "hrms.company.com"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for ALB"
  type        = string
  default     = ""
}

variable "waf_arn" {
  description = "ARN of the WAF WebACL for production ALB"
  type        = string
  default     = ""
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for RDS and other critical resources"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "RDS backup retention period in days"
  type        = number
  default     = 7
}

variable "monitoring_enabled" {
  description = "Enable detailed monitoring"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "node_group_capacity" {
  description = "EKS node group capacity configuration"
  type = object({
    min_size     = number
    max_size     = number
    desired_size = number
  })
  default = {
    min_size     = 2
    max_size     = 5
    desired_size = 3
  }
}

variable "spot_node_group_capacity" {
  description = "EKS spot node group capacity configuration"
  type = object({
    min_size     = number
    max_size     = number
    desired_size = number
  })
  default = {
    min_size     = 0
    max_size     = 3
    desired_size = 1
  }
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.medium"
}

variable "msk_instance_type" {
  description = "MSK Kafka instance type"
  type        = string
  default     = "kafka.m5.large"
}

variable "msk_ebs_volume_size" {
  description = "MSK EBS volume size in GB"
  type        = number
  default     = 50
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single shared NAT Gateway across all private networks"
  type        = bool
  default     = false
}

variable "enable_vpn_gateway" {
  description = "Enable VPN Gateway"
  type        = bool
  default     = false
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

variable "additional_aws_auth_users" {
  description = "Additional AWS users to add to the aws-auth configmap"
  type = list(object({
    userarn  = string
    username = string
    groups   = list(string)
  }))
  default = []
}

variable "additional_aws_auth_roles" {
  description = "Additional AWS roles to add to the aws-auth configmap"
  type = list(object({
    rolearn  = string
    username = string
    groups   = list(string)
  }))
  default = []
}

variable "cluster_addons" {
  description = "Map of cluster addon configurations to enable for the cluster"
  type = map(object({
    addon_version     = optional(string)
    resolve_conflicts = optional(string)
  }))
  default = {
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
}

variable "enable_secrets_manager" {
  description = "Enable AWS Secrets Manager for storing application secrets"
  type        = bool
  default     = true
}

variable "enable_parameter_store" {
  description = "Enable AWS Systems Manager Parameter Store for configuration"
  type        = bool
  default     = true
}

variable "s3_bucket_force_destroy" {
  description = "Force destroy S3 bucket (useful for testing environments)"
  type        = bool
  default     = false
}

variable "create_s3_buckets" {
  description = "Create S3 buckets for application storage"
  type        = bool
  default     = true
}

variable "s3_versioning_enabled" {
  description = "Enable S3 bucket versioning"
  type        = bool
  default     = true
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default = {
    Terraform   = "true"
    Project     = "HRMS"
    Environment = "unknown"
  }
}
