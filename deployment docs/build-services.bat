@echo off
setlocal enabledelayedexpansion

REM HRMS Services Build Script for Windows
REM This script provides multiple strategies for building Docker images when facing network issues

set "services=shared-service api-gateway auth-service employee-service performance-service learning-service recruitment-service time-attendance-service document-service notification-service"

REM Configuration
set strategy=%1
set service_filter=%2

if "%strategy%"=="" set strategy=standard
if "%service_filter%"=="" set service_filter=all

echo ===========================================
echo 🏗️  HRMS Docker Build Script (Windows)
echo Strategy: %strategy%
echo Filter: %service_filter%
echo ===========================================

REM Handle help
if "%1"=="--help" goto :show_help
if "%1"=="-h" goto :show_help

REM Handle setup
if "%strategy%"=="setup" goto :setup
if "%strategy%"=="cleanup" goto :cleanup

REM Main build logic
call :setup_npm_cache

set built_count=0
set failed_count=0

for %%s in (%services%) do (
    if "%service_filter%"=="all" (
        call :build_service %%s %strategy%
    ) else if "%service_filter%"=="%%s" (
        call :build_service %%s %strategy%
    )
)

echo ===========================================
echo 🎉 Build Summary:
echo    ✅ Built: %built_count% services
echo    ❌ Failed: %failed_count% services
echo ===========================================

if %failed_count%==0 (
    echo All services built successfully!
    exit /b 0
) else (
    echo Some services failed to build. Check logs above.
    exit /b 1
)

:build_service
set service_name=%1
set build_strategy=%2

echo [INFO] Building %service_name% using strategy: %build_strategy%

pushd backend\services\%service_name%

if "%build_strategy%"=="optimized" (
    if exist "Dockerfile.optimized" (
        docker build -f Dockerfile.optimized -t "hrms-%service_name%:latest" .
    ) else (
        echo [WARN] No optimized Dockerfile found for %service_name%, using standard
        docker build -t "hrms-%service_name%:latest" .
    )
) else if "%build_strategy%"=="cached" (
    docker build --build-arg BUILDKIT_INLINE_CACHE=1 -t "hrms-%service_name%:latest" .
) else (
    docker build -t "hrms-%service_name%:latest" .
)

if !errorlevel!==0 (
    echo [INFO] ✅ Successfully built %service_name%
    set /a built_count+=1
) else (
    echo [ERROR] ❌ Failed to build %service_name%
    set /a failed_count+=1
)

popd
goto :eof

:setup_npm_cache
echo [INFO] Setting up npm cache and registry optimization...

echo registry=https://registry.npmmirror.com/ > .npmrc
echo fetch-timeout=600000 >> .npmrc
echo fetch-retry-mintimeout=20000 >> .npmrc
echo fetch-retry-maxtimeout=120000 >> .npmrc
echo fetch-retries=5 >> .npmrc
echo maxsockets=15 >> .npmrc
echo progress=false >> .npmrc
echo loglevel=warn >> .npmrc

REM Copy .npmrc to all service directories
for %%s in (%services%) do (
    if exist "backend\services\%%s" (
        copy .npmrc "backend\services\%%s\" > nul
    )
)

echo [INFO] npm configuration optimized for all services
goto :eof

:setup
call :setup_npm_cache
echo [INFO] Setup complete! Now run: build-services.bat optimized
exit /b 0

:cleanup
echo [INFO] Cleaning up npm cache files...
del /q .npmrc 2>nul
for %%s in (%services%) do (
    del /q "backend\services\%%s\.npmrc" 2>nul
)
docker system prune -f
echo [INFO] Cleanup complete!
exit /b 0

:show_help
echo HRMS Docker Build Script for Windows
echo.
echo Usage: %0 [STRATEGY] [SERVICE]
echo.
echo STRATEGIES:
echo   setup       - Setup npm cache and pre-download dependencies
echo   optimized   - Build with registry fallbacks and optimization
echo   cached      - Use aggressive Docker build caching
echo   standard    - Standard docker build (default)
echo   cleanup     - Clean npm cache and Docker system
echo.
echo SERVICES:
echo   all         - Build all services (default)
echo   ^<service^>   - Build specific service (e.g., auth-service)
echo.
echo EXAMPLES:
echo   %0 setup                    # Setup environment first
echo   %0 optimized               # Build all services with optimization
echo   %0 optimized auth-service  # Build only auth service optimized
echo   %0 cleanup                 # Clean up after builds
echo.
exit /b 0
