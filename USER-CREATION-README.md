# 👤 HRMS User Creation Scripts

This directory contains scripts to create users directly in the HRMS database.

## 📁 Files

- `create-admin-user.sql` - Ready-to-use script with pre-created admin users
- `create-custom-user.sql` - Template for creating custom users
- `password-hasher.js` - Utility to generate bcrypt password hashes
- `run-user-script.sh` - Bash script to run SQL scripts (Linux/Mac)
- `run-user-script.bat` - Batch script to run SQL scripts (Windows)

## 🚀 Quick Start

### Option 1: Use Pre-created Admin Users

Run the ready-made script with default admin accounts:

```bash
# Linux/Mac
./run-user-script.sh create-admin-user.sql

# Windows
run-user-script.bat create-admin-user.sql

# Or manually:
psql -h localhost -p 5433 -U postgres -d hrms_auth -f create-admin-user.sql
```

**Default Login Credentials:**
1. **Super Admin**
   - Email: `admin@company.com`
   - Password: `Admin123!`

2. **HR Manager**
   - Email: `hr.manager@company.com`
   - Password: `SecurePass123!`

3. **HR Specialist**
   - Email: `hr.specialist@company.com`
   - Password: `HRAdmin2024!`

### Option 2: Create Custom User

1. **Generate password hash:**
   ```bash
   # Install bcryptjs if needed
   npm install bcryptjs
   
   # Generate hash for your password
   node password-hasher.js "YourPassword123!"
   ```

2. **Edit the custom script:**
   - Open `create-custom-user.sql`
   - Replace the placeholder values with your details
   - Use the generated hash from step 1

3. **Run the script:**
   ```bash
   # Linux/Mac
   ./run-user-script.sh create-custom-user.sql

   # Windows
   run-user-script.bat create-custom-user.sql
   ```

## 🔧 Prerequisites

1. **HRMS Docker containers running:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Database initialized:**
   - Make sure migrations have been applied
   - The `hrms_auth` database should exist

3. **Network access to PostgreSQL:**
   - Default: `localhost:5433`
   - Username: `postgres`
   - Password: `hrms_secure_password_2024` (from setup-env.sh)

## 📋 Available User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `SUPER_ADMIN` | System administrator | All permissions |
| `HR_MANAGER` | HR department manager | Employee management, reports |
| `HR_SPECIALIST` | HR team member | Employee operations |
| `DEPARTMENT_MANAGER` | Department head | Team management |
| `EMPLOYEE` | Regular employee | Self-service only |

## 🛠️ Manual Connection

If you prefer to connect manually:

```bash
# Connect to PostgreSQL
psql -h localhost -p 5433 -U postgres -d hrms_auth

# Run the SQL commands directly
\i create-admin-user.sql
```

## 🔐 Security Notes

1. **Change default passwords** immediately after first login
2. **Delete these scripts** in production environments
3. **Use strong passwords** for production users
4. **Enable MFA** for admin accounts in production

## 🐛 Troubleshooting

### Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection
psql -h localhost -p 5433 -U postgres -c "SELECT version();"
```

### Permission Issues
```bash
# Make scripts executable (Linux/Mac)
chmod +x run-user-script.sh
chmod +x password-hasher.js
```

### Database Issues
```bash
# Check if hrms_auth database exists
psql -h localhost -p 5433 -U postgres -c "\l" | grep hrms_auth

# Check if users table exists
psql -h localhost -p 5433 -U postgres -d hrms_auth -c "\dt"
```

## 📝 Custom Password Generation

The `password-hasher.js` script can:

1. **Hash a specific password:**
   ```bash
   node password-hasher.js "MySecurePassword123!"
   ```

2. **Generate and hash a random password:**
   ```bash
   node password-hasher.js
   ```

3. **Generate multiple passwords:**
   ```bash
   for i in {1..5}; do node password-hasher.js; echo "---"; done
   ```

## ⚠️ Important Notes

- These scripts are for **initial setup only**
- **Remove or secure** these files in production
- Always **verify user creation** after running scripts
- **Test login** with created credentials
- Consider using **environment variables** for sensitive data in production

## 🔄 Updating Existing Users

To update an existing user's password:

```sql
-- Connect to database
\c hrms_auth;

-- Update password (replace with your hash)
UPDATE users 
SET password = '$2a$12$YOUR_NEW_HASH_HERE',
    "updatedAt" = NOW()
WHERE email = 'user@company.com';
```
