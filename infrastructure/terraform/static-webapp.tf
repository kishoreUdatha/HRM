# ============================================================================
# Azure Static Web Apps (Frontend)
# Standard tier for custom domains and SLA
# Estimated Cost: ~$9/month
# ============================================================================

resource "azurerm_static_site" "frontend" {
  name                = "${local.name_prefix}-frontend"
  resource_group_name = azurerm_resource_group.hrm.name
  location            = "eastasia"  # East Asia (closest to India for Static Web Apps)

  sku_tier = var.static_webapp_sku_tier
  sku_size = var.static_webapp_sku_size

  tags = local.common_tags
}

# ============================================================================
# CDN Profile - REMOVED (Classic Azure CDN SKUs deprecated)
# Consider using Azure Front Door for CDN if needed in the future
# This saves ~$25/month and simplifies the initial deployment
# ============================================================================

# ============================================================================
# DNS Zone (Optional - only if managing DNS in Azure)
# ============================================================================

resource "azurerm_dns_zone" "hrm" {
  count               = var.create_dns_zone && var.domain_name != "" ? 1 : 0
  name                = var.domain_name
  resource_group_name = azurerm_resource_group.hrm.name

  tags = local.common_tags
}

# ============================================================================
# Outputs
# ============================================================================

output "static_webapp_url" {
  description = "Static Web App default URL"
  value       = azurerm_static_site.frontend.default_host_name
}

output "static_webapp_api_key" {
  description = "Static Web App API key for deployments"
  value       = azurerm_static_site.frontend.api_key
  sensitive   = true
}
