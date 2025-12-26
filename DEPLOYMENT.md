# HRM SaaS Platform - Azure Deployment Guide

This guide provides comprehensive instructions for deploying the HRM SaaS Platform to Microsoft Azure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Initial Setup](#initial-setup)
4. [Infrastructure Deployment (Terraform)](#infrastructure-deployment-terraform)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Backup & Disaster Recovery](#backup--disaster-recovery)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

```bash
# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Terraform (v1.5+)
wget https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_linux_amd64.zip
unzip terraform_1.5.7_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# kubectl
az aks install-cli

# Helm (v3+)
curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash

# Docker
sudo apt-get install docker.io
```

### Azure Subscription Requirements

- Active Azure subscription with Owner or Contributor role
- Sufficient quota for:
  - Azure Kubernetes Service (AKS) nodes
  - Azure Cache for Redis
  - Azure Container Registry


### Required Secrets & API Keys

- OpenAI API Key (for AI features)
- SendGrid API Key (for email notifications)
- Razorpay API Keys (for billing)
- SSL Certificates (or use Let's Encrypt)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         Azure Cloud                               │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                      │
│  │  Azure Front    │    │   Application   │                      │
│  │     Door        │───▶│    Gateway      │                      │
│  └─────────────────┘    └────────┬────────┘                      │
│                                  │                                │
│  ┌───────────────────────────────┼───────────────────────────────┐
│  │              Azure Kubernetes Service (AKS)                   │
│  │  ┌─────────────────────────────────────────────────────────┐  │
│  │  │                    Ingress Controller                    │  │
│  │  └──────────────────────────┬──────────────────────────────┘  │
│  │                             │                                  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │
│  │  │Frontend │  │   API   │  │ Auth    │  │ Other Services  │  │
│  │  │ (React) │  │ Gateway │  │ Service │  │ (26 services)   │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘  │
│  └───────────────────────────────────────────────────────────────┘
│                                  │                                │
│  ┌───────────────────────────────┼───────────────────────────────┐
│  │                    Managed Services                           │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  │  MongoDB    │  │ Redis Cache │  │ Blob Storage        │   │
│  │  │  (in AKS)   │  │   (Azure)   │  │     (Azure)         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│  └───────────────────────────────────────────────────────────────┘
│                                                                   │
│  ┌───────────────────────────────────────────────────────────────┐
│  │                    Monitoring & Security                       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  │ App Insights│  │ Key Vault   │  │ Azure Monitor       │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘   │
│  └───────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────┘
```

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd HRM
```

### 2. Azure Login

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "<subscription-id>"

# Verify
az account show
```

### 3. Create Terraform State Storage

```bash
# Create resource group for Terraform state
az group create --name hrm-terraform-state-rg --location eastus

# Create storage account
az storage account create \
  --name hrmtfstate \
  --resource-group hrm-terraform-state-rg \
  --location eastus \
  --sku Standard_LRS \
  --encryption-services blob

# Get storage account key
ACCOUNT_KEY=$(az storage account keys list \
  --resource-group hrm-terraform-state-rg \
  --account-name hrmtfstate \
  --query '[0].value' -o tsv)

# Create blob container
az storage container create \
  --name tfstate \
  --account-name hrmtfstate \
  --account-key $ACCOUNT_KEY
```

---

## Infrastructure Deployment (Terraform)

### 1. Configure Variables

```bash
cd infrastructure/terraform

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit variables
nano terraform.tfvars
```

Update the following in `terraform.tfvars`:

```hcl
project_name = "hrm"
environment  = "production"
location     = "eastus"
owner        = "YourTeam"

# AKS Configuration
kubernetes_version    = "1.28.5"
aks_system_node_count = 2
aks_user_node_count   = 3

# Domain
domain_name = "hrm.yourdomain.com"

# Alerts
alert_email       = "ops@yourdomain.com"
slack_webhook_url = "https://hooks.slack.com/services/..."
```

**Note:** MongoDB is deployed internally within the AKS cluster for cost optimization.

### 2. Initialize and Apply Terraform

```bash
# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan deployment
terraform plan -out=tfplan

# Apply (this will take 15-30 minutes)
terraform apply tfplan
```

### 3. Get Outputs

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group hrm-production-rg \
  --name hrm-production-aks

# Verify connection
kubectl get nodes

# Get other outputs
terraform output -json > ../outputs.json
```

---

## Kubernetes Deployment

### 1. Install Prerequisites

```bash
# Install Nginx Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux \
  --set defaultBackend.nodeSelector."kubernetes\.io/os"=linux

# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml
```

### 2. Create Namespace and Secrets

```bash
# Apply namespaces
kubectl apply -f infrastructure/kubernetes/base/namespace.yaml

# Deploy MongoDB first
kubectl apply -f infrastructure/kubernetes/base/mongodb.yaml

# Create secrets (update values first!)
# Option 1: Using kubectl
kubectl create secret generic hrm-secrets \
  --namespace hrm-production \
  --from-literal=MONGODB_URI="mongodb://root:HRM_MongoDB_2024_Secure!@mongodb.hrm-production.svc.cluster.local:27017/?authSource=admin" \
  --from-literal=REDIS_URL="your-redis-connection-string" \
  --from-literal=JWT_ACCESS_SECRET="$(openssl rand -base64 64)" \
  --from-literal=JWT_REFRESH_SECRET="$(openssl rand -base64 64)" \
  --from-literal=RABBITMQ_PASSWORD="$(openssl rand -base64 32)" \
  --from-literal=OPENAI_API_KEY="your-openai-key" \
  --from-literal=SMTP_USER="apikey" \
  --from-literal=SMTP_PASS="your-sendgrid-key" \
  --from-literal=RAZORPAY_KEY_ID="your-razorpay-id" \
  --from-literal=RAZORPAY_KEY_SECRET="your-razorpay-secret" \
  --from-literal=RAZORPAY_WEBHOOK_SECRET="your-webhook-secret" \
  --from-literal=AZURE_STORAGE_CONNECTION_STRING="your-storage-connection" \
  --from-literal=APPINSIGHTS_INSTRUMENTATIONKEY="your-app-insights-key"

# Or Option 2: Use Azure Key Vault CSI Driver
kubectl apply -f infrastructure/kubernetes/base/secrets.yaml
```

### 3. Deploy Services

```bash
# Set environment variables for image tags
export ACR_LOGIN_SERVER="hrmproductionacr.azurecr.io"
export IMAGE_TAG="latest"

# Deploy ConfigMap
kubectl apply -f infrastructure/kubernetes/base/configmap.yaml

# Deploy RabbitMQ
kubectl apply -f infrastructure/kubernetes/base/rabbitmq.yaml

# Deploy all services
envsubst < infrastructure/kubernetes/services/api-gateway.yaml | kubectl apply -f -
envsubst < infrastructure/kubernetes/services/all-services.yaml | kubectl apply -f -

# Deploy Ingress
kubectl apply -f infrastructure/kubernetes/base/ingress.yaml
```

### 4. Verify Deployment

```bash
# Check all pods
kubectl get pods -n hrm-production

# Check services
kubectl get svc -n hrm-production

# Check ingress
kubectl get ingress -n hrm-production

# Check logs
kubectl logs -n hrm-production deployment/api-gateway --tail=100
```

---

## CI/CD Pipeline Setup

### 1. Create Azure Service Principal

```bash
# Create service principal for GitHub Actions
az ad sp create-for-rbac \
  --name "hrm-github-actions" \
  --role contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/hrm-production-rg \
  --sdk-auth

# Save the JSON output - this will be AZURE_CREDENTIALS secret
```

### 2. Configure GitHub Secrets

Add these secrets to your GitHub repository:

| Secret Name | Description |
|-------------|-------------|
| `AZURE_CREDENTIALS` | Service principal JSON from above |
| `ACR_USERNAME` | ACR admin username |
| `ACR_PASSWORD` | ACR admin password |
| `VITE_API_URL` | Production API URL (https://api.hrm.yourdomain.com) |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications |

### 3. Trigger Pipeline

```bash
# Push to main branch to trigger deployment
git add .
git commit -m "Configure production deployment"
git push origin main
```

---

## Post-Deployment Configuration

### 1. Configure DNS

Point your domain to the Ingress IP:

```bash
# Get Ingress IP
kubectl get ingress hrm-ingress -n hrm-production -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Create DNS A records:
# hrm.yourdomain.com -> <ingress-ip>
# api.hrm.yourdomain.com -> <ingress-ip>
# ws.hrm.yourdomain.com -> <ingress-ip>
```

### 2. Initialize Database

```bash
# Run database seeding (if needed)
kubectl exec -it deployment/auth-service -n hrm-production -- npm run seed
```

### 3. Create Super Admin

```bash
# Run super admin creation script
kubectl exec -it deployment/auth-service -n hrm-production -- node scripts/create-super-admin.js
```

---

## Monitoring & Alerting

### 1. Access Azure Monitor

Navigate to Azure Portal > Monitor > Application Insights > hrm-production-appinsights

### 2. Key Dashboards

- **Application Map**: View service dependencies
- **Performance**: Response times and throughput
- **Failures**: Error rates and exceptions
- **Metrics**: Custom metrics and KPIs

### 3. Set Up Alerts

```bash
# Alerts are configured via Terraform, but you can add more:
az monitor metrics alert create \
  --name "high-error-rate" \
  --resource-group hrm-production-rg \
  --scopes "/subscriptions/<sub-id>/resourceGroups/hrm-production-rg/providers/Microsoft.Insights/components/hrm-production-appinsights" \
  --condition "avg requests/failed > 10" \
  --window-size 5m \
  --evaluation-frequency 1m
```

---

## Backup & Disaster Recovery

### 1. Automated MongoDB Backups

MongoDB is deployed within the AKS cluster. For manual backups stored in Azure:

```bash
# Set environment variables
export MONGODB_URI="mongodb://root:HRM_MongoDB_2024_Secure!@mongodb.hrm-production.svc.cluster.local:27017/?authSource=admin"
export AZURE_STORAGE_ACCOUNT="hrmprodstorage"
export AZURE_STORAGE_KEY="your-storage-key"

# Run backup (from within the cluster or port-forward)
./scripts/backup/backup-mongodb.sh
```

**Note:** For production, configure scheduled CronJobs for automated backups.

### 2. Schedule Backups (Kubernetes CronJob)

```bash
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: hrm-production
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mongo:7.0
            command: ["/scripts/backup-mongodb.sh"]
            envFrom:
            - secretRef:
                name: hrm-secrets
          restartPolicy: OnFailure
EOF
```

### 3. Restore from Backup

```bash
# List available backups
./scripts/backup/restore-mongodb.sh list

# Restore from specific backup
./scripts/backup/restore-mongodb.sh restore mongodb/hrm_backup_20241225_120000.tar.gz

# Restore latest
./scripts/backup/restore-mongodb.sh latest
```

---

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n hrm-production

# Check events
kubectl get events -n hrm-production --sort-by='.lastTimestamp'
```

#### 2. Database Connection Issues

```bash
# Test MongoDB connection
kubectl run mongo-test --rm -it --image=mongo:7.0 -- \
  mongosh "your-connection-string" --eval "db.adminCommand('ping')"
```

#### 3. Service Communication Issues

```bash
# Test internal DNS
kubectl run dns-test --rm -it --image=busybox -- \
  nslookup auth-service.hrm-production.svc.cluster.local
```

#### 4. Check Logs

```bash
# Follow logs
kubectl logs -f deployment/api-gateway -n hrm-production

# Get previous logs (if container restarted)
kubectl logs deployment/api-gateway -n hrm-production --previous
```

### Health Checks

```bash
# Check service health
kubectl exec deployment/api-gateway -n hrm-production -- curl localhost:3000/health

# Check all services
for svc in api-gateway auth-service employee-service; do
  echo "Checking $svc..."
  kubectl exec deployment/$svc -n hrm-production -- curl -s localhost:300X/health
done
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment api-gateway --replicas=5 -n hrm-production

# Check HPA status
kubectl get hpa -n hrm-production
```

---

## Support

For issues and support:
- GitHub Issues: [repository-url]/issues
- Email: devops@yourdomain.com
- Slack: #hrm-support

---

## Quick Reference

### Useful Commands

```bash
# Get all resources
kubectl get all -n hrm-production

# Port forward for local debugging
kubectl port-forward svc/api-gateway 3000:3000 -n hrm-production

# Restart a deployment
kubectl rollout restart deployment/api-gateway -n hrm-production

# Check rollout status
kubectl rollout status deployment/api-gateway -n hrm-production

# Rollback deployment
kubectl rollout undo deployment/api-gateway -n hrm-production
```

### Azure Resources

| Resource | Name | Purpose |
|----------|------|---------|
| Resource Group | hrm-production-rg | Container for all resources |
| AKS Cluster | hrm-production-aks | Kubernetes cluster |
| ACR | hrmproductionacr | Docker image registry |
| Redis Cache | hrm-production-redis | Caching layer |
| Key Vault | hrm-production-kv | Secrets management |
| Storage Account | hrmprodstorage | Blob storage for documents |
| App Insights | hrm-production-appinsights | Monitoring |

### Internal Services (in AKS)

| Service | Type | Purpose |
|---------|------|---------|
| MongoDB | StatefulSet | Primary database (cost-optimized) |
