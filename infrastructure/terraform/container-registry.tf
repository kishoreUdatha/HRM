# ============================================================================
# Azure Container Registry (Basic SKU - Budget Optimized)
# Estimated Cost: ~$5/month
# ============================================================================

resource "azurerm_container_registry" "hrm" {
  name                = "${var.project_name}${var.environment}acr${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.hrm.name
  location            = azurerm_resource_group.hrm.location
  sku                 = var.acr_sku  # Basic = $5/month
  admin_enabled       = true

  tags = local.common_tags
}

# ============================================================================
# Output for CI/CD pipelines
# ============================================================================

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
