# Storage Configuration Guide

This guide explains how to configure and use storage services (local, S3, MinIO) across all HRMS microservices using the shared configuration system.

## 🚀 Quick Setup for S3

### 1. Environment Variables

Add these variables to your `.env` file or Kubernetes secrets:

```bash
# Storage Configuration
STORAGE_TYPE=s3
AWS_S3_BUCKET=hrms-documents-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
# AWS_S3_ENDPOINT=  # Optional: for MinIO or custom endpoints
```

### 2. Using in Document Service

```typescript
import { initializeStorageService } from './config/storage';
import { DocumentService } from './services/document.service';

// Initialize storage service (automatically uses shared config)
const storageService = initializeStorageService();

// Use in your document service
const documentService = new DocumentService(
  prisma,
  storageService, // ← S3-enabled storage service
  // ... other services
);
```

### 3. File Upload Example

```typescript
// Upload file - automatically goes to S3 when configured
const result = await documentService.uploadDocument({
  file: multerFile,
  category: 'CONTRACTS',
  type: 'DOCUMENT',
  tags: ['employee', 'contract'],
  visibility: 'PRIVATE',
  metadata: { department: 'HR' }
}, userId);

// File is now stored in S3!
console.log('File stored at:', result.storagePath);
```

## 📋 Configuration Options

### Storage Types

| Type | Description | Use Case |
|------|-------------|----------|
| `local` | Local file system | Development, testing |
| `s3` | Amazon S3 | Production, scalable cloud storage |
| `minio` | MinIO (S3-compatible) | Self-hosted S3-compatible storage |

### Service-Specific Configuration

Each service can have customized storage settings:

```typescript
import { createServiceStorageConfig } from '@hrms/shared';

// Document service - 50MB max files
const documentConfig = createServiceStorageConfig('document-service');

// Employee service - 10MB max files (profile pictures)
const employeeConfig = createServiceStorageConfig('employee-service');

// Recruitment service - 25MB max files (resumes, videos)
const recruitmentConfig = createServiceStorageConfig('recruitment-service');
```

## 🔧 Environment-Specific Defaults

### Development
```bash
STORAGE_TYPE=local
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB
```

### Production
```bash
STORAGE_TYPE=s3
AWS_S3_BUCKET=hrms-documents-prod
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
MAX_FILE_SIZE=52428800  # 50MB
```

### Testing
```bash
STORAGE_TYPE=local
UPLOAD_DIR=./test-uploads
MAX_FILE_SIZE=1048576   # 1MB
```

## 🛠️ Advanced Usage

### Custom Storage Configuration

```typescript
import { createServiceStorageConfig, StorageConfig } from '@hrms/shared';

const customConfig = createServiceStorageConfig('document-service', {
  // Override defaults
  local: {
    uploadPath: '/custom/upload/path',
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
  s3: {
    bucket: 'custom-bucket',
    region: 'eu-west-1',
    // ... other S3 options
  },
});
```

### File Organization

Files are automatically organized with this structure:

```
s3://hrms-documents-prod/
├── document-service/
│   ├── contracts/
│   │   └── user123/
│   │       └── 1640995200000_employment_contract.pdf
│   └── policies/
│       └── user456/
│           └── 1640995300000_company_policy.pdf
├── employee-service/
│   └── profiles/
│       └── user789/
│           └── 1640995400000_profile_picture.jpg
└── recruitment-service/
    └── resumes/
        └── candidate123/
            └── 1640995500000_resume.pdf
```

### Presigned URLs

Generate secure, time-limited URLs for direct client uploads:

```typescript
import { StorageService } from '@hrms/shared';

const storageService = initializeStorageService();

// Generate upload URL (1 hour expiry)
const uploadUrl = await storageService.generatePresignedUrls(
  'documents/new-file.pdf',
  'upload',
  3600
);

// Generate download URL (1 hour expiry)
const downloadUrl = await storageService.generatePresignedUrls(
  'documents/existing-file.pdf',
  'download',
  3600
);
```

## 🔒 Security Best Practices

### 1. IAM Policy for S3 Access

Create a restricted IAM policy for your HRMS application:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::hrms-documents-prod",
        "arn:aws:s3:::hrms-documents-prod/*"
      ]
    }
  ]
}
```

### 2. Environment Variables Security

- Never commit actual keys to version control
- Use AWS IAM roles in production when possible
- Rotate access keys regularly
- Use different buckets for different environments

### 3. File Type Validation

```typescript
import { getAllowedMimeTypes } from '@hrms/shared';

// Get allowed MIME types for service
const allowedTypes = getAllowedMimeTypes('document-service');

// Validate file type before upload
if (!allowedTypes.includes(file.mimetype)) {
  throw new Error(`File type ${file.mimetype} not allowed`);
}
```

## 📊 Monitoring & Metrics

### Storage Metrics

```typescript
import { getStorageStats } from '@hrms/shared';

// Get storage usage statistics
const stats = await storageService.getStorageStats();
console.log({
  totalFiles: stats.totalFiles,
  totalSize: formatFileSize(stats.totalSize),
  availableSpace: formatFileSize(stats.availableSpace || 0)
});
```

### Health Checks

```typescript
// In your service health check
app.get('/health', async (req, res) => {
  try {
    // Test storage connectivity
    const testKey = `health-check/${Date.now()}`;
    await storageService.uploadFile(
      { buffer: Buffer.from('test'), mimetype: 'text/plain' } as any,
      testKey
    );
    await storageService.deleteFile(testKey);
    
    res.json({ status: 'healthy', storage: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', storage: 'disconnected' });
  }
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Access Denied**: Check IAM permissions and bucket policies
2. **Invalid Region**: Ensure AWS_REGION matches your bucket region
3. **File Too Large**: Check MAX_FILE_SIZE limits
4. **Invalid Credentials**: Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug
```

This will log detailed storage operations for troubleshooting.

## 📚 Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [MinIO Documentation](https://min.io/docs/)
- [HRMS Shared Service Documentation](./README.md)
