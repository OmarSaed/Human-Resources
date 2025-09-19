# Additional AWS Services for HRMS

################################################################################
# S3 Buckets
################################################################################

# S3 Buckets for different purposes
locals {
  s3_buckets = var.create_s3_buckets ? [
    {
      name        = "${local.name}-documents"
      purpose     = "documents"
      versioning  = var.s3_versioning_enabled
      encryption  = true
      lifecycle   = true
    },
    {
      name        = "${local.name}-backups"
      purpose     = "backups"
      versioning  = true
      encryption  = true
      lifecycle   = true
    },
    {
      name        = "${local.name}-logs"
      purpose     = "logs"
      versioning  = false
      encryption  = true
      lifecycle   = true
    }
  ] : []
}

module "s3_buckets" {
  source = "terraform-aws-modules/s3-bucket/aws"
  count  = length(local.s3_buckets)

  bucket = local.s3_buckets[count.index].name
  
  # Bucket ownership
  control_object_ownership = true
  object_ownership         = "BucketOwnerPreferred"

  # Versioning
  versioning = {
    enabled = local.s3_buckets[count.index].versioning
  }

  # Server-side encryption
  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }

  # Lifecycle configuration
  lifecycle_rule = local.s3_buckets[count.index].lifecycle ? [
    {
      id     = "delete_old_versions"
      status = "Enabled"

      noncurrent_version_expiration = {
        noncurrent_days = var.environment == "production" ? 90 : 30
      }

      expiration = local.s3_buckets[count.index].purpose == "logs" ? {
        days = var.environment == "production" ? 365 : 90
      } : null
    }
  ] : []

  # Block public access
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  # Force destroy (only for non-production)
  force_destroy = var.environment != "production" ? var.s3_bucket_force_destroy : false

  tags = merge(local.tags, {
    Purpose = local.s3_buckets[count.index].purpose
  })
}

# S3 bucket for ALB access logs
resource "aws_s3_bucket" "alb_logs" {
  bucket        = "${local.name}-alb-logs"
  force_destroy = var.environment != "production" ? var.s3_bucket_force_destroy : false

  tags = local.tags
}

resource "aws_s3_bucket_versioning" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "delete_old_logs"
    status = "Enabled"

    expiration {
      days = var.environment == "production" ? 90 : 30
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# S3 bucket policy for ALB logs
data "aws_elb_service_account" "main" {}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = data.aws_elb_service_account.main.arn
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/${local.name}/*"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/${local.name}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.alb_logs.arn
      }
    ]
  })
}

################################################################################
# AWS Secrets Manager
################################################################################

# Database secrets
resource "aws_secretsmanager_secret" "database" {
  count       = var.enable_secrets_manager ? 1 : 0
  name        = "hrms/${var.environment}/database"
  description = "Database credentials for HRMS ${var.environment}"

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "database" {
  count     = var.enable_secrets_manager ? 1 : 0
  secret_id = aws_secretsmanager_secret.database[0].id
  secret_string = jsonencode({
    username = module.rds.db_instance_username
    password = var.db_password
    host     = module.rds.db_instance_endpoint
    port     = module.rds.db_instance_port
    dbname   = module.rds.db_instance_name
  })
}

# JWT secrets
resource "aws_secretsmanager_secret" "jwt" {
  count       = var.enable_secrets_manager ? 1 : 0
  name        = "hrms/${var.environment}/jwt"
  description = "JWT secrets for HRMS ${var.environment}"

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "jwt" {
  count     = var.enable_secrets_manager ? 1 : 0
  secret_id = aws_secretsmanager_secret.jwt[0].id
  secret_string = jsonencode({
    secret         = random_password.jwt_secret.result
    refresh_secret = random_password.jwt_refresh_secret.result
    encryption_key = random_password.encryption_key.result
  })
}

# Redis secrets
resource "aws_secretsmanager_secret" "redis" {
  count       = var.enable_secrets_manager ? 1 : 0
  name        = "hrms/${var.environment}/redis"
  description = "Redis connection details for HRMS ${var.environment}"

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "redis" {
  count     = var.enable_secrets_manager ? 1 : 0
  secret_id = aws_secretsmanager_secret.redis[0].id
  secret_string = jsonencode({
    host     = module.elasticache.cluster_address
    port     = module.elasticache.cluster_port
    password = ""  # ElastiCache Redis without auth token
  })
}

# AWS credentials for application
resource "aws_secretsmanager_secret" "aws_credentials" {
  count       = var.enable_secrets_manager ? 1 : 0
  name        = "hrms/${var.environment}/aws"
  description = "AWS credentials for HRMS ${var.environment}"

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "aws_credentials" {
  count     = var.enable_secrets_manager ? 1 : 0
  secret_id = aws_secretsmanager_secret.aws_credentials[0].id
  secret_string = jsonencode({
    access_key_id     = aws_iam_access_key.app_user[0].id
    secret_access_key = aws_iam_access_key.app_user[0].secret
    s3_bucket         = var.create_s3_buckets ? module.s3_buckets[0].s3_bucket_id : ""
    region            = var.aws_region
  })
}

# Email configuration
resource "aws_secretsmanager_secret" "email" {
  count       = var.enable_secrets_manager ? 1 : 0
  name        = "hrms/${var.environment}/email"
  description = "Email configuration for HRMS ${var.environment}"

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "email" {
  count     = var.enable_secrets_manager ? 1 : 0
  secret_id = aws_secretsmanager_secret.email[0].id
  secret_string = jsonencode({
    smtp_user     = "noreply@${var.domain_name}"
    smtp_password = "change-me-in-production"
    from_address  = "noreply@${var.domain_name}"
  })
}

# Random passwords for JWT secrets
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = true
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

################################################################################
# IAM Roles and Policies
################################################################################

# IAM role for External Secrets Operator
resource "aws_iam_role" "external_secrets" {
  count = var.enable_secrets_manager ? 1 : 0
  name  = "${local.name}-external-secrets-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:external-secrets-system:external-secrets"
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy" "external_secrets" {
  count = var.enable_secrets_manager ? 1 : 0
  name  = "${local.name}-external-secrets-policy"
  role  = aws_iam_role.external_secrets[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.database[0].arn,
          aws_secretsmanager_secret.jwt[0].arn,
          aws_secretsmanager_secret.redis[0].arn,
          aws_secretsmanager_secret.aws_credentials[0].arn,
          aws_secretsmanager_secret.email[0].arn
        ]
      }
    ]
  })
}

# IAM role for AWS Load Balancer Controller
resource "aws_iam_role" "aws_load_balancer_controller" {
  count = 1
  name  = "${local.name}-aws-load-balancer-controller-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = local.tags
}

# Attach AWS Load Balancer Controller policy
resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller" {
  count      = 1
  policy_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/AWSLoadBalancerControllerIAMPolicy"
  role       = aws_iam_role.aws_load_balancer_controller[0].name
}

# IAM user for application S3 access
resource "aws_iam_user" "app_user" {
  count = var.enable_secrets_manager ? 1 : 0
  name  = "${local.name}-app-user"
  path  = "/applications/"

  tags = local.tags
}

resource "aws_iam_access_key" "app_user" {
  count = var.enable_secrets_manager ? 1 : 0
  user  = aws_iam_user.app_user[0].name
}

resource "aws_iam_user_policy" "app_user_s3" {
  count = var.enable_secrets_manager && var.create_s3_buckets ? 1 : 0
  name  = "${local.name}-app-user-s3-policy"
  user  = aws_iam_user.app_user[0].name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          module.s3_buckets[0].s3_bucket_arn,
          "${module.s3_buckets[0].s3_bucket_arn}/*"
        ]
      }
    ]
  })
}

################################################################################
# CloudWatch Log Groups
################################################################################

resource "aws_cloudwatch_log_group" "eks" {
  count             = var.monitoring_enabled ? 1 : 0
  name              = "/aws/eks/${module.eks.cluster_name}/cluster"
  retention_in_days = var.log_retention_days

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "application" {
  count             = var.monitoring_enabled ? 1 : 0
  name              = "/aws/eks/${module.eks.cluster_name}/application"
  retention_in_days = var.log_retention_days

  tags = local.tags
}

################################################################################
# Route53 (Optional)
################################################################################

resource "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0
  name  = var.domain_name

  tags = local.tags
}

################################################################################
# ACM Certificate (Optional)
################################################################################

resource "aws_acm_certificate" "main" {
  count                     = var.domain_name != "" && var.certificate_arn == "" ? 1 : 0
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != "" && var.certificate_arn == "" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main[0].zone_id
}

resource "aws_acm_certificate_validation" "main" {
  count                   = var.domain_name != "" && var.certificate_arn == "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
