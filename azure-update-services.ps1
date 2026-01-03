# HRM Azure Services Configuration Update Script
# Use this script to ensure all services have correct configuration
# Run this after deployment or when services need to be reconfigured

$ErrorActionPreference = "Stop"
$AZ = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
$RESOURCE_GROUP = "hrm-saas"

# Cosmos DB connection string base (without database name)
# Get from Azure: az cosmosdb keys list --name hrmsaasdb --resource-group hrm-saas
# Format: mongodb://<account>:<key>@<account>.mongo.cosmos.azure.com:10255
$MONGO_BASE = $env:COSMOS_DB_CONNECTION_BASE
if (-not $MONGO_BASE) {
    Write-Host "ERROR: Set COSMOS_DB_CONNECTION_BASE environment variable first" -ForegroundColor Red
    Write-Host "Format: mongodb://<account>:<key>@<account>.mongo.cosmos.azure.com:10255" -ForegroundColor Yellow
    exit 1
}
$MONGO_PARAMS = "ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@hrmsaasdb@"

# JWT secrets
$JWT_ACCESS_SECRET = "hrm_saas_access_secret_2024_azure"
$JWT_REFRESH_SECRET = "hrm_saas_refresh_secret_2024_azure"

# Get environment domain for internal service URLs
$ENV_DEFAULT_DOMAIN = (& $AZ containerapp env show --name hrm-env --resource-group $RESOURCE_GROUP --query "properties.defaultDomain" -o tsv)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HRM Azure Services Configuration Update" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Environment Domain: $ENV_DEFAULT_DOMAIN" -ForegroundColor Gray

# Service configurations: service-name -> (port, database-name, extra-env-vars)
$services = @{
    "hrm-auth-service" = @{
        Port = 3001
        Database = "hrm_auth"
        ExtraEnvVars = "EMPLOYEE_SERVICE_URL=https://hrm-employee-service.internal.$ENV_DEFAULT_DOMAIN"
        MinReplicas = 1
    }
    "hrm-tenant-service" = @{
        Port = 3002
        Database = "hrm_tenant"
        ExtraEnvVars = ""
        MinReplicas = 1
    }
    "hrm-employee-service" = @{
        Port = 3003
        Database = "hrm_employee"
        ExtraEnvVars = ""
        MinReplicas = 1
    }
    "hrm-attendance-service" = @{
        Port = 3004
        Database = "hrm_attendance"
        ExtraEnvVars = ""
        MinReplicas = 1
    }
    "hrm-leave-service" = @{
        Port = 3005
        Database = "hrm_leave"
        ExtraEnvVars = ""
        MinReplicas = 1
    }
    "hrm-payroll-service" = @{
        Port = 3006
        Database = "hrm_payroll"
        ExtraEnvVars = ""
        MinReplicas = 0
    }
    "hrm-notification-service" = @{
        Port = 3007
        Database = "hrm_notification"
        ExtraEnvVars = ""
        MinReplicas = 0
    }
    "hrm-timesheet-service" = @{
        Port = 3024
        Database = "hrm_timesheet"
        ExtraEnvVars = ""
        MinReplicas = 0
    }
    "hrm-onboarding-service" = @{
        Port = 3021
        Database = "hrm_onboarding"
        ExtraEnvVars = ""
        MinReplicas = 0
    }
}

# Update API Gateway
Write-Host "`n[1/11] Updating hrm-api-gateway..." -ForegroundColor Yellow
$gatewayEnvVars = @(
    "NODE_ENV=production",
    "PORT=3000",
    "JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET",
    "AUTH_SERVICE_URL=https://hrm-auth-service.internal.$ENV_DEFAULT_DOMAIN",
    "TENANT_SERVICE_URL=https://hrm-tenant-service.internal.$ENV_DEFAULT_DOMAIN",
    "EMPLOYEE_SERVICE_URL=https://hrm-employee-service.internal.$ENV_DEFAULT_DOMAIN",
    "ATTENDANCE_SERVICE_URL=https://hrm-attendance-service.internal.$ENV_DEFAULT_DOMAIN",
    "LEAVE_SERVICE_URL=https://hrm-leave-service.internal.$ENV_DEFAULT_DOMAIN",
    "PAYROLL_SERVICE_URL=https://hrm-payroll-service.internal.$ENV_DEFAULT_DOMAIN",
    "NOTIFICATION_SERVICE_URL=https://hrm-notification-service.internal.$ENV_DEFAULT_DOMAIN",
    "TIMESHEET_SERVICE_URL=https://hrm-timesheet-service.internal.$ENV_DEFAULT_DOMAIN",
    "ONBOARDING_SERVICE_URL=https://hrm-onboarding-service.internal.$ENV_DEFAULT_DOMAIN"
) -join " "

& $AZ containerapp update `
    --name hrm-api-gateway `
    --resource-group $RESOURCE_GROUP `
    --min-replicas 1 `
    --set-env-vars $gatewayEnvVars `
    --output none 2>$null

Write-Host "[OK] hrm-api-gateway updated" -ForegroundColor Green

# Update backend services
$counter = 2
foreach ($svc in $services.GetEnumerator()) {
    $serviceName = $svc.Key
    $config = $svc.Value
    $mongoUri = "$MONGO_BASE/$($config.Database)?$MONGO_PARAMS"

    Write-Host "`n[$counter/11] Updating $serviceName..." -ForegroundColor Yellow

    # Build environment variables
    $envVars = "NODE_ENV=production PORT=$($config.Port) MONGODB_URI=$mongoUri JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"

    if ($config.ExtraEnvVars) {
        $envVars += " $($config.ExtraEnvVars)"
    }

    & $AZ containerapp update `
        --name $serviceName `
        --resource-group $RESOURCE_GROUP `
        --min-replicas $($config.MinReplicas) `
        --set-env-vars $envVars `
        --output none 2>$null

    Write-Host "[OK] $serviceName updated (minReplicas: $($config.MinReplicas), db: $($config.Database))" -ForegroundColor Green
    $counter++
}

# Update frontend
Write-Host "`n[$counter/11] Updating hrm-frontend..." -ForegroundColor Yellow
& $AZ containerapp update `
    --name hrm-frontend `
    --resource-group $RESOURCE_GROUP `
    --min-replicas 1 `
    --output none 2>$null
Write-Host "[OK] hrm-frontend updated" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  All services updated successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Verify configuration
Write-Host "`nVerifying configuration..." -ForegroundColor Yellow
& $AZ containerapp list --resource-group $RESOURCE_GROUP --query "[].{name:name,minReplicas:properties.template.scale.minReplicas}" -o table
