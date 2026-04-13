# HRM Azure Deployment Script
# Deploys to Azure Container Apps with MongoDB

$ErrorActionPreference = "Stop"
$AZ = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"

# Configuration
$RESOURCE_GROUP = "hrm-production-rg"
$LOCATION = "eastus"
$ACR_NAME = "hrmproductionacr"
$CONTAINER_ENV = "hrm-container-env"
$MONGODB_APP = "hrm-mongodb"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HRM Azure Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Create Resource Group
Write-Host "`n[1/8] Creating Resource Group..." -ForegroundColor Yellow
& $AZ group create --name $RESOURCE_GROUP --location $LOCATION --output none
Write-Host "[OK] Resource Group created: $RESOURCE_GROUP" -ForegroundColor Green

# Step 2: Create Container Registry
Write-Host "`n[2/8] Creating Container Registry..." -ForegroundColor Yellow
& $AZ acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true --output none
Write-Host "[OK] Container Registry created: $ACR_NAME" -ForegroundColor Green

# Get ACR credentials
$ACR_PASSWORD = (& $AZ acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)
$ACR_LOGIN_SERVER = "$ACR_NAME.azurecr.io"

# Step 3: Login to ACR
Write-Host "`n[3/8] Logging into Container Registry..." -ForegroundColor Yellow
& $AZ acr login --name $ACR_NAME
Write-Host "[OK] Logged into ACR" -ForegroundColor Green

# Step 4: Build and push images
Write-Host "`n[4/8] Building and pushing Docker images..." -ForegroundColor Yellow
Set-Location "C:\Users\CanyCode\Projects\HRM"

$services = @(
    "api-gateway",
    "auth-service",
    "tenant-service",
    "employee-service",
    "attendance-service",
    "leave-service",
    "payroll-service",
    "notification-service",
    "onboarding-service",
    "timesheet-service"
)

foreach ($service in $services) {
    Write-Host "  Building $service..." -ForegroundColor Cyan
    docker build -t "$ACR_LOGIN_SERVER/hrm/$service`:latest" "./services/$service" 2>$null
    docker push "$ACR_LOGIN_SERVER/hrm/$service`:latest" 2>$null
    Write-Host "  [OK] $service pushed" -ForegroundColor Green
}

# Build frontend
Write-Host "  Building frontend..." -ForegroundColor Cyan
docker build -t "$ACR_LOGIN_SERVER/hrm/frontend:latest" "./frontend" 2>$null
docker push "$ACR_LOGIN_SERVER/hrm/frontend:latest" 2>$null
Write-Host "  [OK] frontend pushed" -ForegroundColor Green

# Step 5: Create Container Apps Environment
Write-Host "`n[5/8] Creating Container Apps Environment..." -ForegroundColor Yellow
& $AZ containerapp env create --name $CONTAINER_ENV --resource-group $RESOURCE_GROUP --location $LOCATION --output none
Write-Host "[OK] Container Apps Environment created" -ForegroundColor Green

# Step 6: Deploy MongoDB
Write-Host "`n[6/8] Deploying MongoDB..." -ForegroundColor Yellow
& $AZ containerapp create `
    --name $MONGODB_APP `
    --resource-group $RESOURCE_GROUP `
    --environment $CONTAINER_ENV `
    --image mongo:7.0 `
    --target-port 27017 `
    --ingress internal `
    --cpu 1 --memory 2Gi `
    --min-replicas 1 --max-replicas 1 `
    --env-vars "MONGO_INITDB_ROOT_USERNAME=admin" "MONGO_INITDB_ROOT_PASSWORD=HrmMongo2024!" `
    --output none
Write-Host "[OK] MongoDB deployed" -ForegroundColor Green

# Get MongoDB internal URL
$MONGODB_FQDN = (& $AZ containerapp show --name $MONGODB_APP --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)
$MONGODB_URI = "mongodb://admin:HrmMongo2024!@$MONGODB_FQDN`:27017"

# Get Container Apps Environment default domain for internal URLs
$ENV_DEFAULT_DOMAIN = (& $AZ containerapp env show --name $CONTAINER_ENV --resource-group $RESOURCE_GROUP --query "properties.defaultDomain" -o tsv)
Write-Host "[OK] Environment domain: $ENV_DEFAULT_DOMAIN" -ForegroundColor Green

# Step 7: Deploy Backend Services
Write-Host "`n[7/8] Deploying Backend Services..." -ForegroundColor Yellow

# Common environment variables
$JWT_SECRET = "hrm_saas_access_secret_2024_azure"
$JWT_REFRESH = "hrm_saas_refresh_secret_2024_azure"

# Deploy API Gateway with all internal service URLs
# Note: Use HTTP for internal service communication (Azure Container Apps handles TLS at ingress)
Write-Host "  Deploying api-gateway..." -ForegroundColor Cyan
$gatewayEnvVars = @(
    "NODE_ENV=production",
    "PORT=3000",
    "JWT_ACCESS_SECRET=$JWT_SECRET",
    "JWT_REFRESH_SECRET=$JWT_REFRESH",
    "AUTH_SERVICE_URL=http://hrm-auth-service.internal.$ENV_DEFAULT_DOMAIN",
    "TENANT_SERVICE_URL=http://hrm-tenant-service.internal.$ENV_DEFAULT_DOMAIN",
    "EMPLOYEE_SERVICE_URL=http://hrm-employee-service.internal.$ENV_DEFAULT_DOMAIN",
    "ATTENDANCE_SERVICE_URL=http://hrm-attendance-service.internal.$ENV_DEFAULT_DOMAIN",
    "LEAVE_SERVICE_URL=http://hrm-leave-service.internal.$ENV_DEFAULT_DOMAIN",
    "PAYROLL_SERVICE_URL=http://hrm-payroll-service.internal.$ENV_DEFAULT_DOMAIN",
    "NOTIFICATION_SERVICE_URL=http://hrm-notification-service.internal.$ENV_DEFAULT_DOMAIN",
    "TIMESHEET_SERVICE_URL=http://hrm-timesheet-service.internal.$ENV_DEFAULT_DOMAIN",
    "ONBOARDING_SERVICE_URL=http://hrm-onboarding-service.internal.$ENV_DEFAULT_DOMAIN"
) -join " "

& $AZ containerapp create `
    --name hrm-api-gateway `
    --resource-group $RESOURCE_GROUP `
    --environment $CONTAINER_ENV `
    --image "$ACR_LOGIN_SERVER/hrm/api-gateway:latest" `
    --registry-server $ACR_LOGIN_SERVER `
    --registry-username $ACR_NAME `
    --registry-password $ACR_PASSWORD `
    --target-port 3000 `
    --ingress external `
    --cpu 0.5 --memory 1Gi `
    --min-replicas 1 --max-replicas 3 `
    --env-vars $gatewayEnvVars `
    --output none
Write-Host "  [OK] api-gateway deployed" -ForegroundColor Green

$API_GATEWAY_URL = (& $AZ containerapp show --name hrm-api-gateway --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)

# Deploy other services
$backendServices = @{
    "auth-service" = 3001
    "tenant-service" = 3002
    "employee-service" = 3003
    "attendance-service" = 3004
    "leave-service" = 3005
    "payroll-service" = 3006
    "notification-service" = 3007
    "onboarding-service" = 3021
    "timesheet-service" = 3024
}

foreach ($svc in $backendServices.GetEnumerator()) {
    Write-Host "  Deploying $($svc.Key)..." -ForegroundColor Cyan
    $dbName = "hrm_" + ($svc.Key -replace "-service", "")

    # Build base env vars
    $envVars = "NODE_ENV=production PORT=$($svc.Value) MONGODB_URI=$MONGODB_URI/$dbName`?authSource=admin JWT_ACCESS_SECRET=$JWT_SECRET JWT_REFRESH_SECRET=$JWT_REFRESH"

    # Add EMPLOYEE_SERVICE_URL for auth-service (needed for mobile login)
    # Use HTTP for internal service communication
    if ($svc.Key -eq "auth-service") {
        $envVars += " EMPLOYEE_SERVICE_URL=http://hrm-employee-service.internal.$ENV_DEFAULT_DOMAIN"
    }

    # Add AUTH_SERVICE_URL for tenant-service (needed for tenant registration with admin user)
    if ($svc.Key -eq "tenant-service") {
        $envVars += " AUTH_SERVICE_URL=http://hrm-auth-service.internal.$ENV_DEFAULT_DOMAIN"
    }

    & $AZ containerapp create `
        --name "hrm-$($svc.Key)" `
        --resource-group $RESOURCE_GROUP `
        --environment $CONTAINER_ENV `
        --image "$ACR_LOGIN_SERVER/hrm/$($svc.Key):latest" `
        --registry-server $ACR_LOGIN_SERVER `
        --registry-username $ACR_NAME `
        --registry-password $ACR_PASSWORD `
        --target-port $($svc.Value) `
        --ingress internal `
        --cpu 0.25 --memory 0.5Gi `
        --min-replicas 1 --max-replicas 2 `
        --env-vars $envVars `
        --output none
    Write-Host "  [OK] $($svc.Key) deployed" -ForegroundColor Green
}

# Step 8: Deploy Frontend
Write-Host "`n[8/8] Deploying Frontend..." -ForegroundColor Yellow
& $AZ containerapp create `
    --name hrm-frontend `
    --resource-group $RESOURCE_GROUP `
    --environment $CONTAINER_ENV `
    --image "$ACR_LOGIN_SERVER/hrm/frontend:latest" `
    --registry-server $ACR_LOGIN_SERVER `
    --registry-username $ACR_NAME `
    --registry-password $ACR_PASSWORD `
    --target-port 8080 `
    --ingress external `
    --cpu 0.25 --memory 0.5Gi `
    --min-replicas 1 --max-replicas 3 `
    --env-vars "VITE_API_URL=https://$API_GATEWAY_URL/api" `
    --output none
Write-Host "[OK] Frontend deployed" -ForegroundColor Green

# Get URLs
$FRONTEND_URL = (& $AZ containerapp show --name hrm-frontend --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nFrontend URL: https://$FRONTEND_URL" -ForegroundColor Yellow
Write-Host "API Gateway URL: https://$API_GATEWAY_URL" -ForegroundColor Yellow
Write-Host "`nLogin with: admin@hrm-saas.com / SuperAdmin@123" -ForegroundColor White
