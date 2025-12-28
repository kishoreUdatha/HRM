$ACR = "hrmproductionacr.azurecr.io"
$TAG = "latest"
$ROOT = "C:\Users\KishoreUdatha\IdeaProjects\HRM"

$services = @(
    "api-gateway",
    "auth-service",
    "tenant-service",
    "employee-service",
    "attendance-service",
    "leave-service",
    "payroll-service",
    "notification-service",
    "reports-service",
    "websocket-service",
    "chat-service",
    "analytics-service",
    "document-service",
    "integration-service",
    "engagement-service",
    "ai-chatbot-service",
    "ai-ml-service",
    "workforce-service",
    "recruitment-service",
    "localization-service",
    "benefits-service",
    "onboarding-service",
    "compliance-service",
    "expense-service",
    "timesheet-service",
    "asset-service",
    "grievance-service",
    "billing-service"
)

Write-Host "Building $($services.Count) services..." -ForegroundColor Green

foreach ($svc in $services) {
    $svcPath = "$ROOT\services\$svc"
    if (Test-Path "$svcPath\Dockerfile") {
        Write-Host "Building $svc..." -ForegroundColor Yellow
        docker build -t "$ACR/hrm/${svc}:$TAG" "$svcPath" 2>&1 | Write-Host
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Pushing $svc..." -ForegroundColor Yellow
            docker push "$ACR/hrm/${svc}:$TAG" 2>&1 | Write-Host
            Write-Host "$svc completed!" -ForegroundColor Green
        } else {
            Write-Host "Failed to build $svc" -ForegroundColor Red
        }
    } else {
        Write-Host "No Dockerfile found for $svc, skipping..." -ForegroundColor Red
    }
}

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
docker build -t "$ACR/hrm/frontend:$TAG" "$ROOT\frontend" 2>&1 | Write-Host
if ($LASTEXITCODE -eq 0) {
    Write-Host "Pushing frontend..." -ForegroundColor Yellow
    docker push "$ACR/hrm/frontend:$TAG" 2>&1 | Write-Host
    Write-Host "Frontend completed!" -ForegroundColor Green
} else {
    Write-Host "Failed to build frontend" -ForegroundColor Red
}

Write-Host "All builds completed!" -ForegroundColor Green
