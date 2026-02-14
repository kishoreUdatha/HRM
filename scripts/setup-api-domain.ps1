# ===========================================
# Setup Custom Domain for API Gateway
# api.hrzio.com -> Azure Container Apps
# ===========================================

# Configuration
$RESOURCE_GROUP = "hrm-production-rg"
$CONTAINER_APP_ENV = "hrm-production-env"
$CONTAINER_APP_NAME = "hrm-production-gateway"
$CUSTOM_DOMAIN = "api.hrzio.com"

Write-Host "==========================================" -ForegroundColor Blue
Write-Host "  HRM API Custom Domain Setup" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue
Write-Host ""

# Step 1: Get the current Container App FQDN
Write-Host "Step 1: Getting current Container App FQDN..." -ForegroundColor Yellow
$CURRENT_FQDN = az containerapp show `
  --name $CONTAINER_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --query "properties.configuration.ingress.fqdn" `
  -o tsv

Write-Host "Current FQDN: $CURRENT_FQDN" -ForegroundColor Green
Write-Host ""

# Step 2: DNS Setup Instructions
Write-Host "==========================================" -ForegroundColor Blue
Write-Host "  DNS CONFIGURATION REQUIRED" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Add the following CNAME record in your DNS provider:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Type:  CNAME" -ForegroundColor White
Write-Host "  Name:  api" -ForegroundColor White
Write-Host "  Value: $CURRENT_FQDN" -ForegroundColor Cyan
Write-Host "  TTL:   300 (or default)" -ForegroundColor White
Write-Host ""
Write-Host "Wait for DNS propagation (usually 5-30 minutes)" -ForegroundColor Yellow
Write-Host ""

# Step 3: Verify DNS
Write-Host "Step 2: Verifying DNS propagation..." -ForegroundColor Yellow
try {
    $dnsResult = Resolve-DnsName -Name $CUSTOM_DOMAIN -ErrorAction Stop
    Write-Host "DNS resolution successful!" -ForegroundColor Green
} catch {
    Write-Host "WARNING: DNS not yet propagated. Please configure DNS first." -ForegroundColor Red
    Write-Host ""
    Write-Host "After configuring DNS, run this script again or continue manually." -ForegroundColor Yellow
    Read-Host "Press Enter to continue anyway, or Ctrl+C to exit"
}
Write-Host ""

# Step 4: Add custom domain to Container App
Write-Host "Step 3: Adding custom domain to Container App..." -ForegroundColor Yellow
az containerapp hostname add `
  --hostname $CUSTOM_DOMAIN `
  --name $CONTAINER_APP_NAME `
  --resource-group $RESOURCE_GROUP

Write-Host ""

# Step 5: Configure managed certificate (free SSL)
Write-Host "Step 4: Configuring managed SSL certificate..." -ForegroundColor Yellow
az containerapp hostname bind `
  --hostname $CUSTOM_DOMAIN `
  --name $CONTAINER_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --environment $CONTAINER_APP_ENV `
  --validation-method CNAME

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "API will be available at: https://$CUSTOM_DOMAIN/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "SSL certificate may take a few minutes to provision." -ForegroundColor Yellow
Write-Host "Check status with:" -ForegroundColor Yellow
Write-Host "  az containerapp hostname list --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP" -ForegroundColor White
Write-Host ""
