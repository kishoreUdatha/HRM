# ============================================================================
# Azure CosmosDB (Serverless - MongoDB API)
# Budget Optimized: Pay-per-use, no minimum cost when idle
# Estimated Cost: ~$250-350/month (based on usage)
# ============================================================================

resource "azurerm_cosmosdb_account" "hrm" {
  name                = "${local.name_prefix}-cosmos-${random_string.suffix.result}"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name
  offer_type          = "Standard"
  kind                = "MongoDB"

  # Enable Serverless for pay-per-use pricing
  capabilities {
    name = "EnableServerless"
  }

  # Enable MongoDB API
  capabilities {
    name = "EnableMongo"
  }

  # MongoDB version 4.2
  capabilities {
    name = "MongoDBv3.4"
  }

  # Disable notebook (not needed for API usage)
  capabilities {
    name = "DisableRateLimitingResponses"
  }

  consistency_policy {
    consistency_level       = var.cosmosdb_consistency_level
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  # Single region for budget (add secondary for HA later)
  geo_location {
    location          = azurerm_resource_group.hrm.location
    failover_priority = 0
  }

  # Backup policy (periodic is free for serverless)
  backup {
    type                = "Periodic"
    interval_in_minutes = 1440  # Daily backup
    retention_in_hours  = 168   # 7 days retention
    storage_redundancy  = "Local"
  }

  # Enable automatic failover (useful when adding regions later)
  enable_automatic_failover = false

  # Network rules (allow Azure services)
  is_virtual_network_filter_enabled = false

  public_network_access_enabled = true

  tags = local.common_tags
}

# ============================================================================
# Create MongoDB Databases
# ============================================================================

resource "azurerm_cosmosdb_mongo_database" "databases" {
  for_each = toset(var.cosmosdb_databases)

  name                = each.value
  resource_group_name = azurerm_resource_group.hrm.name
  account_name        = azurerm_cosmosdb_account.hrm.name

  # Serverless doesn't support throughput settings
  # throughput is automatically managed
}

# ============================================================================
# Outputs
# ============================================================================

output "cosmosdb_connection_string" {
  description = "CosmosDB MongoDB connection string"
  value       = azurerm_cosmosdb_account.hrm.connection_strings[0]
  sensitive   = true
}

output "cosmosdb_endpoint" {
  description = "CosmosDB endpoint"
  value       = azurerm_cosmosdb_account.hrm.endpoint
}

output "cosmosdb_primary_key" {
  description = "CosmosDB primary key"
  value       = azurerm_cosmosdb_account.hrm.primary_key
  sensitive   = true
}

output "cosmosdb_account_name" {
  description = "CosmosDB account name"
  value       = azurerm_cosmosdb_account.hrm.name
}
