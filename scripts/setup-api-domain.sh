#!/bin/bash
# ===========================================
# Setup Custom Domain for API Gateway
# api.hrzio.com -> Azure Container Apps
# ===========================================

# Configuration
RESOURCE_GROUP="hrm-production-rg"
CONTAINER_APP_ENV="hrm-production-env"
CONTAINER_APP_NAME="hrm-production-gateway"
CUSTOM_DOMAIN="api.hrzio.com"
LOCATION="centralindia"

echo "=========================================="
echo "  HRM API Custom Domain Setup"
echo "=========================================="
echo ""

# Step 1: Get the current Container App FQDN
echo "Step 1: Getting current Container App FQDN..."
CURRENT_FQDN=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.configuration.ingress.fqdn" \
  -o tsv)

echo "Current FQDN: $CURRENT_FQDN"
echo ""

# Step 2: DNS Setup Instructions
echo "=========================================="
echo "  DNS CONFIGURATION REQUIRED"
echo "=========================================="
echo ""
echo "Add the following CNAME record in your DNS provider:"
echo ""
echo "  Type:  CNAME"
echo "  Name:  api"
echo "  Value: $CURRENT_FQDN"
echo "  TTL:   300 (or default)"
echo ""
echo "Wait for DNS propagation (usually 5-30 minutes)"
echo ""

# Step 3: Verify DNS
echo "Step 2: Verifying DNS propagation..."
echo "Checking if api.hrzio.com resolves..."
if nslookup $CUSTOM_DOMAIN > /dev/null 2>&1; then
  echo "DNS resolution successful!"
else
  echo "WARNING: DNS not yet propagated. Please configure DNS first."
  echo ""
  echo "After configuring DNS, run this script again or continue manually."
  read -p "Press Enter to continue anyway, or Ctrl+C to exit..."
fi
echo ""

# Step 4: Add custom domain to Container App
echo "Step 3: Adding custom domain to Container App..."
az containerapp hostname add \
  --hostname $CUSTOM_DOMAIN \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP

echo ""

# Step 5: Configure managed certificate (free SSL)
echo "Step 4: Configuring managed SSL certificate..."
az containerapp hostname bind \
  --hostname $CUSTOM_DOMAIN \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --validation-method CNAME

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "API will be available at: https://$CUSTOM_DOMAIN/api"
echo ""
echo "SSL certificate may take a few minutes to provision."
echo "Check status with:"
echo "  az containerapp hostname list --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
