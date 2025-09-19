# Outputs for HRMS AWS Infrastructure

################################################################################
# VPC
################################################################################

output "vpc_id" {
  description = "ID of the VPC where resources are created"
  value       = module.vpc.vpc_id
}

output "vpc_arn" {
  description = "The ARN of the VPC"
  value       = module.vpc.vpc_arn
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "intra_subnets" {
  description = "List of IDs of intra subnets"
  value       = module.vpc.intra_subnets
}

################################################################################
# EKS Cluster
################################################################################

output "cluster_arn" {
  description = "The Amazon Resource Name (ARN) of the cluster"
  value       = module.eks.cluster_arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "cluster_endpoint" {
  description = "Endpoint for your Kubernetes API server"
  value       = module.eks.cluster_endpoint
}

output "cluster_id" {
  description = "The ID of the EKS cluster. Note: currently a value is returned only for local EKS clusters created on Outposts"
  value       = module.eks.cluster_id
}

output "cluster_name" {
  description = "The name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

output "cluster_platform_version" {
  description = "Platform version for the EKS cluster"
  value       = module.eks.cluster_platform_version
}

output "cluster_status" {
  description = "Status of the EKS cluster. One of `CREATING`, `ACTIVE`, `DELETING`, `FAILED`"
  value       = module.eks.cluster_status
}

output "cluster_security_group_id" {
  description = "Cluster security group that was created by Amazon EKS for the cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_primary_security_group_id" {
  description = "The cluster primary security group ID created by the EKS cluster on 1.14 or later"
  value       = module.eks.cluster_primary_security_group_id
}

output "oidc_provider_arn" {
  description = "The ARN of the OIDC Provider if enabled"
  value       = module.eks.oidc_provider_arn
}

################################################################################
# EKS Managed Node Group
################################################################################

output "eks_managed_node_groups" {
  description = "Map of attribute maps for all EKS managed node groups created"
  value       = module.eks.eks_managed_node_groups
}

output "eks_managed_node_groups_autoscaling_group_names" {
  description = "List of the autoscaling group names created by EKS managed node groups"
  value       = module.eks.eks_managed_node_groups_autoscaling_group_names
}

################################################################################
# RDS
################################################################################

output "rds_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "rds_instance_id" {
  description = "RDS instance ID"
  value       = module.rds.db_instance_identifier
}

output "rds_instance_port" {
  description = "RDS instance port"
  value       = module.rds.db_instance_port
}

output "rds_instance_name" {
  description = "RDS instance database name"
  value       = module.rds.db_instance_name
}

output "rds_instance_username" {
  description = "RDS instance root username"
  value       = module.rds.db_instance_username
  sensitive   = true
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = module.security_group_rds.security_group_id
}

################################################################################
# ElastiCache
################################################################################

output "elasticache_cluster_id" {
  description = "ElastiCache cluster ID"
  value       = module.elasticache.cluster_id
}

output "elasticache_cluster_address" {
  description = "DNS name of the ElastiCache cluster without the port appended"
  value       = module.elasticache.cluster_address
  sensitive   = true
}

output "elasticache_cluster_port" {
  description = "Port number on which the ElastiCache cluster accepts connections"
  value       = module.elasticache.cluster_port
}

output "elasticache_security_group_id" {
  description = "ID of the ElastiCache security group"
  value       = module.security_group_elasticache.security_group_id
}

################################################################################
# MSK (Kafka)
################################################################################

output "msk_cluster_arn" {
  description = "Amazon Resource Name (ARN) of the MSK cluster"
  value       = aws_msk_cluster.kafka.arn
}

output "msk_cluster_name" {
  description = "MSK cluster name"
  value       = aws_msk_cluster.kafka.cluster_name
}

output "msk_bootstrap_brokers" {
  description = "Plaintext connection host:port pairs"
  value       = aws_msk_cluster.kafka.bootstrap_brokers
  sensitive   = true
}

output "msk_bootstrap_brokers_tls" {
  description = "TLS connection host:port pairs"
  value       = aws_msk_cluster.kafka.bootstrap_brokers_tls
  sensitive   = true
}

output "msk_zookeeper_connect_string" {
  description = "A comma separated list of one or more hostname:port pairs to use to connect to the Apache Zookeeper cluster"
  value       = aws_msk_cluster.kafka.zookeeper_connect_string
  sensitive   = true
}

output "msk_security_group_id" {
  description = "ID of the MSK security group"
  value       = module.security_group_msk.security_group_id
}

################################################################################
# S3 Buckets
################################################################################

output "s3_bucket_documents" {
  description = "Name of the S3 bucket for document storage"
  value       = try(module.s3_buckets[0].s3_bucket_id, "")
}

output "s3_bucket_backups" {
  description = "Name of the S3 bucket for backups"
  value       = try(module.s3_buckets[1].s3_bucket_id, "")
}

output "s3_bucket_logs" {
  description = "Name of the S3 bucket for logs"
  value       = try(module.s3_buckets[2].s3_bucket_id, "")
}

################################################################################
# Secrets Manager
################################################################################

output "secrets_manager_database_arn" {
  description = "ARN of the database secrets in AWS Secrets Manager"
  value       = try(aws_secretsmanager_secret.database[0].arn, "")
}

output "secrets_manager_jwt_arn" {
  description = "ARN of the JWT secrets in AWS Secrets Manager"
  value       = try(aws_secretsmanager_secret.jwt[0].arn, "")
}

output "secrets_manager_redis_arn" {
  description = "ARN of the Redis secrets in AWS Secrets Manager"
  value       = try(aws_secretsmanager_secret.redis[0].arn, "")
}

################################################################################
# IAM Roles
################################################################################

output "external_secrets_role_arn" {
  description = "ARN of the IAM role for External Secrets Operator"
  value       = try(aws_iam_role.external_secrets[0].arn, "")
}

output "aws_load_balancer_controller_role_arn" {
  description = "ARN of the IAM role for AWS Load Balancer Controller"
  value       = try(aws_iam_role.aws_load_balancer_controller[0].arn, "")
}

################################################################################
# Route53
################################################################################

output "route53_zone_id" {
  description = "Route53 zone ID"
  value       = try(aws_route53_zone.main[0].zone_id, "")
}

output "route53_name_servers" {
  description = "Route53 zone name servers"
  value       = try(aws_route53_zone.main[0].name_servers, [])
}

################################################################################
# CloudWatch
################################################################################

output "cloudwatch_log_group_names" {
  description = "Names of CloudWatch log groups created"
  value = {
    msk                = aws_cloudwatch_log_group.msk.name
    eks_cluster        = try(aws_cloudwatch_log_group.eks[0].name, "")
    application_logs   = try(aws_cloudwatch_log_group.application[0].name, "")
  }
}

################################################################################
# Application Configuration
################################################################################

output "application_config" {
  description = "Configuration values needed for the HRMS application"
  value = {
    aws_region = var.aws_region
    environment = var.environment
    
    # Database
    database = {
      host     = module.rds.db_instance_endpoint
      port     = module.rds.db_instance_port
      name     = module.rds.db_instance_name
      username = module.rds.db_instance_username
    }
    
    # Redis
    redis = {
      host = module.elasticache.cluster_address
      port = module.elasticache.cluster_port
    }
    
    # Kafka
    kafka = {
      bootstrap_servers = aws_msk_cluster.kafka.bootstrap_brokers_tls
      zookeeper_connect = aws_msk_cluster.kafka.zookeeper_connect_string
    }
    
    # S3 Buckets
    storage = {
      documents_bucket = try(module.s3_buckets[0].s3_bucket_id, "")
      backups_bucket   = try(module.s3_buckets[1].s3_bucket_id, "")
      logs_bucket      = try(module.s3_buckets[2].s3_bucket_id, "")
    }
    
    # Kubernetes
    kubernetes = {
      cluster_name                        = module.eks.cluster_name
      cluster_endpoint                    = module.eks.cluster_endpoint
      cluster_certificate_authority_data = module.eks.cluster_certificate_authority_data
      oidc_provider_arn                   = module.eks.oidc_provider_arn
    }
  }
  sensitive = true
}
