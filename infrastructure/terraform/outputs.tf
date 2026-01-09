# ============================================================================
# HRM SaaS Platform - Terraform Outputs
# Budget-Optimized Production Deployment
# ============================================================================

# ============================================================================
# Resource Group
# ============================================================================

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.hrm.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.hrm.location
}

output "resource_group_id" {
  description = "ID of the resource group"
  value       = azurerm_resource_group.hrm.id
}

# ============================================================================
# Networking
# ============================================================================

output "virtual_network_name" {
  description = "Virtual network name"
  value       = azurerm_virtual_network.hrm.name
}

output "virtual_network_id" {
  description = "Virtual network ID"
  value       = azurerm_virtual_network.hrm.id
}

# ============================================================================
# Summary Output (for quick reference)
# ============================================================================

output "deployment_summary" {
  description = "Summary of deployed resources and their endpoints"
  value = {
    # Frontend
    frontend_url = "https://${azurerm_static_site.frontend.default_host_name}"

    # API
    api_gateway_url = "https://${azurerm_container_app.gateway.ingress[0].fqdn}"

    # Database
    cosmosdb_endpoint = azurerm_cosmosdb_account.hrm.endpoint

    # Cache
    redis_host = azurerm_redis_cache.hrm.hostname

    # Storage
    storage_endpoint = azurerm_storage_account.hrm.primary_blob_endpoint

    # Monitoring
    app_insights_name = azurerm_application_insights.hrm.name

    # Key Vault
    key_vault_uri = azurerm_key_vault.hrm.vault_uri

    # Container Registry
    acr_login_server = azurerm_container_registry.hrm.login_server
  }
}

# ============================================================================
# CI/CD Pipeline Variables
# ============================================================================

output "cicd_variables" {
  description = "Variables needed for CI/CD pipelines"
  value = {
    azure_resource_group     = azurerm_resource_group.hrm.name
    azure_location           = azurerm_resource_group.hrm.location
    acr_login_server         = azurerm_container_registry.hrm.login_server
    container_app_env_name   = azurerm_container_app_environment.hrm.name
    static_webapp_name       = azurerm_static_site.frontend.name
    key_vault_name           = azurerm_key_vault.hrm.name
  }
  sensitive = false
}

output "cicd_secrets" {
  description = "Secrets needed for CI/CD pipelines (store securely)"
  value = {
    acr_username                 = azurerm_container_registry.hrm.admin_username
    static_webapp_deployment_key = azurerm_static_site.frontend.api_key
  }
  sensitive = true
}

# ============================================================================
# Environment Variables for Services
# ============================================================================

output "service_env_vars" {
  description = "Environment variables for microservices"
  value = {
    NODE_ENV                        = "production"
    MONGODB_URI                     = "Use Key Vault secret: cosmosdb-connection-string"
    REDIS_URL                       = "Use Key Vault secret: redis-connection-string"
    STORAGE_CONNECTION_STRING       = "Use Key Vault secret: storage-connection-string"
    JWT_ACCESS_SECRET               = "Use Key Vault secret: jwt-access-secret"
    JWT_REFRESH_SECRET              = "Use Key Vault secret: jwt-refresh-secret"
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.hrm.connection_string
  }
  sensitive = true
}

# ============================================================================
# Cost Estimation
# ============================================================================

output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown"
  value = {
    static_web_app      = "$9/month (Standard tier)"
    container_apps      = "$250-350/month (scale-to-zero enabled)"
    cosmosdb_serverless = "$250-350/month (pay per RU consumed)"
    redis_basic         = "$40/month (Basic C1)"
    key_vault           = "$3/month (Standard)"
    container_registry  = "$5/month (Basic)"
    storage             = "$5-10/month (LRS)"
    monitoring          = "$0/month (5GB free tier)"
    total_estimated     = "$562-767/month"
  }
}

# ============================================================================
# Next Steps
# ============================================================================

output "next_steps" {
  description = "Next steps after deployment"
  value = <<-EOT

    ========================================
    HRM Platform Deployed Successfully!
    ========================================

    Next Steps:

    1. Build and push Docker images:
       az acr login --name ${azurerm_container_registry.hrm.name}
       docker build -t ${azurerm_container_registry.hrm.login_server}/hrm-api-gateway:latest ./services/api-gateway
       docker push ${azurerm_container_registry.hrm.login_server}/hrm-api-gateway:latest

    2. Deploy frontend to Static Web App:
       cd frontend
       npm run build
       swa deploy ./dist --deployment-token <use cicd_secrets.static_webapp_deployment_key>

    3. Configure custom domain (optional):
       - Add CNAME record pointing to: ${azurerm_static_site.frontend.default_host_name}
       - Add API CNAME pointing to: ${azurerm_container_app.gateway.ingress[0].fqdn}

    4. Update mobile app API URL:
       - Update to: https://${azurerm_container_app.gateway.ingress[0].fqdn}/api

    5. Monitor your application:
       - Azure Portal > Application Insights > ${azurerm_application_insights.hrm.name}

    6. Access secrets:
       az keyvault secret list --vault-name ${azurerm_key_vault.hrm.name}

    ========================================
  EOT
}
