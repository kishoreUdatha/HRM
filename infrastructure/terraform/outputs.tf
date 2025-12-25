# ===========================================
# HRM SaaS Platform - Terraform Outputs
# ===========================================

# ===========================================
# RESOURCE GROUP
# ===========================================

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.hrm.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.hrm.location
}

# ===========================================
# AZURE CONTAINER REGISTRY
# ===========================================

output "acr_login_server" {
  description = "ACR login server URL"
  value       = azurerm_container_registry.hrm.login_server
}

output "acr_admin_username" {
  description = "ACR admin username"
  value       = azurerm_container_registry.hrm.admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "ACR admin password"
  value       = azurerm_container_registry.hrm.admin_password
  sensitive   = true
}

# ===========================================
# AZURE KUBERNETES SERVICE
# ===========================================

output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.hrm.name
}

output "aks_cluster_id" {
  description = "ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.hrm.id
}

output "aks_kube_config" {
  description = "Kubernetes config for kubectl"
  value       = azurerm_kubernetes_cluster.hrm.kube_config_raw
  sensitive   = true
}

output "aks_host" {
  description = "AKS API server host"
  value       = azurerm_kubernetes_cluster.hrm.kube_config[0].host
  sensitive   = true
}

output "aks_cluster_fqdn" {
  description = "AKS cluster FQDN"
  value       = azurerm_kubernetes_cluster.hrm.fqdn
}

# ===========================================
# COSMOS DB (MongoDB)
# ===========================================

output "cosmosdb_endpoint" {
  description = "Cosmos DB endpoint"
  value       = azurerm_cosmosdb_account.hrm.endpoint
}

output "cosmosdb_connection_string" {
  description = "Cosmos DB MongoDB connection string"
  value       = azurerm_cosmosdb_account.hrm.primary_mongodb_connection_string
  sensitive   = true
}

output "cosmosdb_primary_key" {
  description = "Cosmos DB primary key"
  value       = azurerm_cosmosdb_account.hrm.primary_key
  sensitive   = true
}

# ===========================================
# AZURE CACHE FOR REDIS
# ===========================================

output "redis_hostname" {
  description = "Redis cache hostname"
  value       = azurerm_redis_cache.hrm.hostname
}

output "redis_port" {
  description = "Redis cache SSL port"
  value       = azurerm_redis_cache.hrm.ssl_port
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = azurerm_redis_cache.hrm.primary_connection_string
  sensitive   = true
}

output "redis_primary_access_key" {
  description = "Redis primary access key"
  value       = azurerm_redis_cache.hrm.primary_access_key
  sensitive   = true
}

# ===========================================
# STORAGE ACCOUNT
# ===========================================

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.hrm.name
}

output "storage_account_primary_key" {
  description = "Storage account primary access key"
  value       = azurerm_storage_account.hrm.primary_access_key
  sensitive   = true
}

output "storage_connection_string" {
  description = "Storage account connection string"
  value       = azurerm_storage_account.hrm.primary_connection_string
  sensitive   = true
}

output "storage_blob_endpoint" {
  description = "Storage account blob endpoint"
  value       = azurerm_storage_account.hrm.primary_blob_endpoint
}

# ===========================================
# KEY VAULT
# ===========================================

output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.hrm.name
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.hrm.vault_uri
}

# ===========================================
# MONITORING
# ===========================================

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = azurerm_log_analytics_workspace.hrm.id
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.hrm.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.hrm.connection_string
  sensitive   = true
}

# ===========================================
# NETWORKING
# ===========================================

output "app_gateway_public_ip" {
  description = "Application Gateway public IP address"
  value       = azurerm_public_ip.appgw.ip_address
}

output "app_gateway_fqdn" {
  description = "Application Gateway FQDN"
  value       = azurerm_public_ip.appgw.fqdn
}

# ===========================================
# GENERATED SECRETS (Reference only)
# ===========================================

output "jwt_access_secret_key_vault_id" {
  description = "Key Vault secret ID for JWT access secret"
  value       = azurerm_key_vault_secret.jwt_access_secret.id
}

output "jwt_refresh_secret_key_vault_id" {
  description = "Key Vault secret ID for JWT refresh secret"
  value       = azurerm_key_vault_secret.jwt_refresh_secret.id
}

# ===========================================
# KUBECTL CONFIGURATION COMMAND
# ===========================================

output "configure_kubectl" {
  description = "Command to configure kubectl"
  value       = "az aks get-credentials --resource-group ${azurerm_resource_group.hrm.name} --name ${azurerm_kubernetes_cluster.hrm.name}"
}
