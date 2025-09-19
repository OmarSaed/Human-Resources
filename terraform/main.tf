# HRMS AWS Infrastructure
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket = "hrms-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
    
    dynamodb_table = "hrms-terraform-locks"
    encrypt        = true
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "HRMS"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "Platform Team"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

data "aws_caller_identity" "current" {}

# Configure Kubernetes provider
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
  }
}

# Configure Helm provider
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name]
    }
  }
}

# Local variables
locals {
  name            = "hrms-${var.environment}"
  cluster_version = "1.28"
  
  vpc_cidr = "10.0.0.0/16"
  azs      = slice(data.aws_availability_zones.available.names, 0, 3)

  tags = {
    Example    = local.name
    GithubRepo = "hrms"
    GithubOrg  = "company"
  }
}

################################################################################
# VPC
################################################################################

module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = local.name
  cidr = local.vpc_cidr

  azs             = local.azs
  private_subnets = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 4, k)]
  public_subnets  = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 8, k + 48)]
  intra_subnets   = [for k, v in local.azs : cidrsubnet(local.vpc_cidr, 8, k + 52)]

  enable_nat_gateway = true
  single_nat_gateway = var.environment == "staging"
  enable_vpn_gateway = false

  enable_dns_hostnames = true
  enable_dns_support   = true

  # Kubernetes tags
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }

  tags = local.tags
}

################################################################################
# EKS Cluster
################################################################################

module "eks" {
  source = "terraform-aws-modules/eks/aws"

  cluster_name                   = local.name
  cluster_version                = local.cluster_version
  cluster_endpoint_public_access = true

  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.intra_subnets

  # EKS Managed Node Group(s)
  eks_managed_node_group_defaults = {
    instance_types = ["m6i.large", "m5.large", "m5n.large", "m5zn.large"]
    
    attach_cluster_primary_security_group = true
  }

  eks_managed_node_groups = {
    main = {
      name = "main-node-group"
      
      min_size     = var.environment == "production" ? 3 : 2
      max_size     = var.environment == "production" ? 10 : 5
      desired_size = var.environment == "production" ? 6 : 3

      instance_types = var.environment == "production" ? ["m6i.xlarge"] : ["m6i.large"]
      capacity_type  = "ON_DEMAND"

      labels = {
        Environment = var.environment
        NodeGroup   = "main"
      }

      taints = []

      update_config = {
        max_unavailable_percentage = 33
      }

      tags = {
        ExtraTag = "EKS managed node group"
      }
    }

    spot = {
      name = "spot-node-group"
      
      min_size     = 0
      max_size     = var.environment == "production" ? 5 : 3
      desired_size = var.environment == "production" ? 2 : 1

      instance_types = ["m5.large", "m5a.large", "m5ad.large", "m5d.large"]
      capacity_type  = "SPOT"

      labels = {
        Environment = var.environment
        NodeGroup   = "spot"
      }

      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }

  # aws-auth configmap
  manage_aws_auth_configmap = true

  aws_auth_roles = [
    {
      rolearn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/AWSReservedSSO_AdministratorAccess_*"
      username = "admin"
      groups   = ["system:masters"]
    },
  ]

  aws_auth_users = []
  aws_auth_accounts = []

  tags = local.tags
}

################################################################################
# RDS Database
################################################################################

module "rds" {
  source = "terraform-aws-modules/rds/aws"

  identifier = "${local.name}-postgres"

  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = var.environment == "production" ? "db.t3.large" : "db.t3.medium"
  allocated_storage = var.environment == "production" ? 100 : 20
  storage_encrypted = true

  db_name  = "hrms"
  username = "postgres"
  password = var.db_password
  port     = "5432"

  vpc_security_group_ids = [module.security_group_rds.security_group_id]

  maintenance_window = "Mon:00:00-Mon:03:00"
  backup_window      = "03:00-06:00"

  # Enhanced Monitoring
  monitoring_interval    = "60"
  monitoring_role_name   = "${local.name}-rds-monitoring-role"
  create_monitoring_role = true

  tags = local.tags

  # DB subnet group
  create_db_subnet_group = true
  subnet_ids             = module.vpc.private_subnets

  # Snapshot name upon DB deletion
  skip_final_snapshot = var.environment != "production"
  deletion_protection = var.environment == "production"

  # DB parameter group
  family = "postgres15"

  # DB option group
  major_engine_version = "15"

  # Database Deletion Protection
  delete_automated_backups = true

  parameters = [
    {
      name  = "autovacuum"
      value = 1
    },
    {
      name  = "client_encoding"
      value = "utf8"
    }
  ]

  depends_on = [module.vpc]
}

################################################################################
# ElastiCache Redis
################################################################################

module "elasticache" {
  source = "terraform-aws-modules/elasticache/aws"

  cluster_id      = "${local.name}-redis"
  description     = "HRMS Redis cluster"
  node_type       = var.environment == "production" ? "cache.r6g.large" : "cache.r6g.medium"
  num_cache_nodes = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379

  # Security
  security_group_ids = [module.security_group_elasticache.security_group_id]
  subnet_group_name  = aws_elasticache_subnet_group.redis.name

  # Maintenance
  maintenance_window         = "sun:05:00-sun:09:00"
  snapshot_retention_limit   = var.environment == "production" ? 7 : 1
  snapshot_window           = "09:10-10:10"
  apply_immediately         = var.environment != "production"

  tags = local.tags
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${local.name}-redis-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = local.tags
}

################################################################################
# MSK (Managed Streaming for Kafka)
################################################################################

resource "aws_msk_cluster" "kafka" {
  cluster_name           = "${local.name}-kafka"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = var.environment == "production" ? 6 : 3

  broker_node_group_info {
    instance_type   = var.environment == "production" ? "kafka.m5.xlarge" : "kafka.m5.large"
    client_subnets  = module.vpc.private_subnets
    security_groups = [module.security_group_msk.security_group_id]
    storage_info {
      ebs_storage_info {
        volume_size = var.environment == "production" ? 100 : 50
      }
    }
  }

  encryption_info {
    encryption_at_rest_kms_key_id = aws_kms_key.msk.arn
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.kafka.arn
    revision = aws_msk_configuration.kafka.latest_revision
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.msk.name
      }
    }
  }

  tags = local.tags
}

resource "aws_msk_configuration" "kafka" {
  kafka_versions = ["3.5.1"]
  name           = "${local.name}-kafka-config"

  server_properties = <<PROPERTIES
auto.create.topics.enable = true
default.replication.factor = ${var.environment == "production" ? 3 : 2}
min.insync.replicas = ${var.environment == "production" ? 2 : 1}
num.partitions = 8
offsets.topic.replication.factor = ${var.environment == "production" ? 3 : 2}
transaction.state.log.replication.factor = ${var.environment == "production" ? 3 : 2}
transaction.state.log.min.isr = ${var.environment == "production" ? 2 : 1}
log.retention.hours = 168
log.segment.bytes = 1073741824
log.retention.check.interval.ms = 300000
num.network.threads = 8
num.io.threads = 8
socket.send.buffer.bytes = 102400
socket.receive.buffer.bytes = 102400
socket.request.max.bytes = 104857600
num.recovery.threads.per.data.dir = 1
offsets.topic.num.partitions = 50
group.initial.rebalance.delay.ms = 0
PROPERTIES
}

resource "aws_kms_key" "msk" {
  description = "KMS key for MSK cluster encryption"
  
  tags = local.tags
}

resource "aws_cloudwatch_log_group" "msk" {
  name              = "/aws/msk/${local.name}"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = local.tags
}

################################################################################
# Security Groups
################################################################################

module "security_group_rds" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.name}-rds"
  description = "Security group for RDS database"
  vpc_id      = module.vpc.vpc_id

  ingress_with_source_security_group_id = [
    {
      from_port                = 5432
      to_port                  = 5432
      protocol                 = "tcp"
      description              = "PostgreSQL access from EKS"
      source_security_group_id = module.eks.cluster_primary_security_group_id
    },
  ]

  tags = local.tags
}

module "security_group_elasticache" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.name}-elasticache"
  description = "Security group for ElastiCache Redis"
  vpc_id      = module.vpc.vpc_id

  ingress_with_source_security_group_id = [
    {
      from_port                = 6379
      to_port                  = 6379
      protocol                 = "tcp"
      description              = "Redis access from EKS"
      source_security_group_id = module.eks.cluster_primary_security_group_id
    },
  ]

  tags = local.tags
}

module "security_group_msk" {
  source = "terraform-aws-modules/security-group/aws"

  name        = "${local.name}-msk"
  description = "Security group for MSK Kafka cluster"
  vpc_id      = module.vpc.vpc_id

  ingress_with_source_security_group_id = [
    {
      from_port                = 9092
      to_port                  = 9092
      protocol                 = "tcp"
      description              = "Kafka plaintext access from EKS"
      source_security_group_id = module.eks.cluster_primary_security_group_id
    },
    {
      from_port                = 9094
      to_port                  = 9094
      protocol                 = "tcp"
      description              = "Kafka TLS access from EKS"
      source_security_group_id = module.eks.cluster_primary_security_group_id
    },
    {
      from_port                = 2181
      to_port                  = 2181
      protocol                 = "tcp"
      description              = "Zookeeper access from EKS"
      source_security_group_id = module.eks.cluster_primary_security_group_id
    },
  ]

  tags = local.tags
}
