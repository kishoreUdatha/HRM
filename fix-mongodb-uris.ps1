# Fix MONGODB_URI for all HRM services
# This script ensures all services have the correct database name in their connection string

$ErrorActionPreference = "Stop"
$AZ = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
$RESOURCE_GROUP = "hrm-saas"

# Base MongoDB connection string (without database name)
# Get from Azure: az cosmosdb keys list --name hrmsaasdb --resource-group hrm-saas
# Format: mongodb://<account>:<key>@<account>.mongo.cosmos.azure.com:10255
$MONGO_BASE = $env:COSMOS_DB_CONNECTION_BASE
if (-not $MONGO_BASE) {
    Write-Host "ERROR: Set COSMOS_DB_CONNECTION_BASE environment variable first" -ForegroundColor Red
    Write-Host "Format: mongodb://<account>:<key>@<account>.mongo.cosmos.azure.com:10255" -ForegroundColor Yellow
    exit 1
}
$MONGO_PARAMS = "ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@hrmsaasdb@"

# Service to database name mapping
$services = @{
    "hrm-auth-service" = "hrm_auth"
    "hrm-tenant-service" = "hrm_tenant"
    "hrm-employee-service" = "hrm_employee"
    "hrm-attendance-service" = "hrm_attendance"
    "hrm-leave-service" = "hrm_leave"
    "hrm-payroll-service" = "hrm_payroll"
    "hrm-notification-service" = "hrm_notification"
    "hrm-timesheet-service" = "hrm_timesheet"
    "hrm-onboarding-service" = "hrm_onboarding"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing MONGODB_URI for all services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

foreach ($service in $services.GetEnumerator()) {
    $serviceName = $service.Key
    $dbName = $service.Value
    $mongoUri = "$MONGO_BASE/$dbName`?$MONGO_PARAMS"

    Write-Host "`nUpdating $serviceName with database: $dbName" -ForegroundColor Yellow

    & $AZ containerapp update `
        --name $serviceName `
        --resource-group $RESOURCE_GROUP `
        --set-env-vars "MONGODB_URI=$mongoUri" `
        --output none

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] $serviceName updated" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to update $serviceName" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  All services updated!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
