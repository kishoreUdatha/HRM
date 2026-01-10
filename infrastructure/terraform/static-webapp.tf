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
# Custom Domain for Static Web App
# ============================================================================

resource "azurerm_static_site_custom_domain" "apex" {
  count           = var.domain_name != "" ? 1 : 0
  static_site_id  = azurerm_static_site.frontend.id
  domain_name     = var.domain_name
  validation_type = "dns-txt-token"
}

resource "azurerm_static_site_custom_domain" "www" {
  count           = var.domain_name != "" ? 1 : 0
  static_site_id  = azurerm_static_site.frontend.id
  domain_name     = "www.${var.domain_name}"
  validation_type = "cname-delegation"
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

output "custom_domain_validation_token" {
  description = "DNS TXT record value for domain validation (add as TXT record for apex domain)"
  value       = var.domain_name != "" ? azurerm_static_site_custom_domain.apex[0].validation_token : null
}

output "custom_domain_dns_instructions" {
  description = "DNS configuration instructions"
  value       = var.domain_name != "" ? <<-EOT
    DNS Configuration for ${var.domain_name}:

    1. Apex Domain (${var.domain_name}):
       - Add TXT record: @ -> ${azurerm_static_site_custom_domain.apex[0].validation_token}
       - Add ALIAS/ANAME record: @ -> ${azurerm_static_site.frontend.default_host_name}
       (or use Azure DNS Zone for apex domain support)

    2. WWW Subdomain (www.${var.domain_name}):
       - Add CNAME record: www -> ${azurerm_static_site.frontend.default_host_name}
  EOT
  : null
}
