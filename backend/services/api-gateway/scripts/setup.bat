@echo off
setlocal enabledelayedexpansion

REM HRMS API Gateway Setup Script (Windows)
echo 🌐 Setting up HRMS API Gateway...

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] package.json not found. Please run this script from the api-gateway directory.
    exit /b 1
)

REM Check Node.js
echo [INFO] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    exit /b 1
)

for /f "tokens=* USEBACKQ" %%f in (`node --version`) do (
    set node_version=%%f
)
echo [SUCCESS] Node.js version check passed: !node_version!

REM Check npm
echo [INFO] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed
    exit /b 1
)
echo [SUCCESS] npm is available

REM Install dependencies
echo [INFO] Installing dependencies...
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)
echo [SUCCESS] Dependencies installed successfully

REM Install shared service
echo [INFO] Installing shared service...
if exist "..\shared" (
    cd ..\shared
    if not exist "node_modules" (
        echo [INFO] Installing shared service dependencies...
        npm install
    )
    if not exist "dist" (
        echo [INFO] Building shared service...
        npm run build
    )
    cd ..\api-gateway
    echo [SUCCESS] Shared service ready
) else (
    echo [WARNING] Shared service not found at ..\shared
)

REM Setup environment file
echo [INFO] Setting up environment configuration...
if not exist ".env" (
    if exist "env.example" (
        copy env.example .env >nul
        echo [SUCCESS] Environment file created from example
        echo [WARNING] Please edit .env file with your configuration
    ) else (
        echo [ERROR] env.example file not found
        exit /b 1
    )
) else (
    echo [WARNING] .env file already exists
)

REM Create logs directory
echo [INFO] Creating logs directory...
if not exist "logs" mkdir logs
echo [SUCCESS] Logs directory created

REM Build TypeScript
echo [INFO] Building TypeScript...
npm run build
if errorlevel 1 (
    echo [ERROR] TypeScript build failed
    exit /b 1
)
echo [SUCCESS] TypeScript build completed

REM Run tests
echo [INFO] Running tests...
npm test
if errorlevel 1 (
    echo [WARNING] Some tests failed - check output above
) else (
    echo [SUCCESS] All tests passed
)

REM Check linting
echo [INFO] Running linter...
npm run lint
if errorlevel 1 (
    echo [WARNING] Linting issues found - check output above
) else (
    echo [SUCCESS] Code linting passed
)

REM Validate configuration
echo [INFO] Validating configuration...
node -e "const { validateGatewayConfig } = require('./dist/config'); try { validateGatewayConfig(); console.log('✓ Configuration is valid'); } catch (error) { console.error('✗ Configuration validation failed:', error.message); process.exit(1); }"
if errorlevel 1 (
    echo [ERROR] Configuration validation failed
    exit /b 1
)
echo [SUCCESS] Configuration validation passed

REM Setup complete
echo.
echo [SUCCESS] 🎉 API Gateway setup completed successfully!
echo.
echo Next steps:
echo 1. Edit the .env file with your service URLs and configuration
echo 2. Ensure Redis is running for distributed rate limiting
echo 3. Start the development server: npm run dev
echo 4. Or start the production server: npm start
echo.
echo Useful commands:
echo   npm run dev          - Start development server with hot reload
echo   npm start            - Start production server
echo   npm test             - Run tests
echo   npm run build        - Build for production
echo   npm run lint         - Check code style
echo.
echo Health check URL: http://localhost:3000/health
echo Admin metrics URL: http://localhost:3000/metrics (requires admin token)
echo.
echo [SUCCESS] Happy coding! 🚀

pause
