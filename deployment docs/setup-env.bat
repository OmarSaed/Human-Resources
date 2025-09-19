@echo off
echo 🚀 Setting up HRMS Docker Environment...

REM Check if .env exists
if exist ".env" (
    echo ⚠️  .env file already exists. Backup created as .env.backup
    copy ".env" ".env.backup" >nul
)

REM Create .env file
(
echo # =============================================================================
echo # HRMS Environment Configuration - Development
echo # =============================================================================
echo.
echo # =============================================================================
echo # APPLICATION CONFIGURATION
echo # =============================================================================
echo NODE_ENV=development
echo HOST=0.0.0.0
echo.
echo # =============================================================================
echo # SERVICE PORTS
echo # =============================================================================
echo API_GATEWAY_PORT=3000
echo AUTH_SERVICE_PORT=3001
echo EMPLOYEE_SERVICE_PORT=3002
echo TIME_ATTENDANCE_SERVICE_PORT=3003
echo PERFORMANCE_SERVICE_PORT=3004
echo LEARNING_SERVICE_PORT=3005
echo RECRUITMENT_SERVICE_PORT=3006
echo DOCUMENT_SERVICE_PORT=3007
echo NOTIFICATION_SERVICE_PORT=3008
echo ANALYTICS_SERVICE_PORT=3009
echo.
echo # =============================================================================
echo # DATABASE CONFIGURATION
echo # =============================================================================
echo DB_HOST=postgres
echo DB_PORT=5432
echo DB_NAME=hrms
echo DB_USER=postgres
echo DB_PASSWORD=hrms_secure_password_2024
echo DATABASE_URL=postgresql://postgres:hrms_secure_password_2024@postgres:5432/hrms
echo.
echo # Database connection settings
echo DB_MAX_CONNECTIONS=10
echo DB_CONNECTION_TIMEOUT=5000
echo.
echo # =============================================================================
echo # JWT CONFIGURATION
echo # =============================================================================
echo JWT_SECRET=hrms_jwt_super_secret_key_2024_change_in_production
echo JWT_ACCESS_SECRET=hrms_access_token_secret_2024
echo JWT_REFRESH_SECRET=hrms_refresh_token_secret_2024
echo JWT_EXPIRES_IN=15m
echo JWT_REFRESH_EXPIRES_IN=7d
echo JWT_ISSUER=hrms-system
echo JWT_AUDIENCE=hrms-users
echo.
echo # =============================================================================
echo # REDIS CONFIGURATION
echo # =============================================================================
echo REDIS_HOST=redis
echo REDIS_PORT=6379
echo REDIS_PASSWORD=hrms_redis_password_2024
echo REDIS_DB=0
echo REDIS_SESSION_DB=1
echo REDIS_CACHE_DB=2
echo.
echo # =============================================================================
echo # KAFKA CONFIGURATION
echo # =============================================================================
echo KAFKA_CLIENT_ID=hrms-service
echo KAFKA_BROKERS=kafka:29092
echo KAFKA_GROUP_ID=hrms-group
echo.
echo # =============================================================================
echo # SESSION CONFIGURATION
echo # =============================================================================
echo SESSION_SECRET=hrms_session_secret_key_2024_change_in_production
echo SESSION_TTL=3600
echo BCRYPT_ROUNDS=12
echo.
echo # =============================================================================
echo # EMAIL CONFIGURATION
echo # =============================================================================
echo SMTP_HOST=smtp.gmail.com
echo SMTP_PORT=587
echo SMTP_SECURE=false
echo SMTP_USER=your-email@gmail.com
echo SMTP_PASS=your-app-password
echo EMAIL_FROM=noreply@hrms.com
echo.
echo # =============================================================================
echo # CORS CONFIGURATION
echo # =============================================================================
echo CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
echo CORS_CREDENTIALS=true
echo.
echo # =============================================================================
echo # RATE LIMITING
echo # =============================================================================
echo RATE_LIMIT_WINDOW=900000
echo RATE_LIMIT_MAX_REQUESTS=100
echo RATE_LIMIT_AUTH_WINDOW=900000
echo RATE_LIMIT_AUTH_MAX=5
echo.
echo # =============================================================================
echo # FILE UPLOAD CONFIGURATION
echo # =============================================================================
echo MAX_FILE_SIZE=10485760
echo UPLOAD_DIR=./uploads
echo ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf,text/csv
echo.
echo # =============================================================================
echo # STORAGE CONFIGURATION
echo # =============================================================================
echo # Storage type: local, s3, or minio
echo STORAGE_TYPE=s3
echo.
echo # AWS S3 Configuration
echo AWS_S3_BUCKET=hrms-documents-prod
echo AWS_REGION=us-east-1
echo AWS_ACCESS_KEY_ID=your-access-key
echo AWS_SECRET_ACCESS_KEY=your-secret-key
echo # AWS_S3_ENDPOINT=  # Optional: For MinIO or custom S3 endpoints
echo.
echo # =============================================================================
echo # BUSINESS LOGIC CONFIGURATION
echo # =============================================================================
echo DEFAULT_TIMEZONE=UTC
echo DEFAULT_CURRENCY=USD
echo WORK_WEEK_START=monday
echo WORKING_HOURS_START=09:00
echo WORKING_HOURS_END=17:00
echo OVERTIME_THRESHOLD=8
echo MAX_DAILY_HOURS=12
echo.
echo # =============================================================================
echo # FEATURE FLAGS
echo # =============================================================================
echo ENABLE_GPS_TRACKING=false
echo ENABLE_BIOMETRIC=false
echo ENABLE_MFA=false
echo ENABLE_OAUTH=false
echo ENABLE_NOTIFICATIONS=true
echo ENABLE_ANALYTICS=true
echo ENABLE_AUDIT_LOGGING=true
echo ENABLE_METRICS=true
echo.
echo # =============================================================================
echo # MONITORING CONFIGURATION
echo # =============================================================================
echo METRICS_INTERVAL=60000
echo JAEGER_ENDPOINT=http://jaeger:14268/api/traces
echo PROMETHEUS_PORT=9090
echo.
echo # =============================================================================
echo # VAULT SECRETS ^(Optional^)
echo # =============================================================================
echo VAULT_ENDPOINT=http://localhost:8200
echo VAULT_TOKEN=myroot
echo.
echo # =============================================================================
echo # LOGGING CONFIGURATION
echo # =============================================================================
echo LOG_LEVEL=info
echo.
echo # =============================================================================
echo # MONITORING PASSWORDS
echo # =============================================================================
echo GRAFANA_PASSWORD=admin123
) > .env

echo ✅ Environment file created successfully!
echo.
echo 🔧 Next steps:
echo 1. Review and update the .env file with your settings
echo 2. Configure SMTP settings for email functionality
echo 3. Update passwords for production use
echo 4. Run: docker-compose up -d
echo.
echo 📋 Quick commands:
echo   Start all services: docker-compose up -d
echo   View logs: docker-compose logs -f
echo   Stop services: docker-compose down
echo.
echo 🌐 Access points after startup:
echo   API Gateway: http://localhost:8000
echo   Grafana: http://localhost:3030 ^(admin/admin123^)
echo   Prometheus: http://localhost:9090
echo   Jaeger: http://localhost:16686
echo.
echo 📖 For detailed instructions, see docker-setup.md

pause
