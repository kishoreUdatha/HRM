# ============================================================================
# Azure Cache for Redis (Basic C1 - Budget Optimized)
# Estimated Cost: ~$40/month (Basic C1 = 1GB)
# ============================================================================

resource "azurerm_redis_cache" "hrm" {
  name                = "${local.name_prefix}-redis"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name

  # Basic C1 = 1GB, ~$40/month
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku

  # Security settings
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  # Redis configuration
  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }

  # Public network access (can restrict later with private endpoints)
  public_network_access_enabled = true

  tags = local.common_tags
}

# ============================================================================
# Firewall Rules (Optional - allow specific IPs)
# ============================================================================

# Allow Azure services
resource "azurerm_redis_firewall_rule" "allow_azure" {
  name                = "AllowAzureServices"
  redis_cache_name    = azurerm_redis_cache.hrm.name
  resource_group_name = azurerm_resource_group.hrm.name
  start_ip            = "0.0.0.0"
  end_ip              = "0.0.0.0"
}

# ============================================================================
# Outputs
# ============================================================================

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
