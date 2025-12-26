# Azure CI/CD Setup Guide

## Overview

This guide explains how to set up GitHub Actions CI/CD to automatically deploy HRM services to Azure Container Apps.

## Architecture

```
GitHub Repository
       │
       ▼ (Push to main/master)
GitHub Actions
       │
       ├── Build Docker Images
       │
       ▼
Azure Container Registry (ACR)
       │
       ▼
Azure Container Apps
```

## Prerequisites

1. Azure subscription
2. GitHub repository with Actions enabled
3. Azure CLI installed locally (for initial setup)

## Step 1: Create Azure Resources

Run these commands to set up the required Azure resources:

```bash
# Login to Azure
az login

# Set variables
RESOURCE_GROUP="hrm-rg"
LOCATION="eastus"
ACR_NAME="hrmacr$(openssl rand -hex 4)"  # Must be globally unique
CONTAINER_ENV="hrm-env"

# Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

echo "ACR_NAME: $ACR_NAME"
echo "ACR_USERNAME: $ACR_USERNAME"
echo "ACR_PASSWORD: $ACR_PASSWORD"

# Create Container Apps Environment
az containerapp env create \
  --name $CONTAINER_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

## Step 2: Create Azure Service Principal

Create a service principal for GitHub Actions:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "hrm-github-actions" \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth

# Save the JSON output - this is your AZURE_CREDENTIALS secret
```

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `AZURE_CREDENTIALS` | Azure service principal JSON | Output from Step 2 |
| `ACR_NAME` | Container registry name | e.g., `hrmacr1234` |
| `ACR_USERNAME` | ACR admin username | From Step 1 output |
| `ACR_PASSWORD` | ACR admin password | From Step 1 output |

### AZURE_CREDENTIALS Format

```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

## Step 4: Update Workflow Configuration

Edit `.github/workflows/deploy-azure.yml` and update these values:

```yaml
env:
  AZURE_RESOURCE_GROUP: hrm-rg          # Your resource group name
  ACR_NAME: hrmacr1234                   # Your ACR name
  CONTAINER_APP_ENV: hrm-env             # Your container app environment
  LOCATION: eastus                        # Your Azure region
```

## Step 5: Trigger Deployment

### Automatic Deployment
Push to `main` or `master` branch:
```bash
git add .
git commit -m "Deploy to Azure"
git push origin main
```

### Manual Deployment
1. Go to GitHub → Actions
2. Select "Deploy to Azure" workflow
3. Click "Run workflow"
4. Select service and environment
5. Click "Run workflow"

## Monitoring Deployments

### GitHub Actions
- Go to repository → Actions tab
- View workflow runs and logs

### Azure Portal
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Resource Groups → hrm-rg
3. View Container Apps and their logs

### Azure CLI
```bash
# List container apps
az containerapp list --resource-group hrm-rg --output table

# View logs
az containerapp logs show \
  --name hrm-api-gateway \
  --resource-group hrm-rg \
  --follow

# Get app URL
az containerapp show \
  --name hrm-frontend \
  --resource-group hrm-rg \
  --query "properties.configuration.ingress.fqdn" -o tsv
```

## Environment Variables

Set environment variables for container apps:

```bash
# Set environment variables for a service
az containerapp update \
  --name hrm-api-gateway \
  --resource-group hrm-rg \
  --set-env-vars \
    NODE_ENV=production \
    JWT_SECRET=your-secret \
    MONGODB_URI=your-mongodb-uri
```

## Database Setup

### Internal MongoDB (Cost-Optimized)

HRM uses MongoDB deployed within the AKS cluster for cost optimization:

1. Deploy MongoDB StatefulSet in your AKS cluster:
   ```bash
   kubectl apply -f infrastructure/kubernetes/base/mongodb.yaml
   ```

2. The MongoDB connection string for internal services:
   ```
   mongodb://root:HRM_MongoDB_2024_Secure!@mongodb.hrm-production.svc.cluster.local:27017/?authSource=admin
   ```

3. For Container Apps, you can connect to the AKS MongoDB via:
   - VNet integration with AKS
   - Or expose MongoDB via LoadBalancer (not recommended for production)

## Scaling Configuration

```bash
# Update scaling rules
az containerapp update \
  --name hrm-api-gateway \
  --resource-group hrm-rg \
  --min-replicas 1 \
  --max-replicas 10 \
  --scale-rule-name http-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 100
```

## Troubleshooting

### Build Failures
1. Check GitHub Actions logs
2. Verify Dockerfile syntax
3. Ensure all dependencies are in package.json

### Deployment Failures
1. Check Azure credentials are valid
2. Verify ACR credentials
3. Check container app logs:
   ```bash
   az containerapp logs show --name hrm-api-gateway --resource-group hrm-rg
   ```

### Connection Issues
1. Verify container apps are running
2. Check ingress configuration
3. Verify environment variables

## Cost Optimization

1. Use consumption-based pricing
2. Set appropriate min/max replicas
3. Use Azure Spot instances for non-production
4. Enable auto-shutdown for dev/staging

## Security Best Practices

1. Use managed identities instead of passwords
2. Store secrets in Azure Key Vault
3. Enable HTTPS only
4. Configure network policies
5. Regular security scanning with Trivy
