$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Set-Location "C:\Users\KishoreUdatha\IdeaProjects\HRM\infrastructure\terraform"

# Get values from Terraform outputs
$REDIS_URL = terraform output -raw redis_connection_string
$STORAGE_CONN = terraform output -raw storage_connection_string
$APPINSIGHTS_KEY = terraform output -raw application_insights_instrumentation_key

# Internal MongoDB connection string (deployed in AKS)
# Must match the password in infrastructure/kubernetes/base/mongodb.yaml
$MONGO_URI = "mongodb://root:HRM_MongoDB_2024_Secure!@mongodb.hrm-production.svc.cluster.local:27017/?authSource=admin"

# Generate random secrets
$JWT_ACCESS = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))
$JWT_REFRESH = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))

Set-Location "C:\Users\KishoreUdatha\IdeaProjects\HRM"

# Delete existing secret if exists
kubectl delete secret hrm-secrets -n hrm-production --ignore-not-found

# Create Kubernetes secrets
kubectl create secret generic hrm-secrets `
  --namespace hrm-production `
  --from-literal=MONGODB_URI="$MONGO_URI" `
  --from-literal=REDIS_URL="$REDIS_URL" `
  --from-literal=AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONN" `
  --from-literal=APPINSIGHTS_INSTRUMENTATIONKEY="$APPINSIGHTS_KEY" `
  --from-literal=JWT_ACCESS_SECRET="$JWT_ACCESS" `
  --from-literal=JWT_REFRESH_SECRET="$JWT_REFRESH" `
  --from-literal=NODE_ENV="production"

Write-Host "Secrets created successfully!" -ForegroundColor Green
Write-Host "MongoDB connection using internal AKS deployment" -ForegroundColor Cyan
