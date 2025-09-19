@echo off
echo ============================================================================
echo HRMS Docker Complete Cleanup and Rebuild Script (Windows)
echo ============================================================================
echo.
echo WARNING: This will delete ALL Docker containers, images, and volumes!
echo Press Ctrl+C to cancel, or any key to continue...
pause

echo.
echo Step 1: Stopping all running containers...
docker stop $(docker ps -aq) 2>nul

echo.
echo Step 2: Removing all containers...
docker rm $(docker ps -aq) 2>nul

echo.
echo Step 3: Removing all images...
docker rmi $(docker images -q) -f 2>nul

echo.
echo Step 4: Removing all volumes...
docker volume rm $(docker volume ls -q) 2>nul

echo.
echo Step 5: Removing all networks (except default ones)...
docker network prune -f

echo.
echo Step 6: Complete Docker system cleanup...
docker system prune -a -f --volumes

echo.
echo Step 7: Building and starting HRMS services...
docker-compose up --build -d

echo.
echo ============================================================================
echo Cleanup and rebuild complete!
echo ============================================================================
echo.
echo Services will be available at:
echo - Frontend: http://localhost:8080
echo - API Gateway: http://localhost:8000
echo - Grafana: http://localhost:3030
echo - Prometheus: http://localhost:9090
echo.
echo Check status with: docker-compose ps
echo View logs with: docker-compose logs -f [service-name]
echo ============================================================================
