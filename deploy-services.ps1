$ACR = "hrmproductionacr.azurecr.io"
$TAG = "latest"
$ROOT = "C:\Users\KishoreUdatha\IdeaProjects\HRM"

# Create ConfigMap
kubectl create configmap hrm-config `
  --namespace hrm-production `
  --from-literal=NODE_ENV=production `
  --from-literal=LOG_LEVEL=info `
  --from-literal=API_GATEWAY_URL=http://api-gateway:3000 `
  --dry-run=client -o yaml | kubectl apply -f -

# Create ServiceAccount
@"
apiVersion: v1
kind: ServiceAccount
metadata:
  name: hrm-service-account
  namespace: hrm-production
"@ | kubectl apply -f -

# Read the all-services.yaml, substitute variables, and apply
$content = Get-Content "$ROOT\infrastructure\kubernetes\services\all-services.yaml" -Raw
$content = $content -replace '\$\{ACR_LOGIN_SERVER\}', $ACR
$content = $content -replace '\$\{IMAGE_TAG\}', $TAG

# Remove RABBITMQ_URL references since we don't have it
$content = $content -replace '(?s)- name: RABBITMQ_URL.*?key: RABBITMQ_URL', ''

$content | kubectl apply -f -

# Apply API Gateway
$gwContent = Get-Content "$ROOT\infrastructure\kubernetes\services\api-gateway.yaml" -Raw
$gwContent = $gwContent -replace '\$\{ACR_LOGIN_SERVER\}', $ACR
$gwContent = $gwContent -replace '\$\{IMAGE_TAG\}', $TAG
$gwContent | kubectl apply -f -

Write-Host "Services deployed!" -ForegroundColor Green
kubectl get deployments -n hrm-production
