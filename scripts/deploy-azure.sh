#!/bin/bash
# ===========================================
# HRM Azure Deployment Script
# ===========================================
# Usage: ./scripts/deploy-azure.sh [environment]
# Example: ./scripts/deploy-azure.sh production

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="hrm"
RESOURCE_GROUP="${PROJECT_NAME}-${ENVIRONMENT}-rg"
AKS_CLUSTER="${PROJECT_NAME}-${ENVIRONMENT}-aks"
ACR_NAME="${PROJECT_NAME}${ENVIRONMENT}acr"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    command -v az >/dev/null 2>&1 || { log_error "Azure CLI is required but not installed."; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { log_error "kubectl is required but not installed."; exit 1; }
    command -v terraform >/dev/null 2>&1 || { log_error "Terraform is required but not installed."; exit 1; }
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed."; exit 1; }
    command -v helm >/dev/null 2>&1 || { log_error "Helm is required but not installed."; exit 1; }

    log_info "All prerequisites are installed"
}

# Check Azure login
check_azure_login() {
    log_step "Checking Azure login..."

    if ! az account show >/dev/null 2>&1; then
        log_warn "Not logged in to Azure. Running az login..."
        az login
    fi

    SUBSCRIPTION=$(az account show --query name -o tsv)
    log_info "Using Azure subscription: ${SUBSCRIPTION}"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log_step "Deploying Azure infrastructure with Terraform..."

    cd infrastructure/terraform

    # Initialize Terraform
    terraform init -upgrade

    # Validate
    terraform validate

    # Plan
    terraform plan -var="environment=${ENVIRONMENT}" -out=tfplan

    # Apply
    read -p "Apply Terraform changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        terraform apply tfplan
    else
        log_warn "Terraform apply skipped"
        return 1
    fi

    cd ../..
    log_info "Infrastructure deployment completed"
}

# Configure kubectl
configure_kubectl() {
    log_step "Configuring kubectl for AKS..."

    az aks get-credentials \
        --resource-group "${RESOURCE_GROUP}" \
        --name "${AKS_CLUSTER}" \
        --overwrite-existing

    kubectl cluster-info
    log_info "kubectl configured successfully"
}

# Login to ACR
login_acr() {
    log_step "Logging in to Azure Container Registry..."

    az acr login --name "${ACR_NAME}"
    log_info "ACR login successful"
}

# Build and push Docker images
build_and_push_images() {
    log_step "Building and pushing Docker images..."

    ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
    IMAGE_TAG=$(git rev-parse --short HEAD)

    # List of services
    SERVICES=(
        "api-gateway"
        "auth-service"
        "tenant-service"
        "employee-service"
        "attendance-service"
        "leave-service"
        "payroll-service"
        "notification-service"
        "reports-service"
        "websocket-service"
        "chat-service"
        "analytics-service"
        "document-service"
        "integration-service"
        "engagement-service"
        "ai-chatbot-service"
        "ai-ml-service"
        "workforce-service"
        "recruitment-service"
        "localization-service"
        "benefits-service"
        "onboarding-service"
        "compliance-service"
        "expense-service"
        "timesheet-service"
        "asset-service"
        "grievance-service"
        "billing-service"
    )

    # Build and push each service
    for service in "${SERVICES[@]}"; do
        log_info "Building ${service}..."
        docker build -t "${ACR_LOGIN_SERVER}/hrm/${service}:${IMAGE_TAG}" \
            -t "${ACR_LOGIN_SERVER}/hrm/${service}:latest" \
            "./services/${service}"

        log_info "Pushing ${service}..."
        docker push "${ACR_LOGIN_SERVER}/hrm/${service}:${IMAGE_TAG}"
        docker push "${ACR_LOGIN_SERVER}/hrm/${service}:latest"
    done

    # Build and push frontend
    log_info "Building frontend..."
    docker build -t "${ACR_LOGIN_SERVER}/hrm/frontend:${IMAGE_TAG}" \
        -t "${ACR_LOGIN_SERVER}/hrm/frontend:latest" \
        "./frontend"

    log_info "Pushing frontend..."
    docker push "${ACR_LOGIN_SERVER}/hrm/frontend:${IMAGE_TAG}"
    docker push "${ACR_LOGIN_SERVER}/hrm/frontend:latest"

    log_info "All images built and pushed successfully"
    export IMAGE_TAG
    export ACR_LOGIN_SERVER
}

# Install Kubernetes prerequisites
install_k8s_prerequisites() {
    log_step "Installing Kubernetes prerequisites..."

    # Install Nginx Ingress Controller
    if ! helm status ingress-nginx -n ingress-nginx >/dev/null 2>&1; then
        log_info "Installing Nginx Ingress Controller..."
        helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
        helm repo update
        helm install ingress-nginx ingress-nginx/ingress-nginx \
            --namespace ingress-nginx \
            --create-namespace \
            --set controller.replicaCount=2
    else
        log_info "Nginx Ingress Controller already installed"
    fi

    # Install cert-manager
    if ! kubectl get namespace cert-manager >/dev/null 2>&1; then
        log_info "Installing cert-manager..."
        kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml
        sleep 30  # Wait for cert-manager to be ready
    else
        log_info "cert-manager already installed"
    fi

    log_info "Kubernetes prerequisites installed"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    log_step "Deploying to Kubernetes..."

    NAMESPACE="hrm-${ENVIRONMENT}"

    # Create namespace
    kubectl apply -f infrastructure/kubernetes/base/namespace.yaml

    # Check if secrets exist
    if ! kubectl get secret hrm-secrets -n "${NAMESPACE}" >/dev/null 2>&1; then
        log_warn "Secrets not found. Please create secrets first."
        log_info "Run: kubectl create secret generic hrm-secrets --namespace ${NAMESPACE} --from-literal=..."
        return 1
    fi

    # Apply ConfigMap
    kubectl apply -f infrastructure/kubernetes/base/configmap.yaml

    # Deploy RabbitMQ
    kubectl apply -f infrastructure/kubernetes/base/rabbitmq.yaml

    # Deploy all services
    for file in infrastructure/kubernetes/services/*.yaml; do
        log_info "Applying ${file}..."
        envsubst < "$file" | kubectl apply -f -
    done

    # Apply Ingress
    kubectl apply -f infrastructure/kubernetes/base/ingress.yaml

    log_info "Kubernetes deployment completed"
}

# Wait for deployments
wait_for_deployments() {
    log_step "Waiting for deployments to be ready..."

    NAMESPACE="hrm-${ENVIRONMENT}"
    DEPLOYMENTS=$(kubectl get deployments -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}')

    for deployment in ${DEPLOYMENTS}; do
        log_info "Waiting for ${deployment}..."
        kubectl rollout status deployment/"${deployment}" -n "${NAMESPACE}" --timeout=300s || {
            log_warn "Deployment ${deployment} is not ready"
        }
    done

    log_info "All deployments are ready"
}

# Show deployment status
show_status() {
    log_step "Deployment Status"

    NAMESPACE="hrm-${ENVIRONMENT}"

    echo ""
    log_info "Pods:"
    kubectl get pods -n "${NAMESPACE}"

    echo ""
    log_info "Services:"
    kubectl get svc -n "${NAMESPACE}"

    echo ""
    log_info "Ingress:"
    kubectl get ingress -n "${NAMESPACE}"

    INGRESS_IP=$(kubectl get ingress hrm-ingress -n "${NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending")

    echo ""
    log_info "Application URLs:"
    echo "  Frontend: https://hrm.yourdomain.com (point DNS to ${INGRESS_IP})"
    echo "  API: https://api.hrm.yourdomain.com"
}

# Main execution
main() {
    echo "=========================================="
    echo "  HRM Azure Deployment"
    echo "  Environment: ${ENVIRONMENT}"
    echo "=========================================="
    echo ""

    check_prerequisites
    check_azure_login

    PS3="Select deployment option: "
    options=(
        "Full deployment (Infrastructure + Build + Deploy)"
        "Infrastructure only (Terraform)"
        "Build and push images only"
        "Deploy to Kubernetes only"
        "Show status"
        "Exit"
    )

    select opt in "${options[@]}"; do
        case $opt in
            "Full deployment (Infrastructure + Build + Deploy)")
                deploy_infrastructure
                configure_kubectl
                login_acr
                build_and_push_images
                install_k8s_prerequisites
                deploy_to_kubernetes
                wait_for_deployments
                show_status
                break
                ;;
            "Infrastructure only (Terraform)")
                deploy_infrastructure
                break
                ;;
            "Build and push images only")
                login_acr
                build_and_push_images
                break
                ;;
            "Deploy to Kubernetes only")
                configure_kubectl
                deploy_to_kubernetes
                wait_for_deployments
                show_status
                break
                ;;
            "Show status")
                configure_kubectl
                show_status
                break
                ;;
            "Exit")
                break
                ;;
            *)
                echo "Invalid option"
                ;;
        esac
    done
}

main "$@"
