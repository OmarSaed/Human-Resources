#!/bin/bash

# HRMS Environment Setup Script
echo "🚀 Setting up HRMS Docker Environment..."

# Check if .env exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backup created as .env.backup"
    cp .env .env.backup
fi

# Create .env file
cat > .env << 'EOF'
# =============================================================================
# HRMS Environment Configuration - Development
# =============================================================================

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
NODE_ENV=development
HOST=0.0.0.0

# =============================================================================
# SERVICE PORTS
# =============================================================================
API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
EMPLOYEE_SERVICE_PORT=3002
TIME_ATTENDANCE_SERVICE_PORT=3003
PERFORMANCE_SERVICE_PORT=3004
LEARNING_SERVICE_PORT=3005
RECRUITMENT_SERVICE_PORT=3006
DOCUMENT_SERVICE_PORT=3007
NOTIFICATION_SERVICE_PORT=3008
ANALYTICS_SERVICE_PORT=3009

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=hrms
DB_USER=postgres
DB_PASSWORD=hrms_secure_password_2024
DATABASE_URL=postgresql://postgres:hrms_secure_password_2024@postgres:5432/hrms

# Database connection settings
DB_MAX_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=5000

# =============================================================================
# JWT CONFIGURATION
# =============================================================================
JWT_SECRET=hrms_jwt_super_secret_key_2024_change_in_production
JWT_ACCESS_SECRET=hrms_access_token_secret_2024
JWT_REFRESH_SECRET=hrms_refresh_token_secret_2024
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=hrms-system
JWT_AUDIENCE=hrms-users

# =============================================================================
# REDIS CONFIGURATION
# =============================================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=hrms_redis_password_2024
REDIS_DB=0
REDIS_SESSION_DB=1
REDIS_CACHE_DB=2

# =============================================================================
# KAFKA CONFIGURATION
# =============================================================================
KAFKA_CLIENT_ID=hrms-service
KAFKA_BROKERS=kafka:29092
KAFKA_GROUP_ID=hrms-group

# =============================================================================
# SESSION CONFIGURATION
# =============================================================================
SESSION_SECRET=hrms_session_secret_key_2024_change_in_production
SESSION_TTL=3600
BCRYPT_ROUNDS=12

# =============================================================================
# EMAIL CONFIGURATION
# =============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@hrms.com

# =============================================================================
# CORS CONFIGURATION
# =============================================================================
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
CORS_CREDENTIALS=true

# =============================================================================
# RATE LIMITING
# =============================================================================
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_WINDOW=900000
RATE_LIMIT_AUTH_MAX=5

# =============================================================================
# FILE UPLOAD CONFIGURATION
# =============================================================================
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf,text/csv

# =============================================================================
# STORAGE CONFIGURATION
# =============================================================================
# Storage type: local, s3, or minio
STORAGE_TYPE=s3

# AWS S3 Configuration
AWS_S3_BUCKET=hrms-documents-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_S3_ENDPOINT=  # Optional: For MinIO or custom S3 endpoints

# =============================================================================
# BUSINESS LOGIC CONFIGURATION
# =============================================================================
DEFAULT_TIMEZONE=UTC
DEFAULT_CURRENCY=USD
WORK_WEEK_START=monday
WORKING_HOURS_START=09:00
WORKING_HOURS_END=17:00
OVERTIME_THRESHOLD=8
MAX_DAILY_HOURS=12

# =============================================================================
# FEATURE FLAGS
# =============================================================================
ENABLE_GPS_TRACKING=false
ENABLE_BIOMETRIC=false
ENABLE_MFA=false
ENABLE_OAUTH=false
ENABLE_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
ENABLE_AUDIT_LOGGING=true
ENABLE_METRICS=true

# =============================================================================
# MONITORING CONFIGURATION
# =============================================================================
METRICS_INTERVAL=60000
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
PROMETHEUS_PORT=9090

# =============================================================================
# VAULT SECRETS (Optional)
# =============================================================================
VAULT_ENDPOINT=http://localhost:8200
VAULT_TOKEN=myroot

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
LOG_LEVEL=info

# =============================================================================
# MONITORING PASSWORDS
# =============================================================================
GRAFANA_PASSWORD=admin123
EOF

# Make the database init script executable
chmod +x backend/scripts/init-multiple-databases.sh

echo "✅ Environment file created successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Review and update the .env file with your settings"
echo "2. Configure SMTP settings for email functionality"
echo "3. Update passwords for production use"
echo "4. Run: docker-compose up -d"
echo ""
echo "📋 Quick commands:"
echo "  Start all services: docker-compose up -d"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo ""
echo "🌐 Access points after startup:"
echo "  API Gateway: http://localhost:8000"
echo "  Grafana: http://localhost:3030 (admin/admin123)"
echo "  Prometheus: http://localhost:9090"
echo "  Jaeger: http://localhost:16686"
echo ""
echo "📖 For detailed instructions, see docker-setup.md"
