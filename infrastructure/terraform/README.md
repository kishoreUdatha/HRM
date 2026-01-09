# HRM SaaS Platform - Azure Infrastructure (Terraform)

Budget-optimized Azure deployment for the HRM SaaS platform.

## Cost Estimate: $700-900/month

| Service | SKU | Monthly Cost |
|---------|-----|--------------|
| Azure Static Web Apps | Standard | ~$9 |
| Azure Container Apps | Consumption | ~$250-350 |
| Azure CosmosDB | Serverless | ~$250-350 |
| Azure Cache for Redis | Basic C1 | ~$40 |
| Azure Key Vault | Standard | ~$3 |
| Azure Container Registry | Basic | ~$5 |
| Azure CDN | Standard Microsoft | ~$25 |
| Azure Storage | LRS | ~$5-10 |
| Azure Monitor | Free tier | ~$0 |
| **Total** | | **~$587-792** |

## Architecture

```
                    ┌─────────────────────────────────┐
                    │     Azure CDN (Standard)        │
                    └─────────────────┬───────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────┐
│  Static Web App │       │  Container Apps     │       │  Container Apps │
│   (Frontend)    │       │   (API Gateway)     │       │  (Services)     │
└─────────────────┘       └─────────────────────┘       └─────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────┐
│ CosmosDB        │       │ Redis Cache         │       │ RabbitMQ        │
│ (Serverless)    │       │ (Basic C1)          │       │ (Container)     │
└─────────────────┘       └─────────────────────┘       └─────────────────┘
```

## Prerequisites

1. Azure CLI installed and logged in
2. Terraform >= 1.5.0
3. Docker for building images

## Quick Start

### 1. Login to Azure

```bash
az login
az account set --subscription "Your Subscription Name"
```

### 2. Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### 3. Configure Variables

```bash
# Copy and edit the tfvars file
cp environments/production/terraform.tfvars terraform.tfvars

# Set secrets via environment variables
export TF_VAR_alert_email="your-email@example.com"
export TF_VAR_smtp_user="your-smtp-user"
export TF_VAR_smtp_pass="your-smtp-password"
```

### 4. Plan and Apply

```bash
# Preview changes
terraform plan

# Apply infrastructure
terraform apply
```

### 5. Build and Deploy Containers

```bash
# Get ACR login server
ACR_NAME=$(terraform output -raw acr_login_server)

# Login to ACR
az acr login --name $ACR_NAME

# Build and push images
docker build -t $ACR_NAME/hrm-api-gateway:latest ./services/api-gateway
docker push $ACR_NAME/hrm-api-gateway:latest

# Repeat for other services...
```

### 6. Deploy Frontend

```bash
# Get deployment token
DEPLOY_TOKEN=$(terraform output -raw cicd_secrets | jq -r '.static_webapp_deployment_key')

# Build and deploy
cd frontend
npm run build
npx @azure/static-web-apps-cli deploy ./dist --deployment-token $DEPLOY_TOKEN
```

## File Structure

```
terraform/
├── versions.tf           # Provider versions
├── variables.tf          # Input variables
├── main.tf              # Resource group and VNet
├── container-registry.tf # Azure Container Registry
├── cosmosdb.tf          # CosmosDB Serverless
├── redis.tf             # Azure Cache for Redis
├── container-apps.tf    # Container Apps (8 services)
├── static-webapp.tf     # Static Web Apps + CDN
├── keyvault.tf          # Azure Key Vault
├── storage.tf           # Azure Storage Account
├── monitoring.tf        # App Insights + Alerts
├── outputs.tf           # Output values
└── environments/
    └── production/
        └── terraform.tfvars  # Production config
```

## Container Apps Services

| Container App | Services | Min Replicas | Max Replicas |
|--------------|----------|--------------|--------------|
| gateway | API Gateway | 1 (always on) | 5 |
| core | Auth, Tenant, Employee | 0 | 3 |
| hr | Attendance, Leave, Timesheet | 0 | 3 |
| payroll | Payroll, Benefits, Expense | 0 | 3 |
| comm | Notification, WebSocket, Chat | 0 | 3 |
| analytics | Reports, Analytics, Document | 0 | 3 |
| workforce | Recruitment, Onboarding, Compliance | 0 | 3 |
| rabbitmq | Message Broker | 1 | 1 |

## Scaling for Growth

As traffic increases, adjust these variables:

```hcl
# Increase minimum replicas for critical services
container_apps = {
  "gateway" = {
    min_replicas = 2  # Increase for high traffic
    max_replicas = 10
    ...
  }
  "core" = {
    min_replicas = 1  # Keep warm for faster response
    max_replicas = 5
    ...
  }
}

# Upgrade Redis to Standard for replication
redis_sku = "Standard"

# Enable geo-redundant storage
storage_replication_type = "GRS"
```

## Useful Commands

```bash
# View all outputs
terraform output

# Get specific output
terraform output api_gateway_url

# Get sensitive output
terraform output -raw cosmosdb_connection_string

# Destroy infrastructure (careful!)
terraform destroy
```

## Troubleshooting

### Container Apps not starting
```bash
# Check logs
az containerapp logs show -n hrm-production-gateway -g hrm-production-rg
```

### CosmosDB connection issues
```bash
# Verify connection string in Key Vault
az keyvault secret show --vault-name hrm-production-kv --name cosmosdb-connection-string
```

### Redis connection issues
```bash
# Test Redis connectivity
az redis show --name hrm-production-redis --resource-group hrm-production-rg
```

## Support

For issues, check:
1. Azure Portal > Resource Group > Activity Log
2. Application Insights > Failures
3. Container Apps > Logs
