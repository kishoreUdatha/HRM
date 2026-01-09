# ============================================================================
# Azure Key Vault (Standard SKU - Budget Optimized)
# Estimated Cost: ~$3/month
# ============================================================================

resource "azurerm_key_vault" "hrm" {
  name                        = "${local.name_prefix}-kv-${random_string.suffix.result}"
  location                    = azurerm_resource_group.hrm.location
  resource_group_name         = azurerm_resource_group.hrm.name
  enabled_for_disk_encryption = false
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false  # Disabled for budget (can enable later)
  sku_name                    = "standard"

  # Access policy for current user/service principal
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "Get", "List", "Create", "Delete", "Update", "Recover", "Backup", "Restore"
    ]

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore"
    ]

    certificate_permissions = [
      "Get", "List", "Create", "Delete", "Update"
    ]
  }

  network_acls {
    default_action = "Allow"
    bypass         = "AzureServices"
  }

  tags = local.common_tags
}

# ============================================================================
# Store Secrets in Key Vault
# ============================================================================

resource "azurerm_key_vault_secret" "jwt_access_secret" {
  name         = "jwt-access-secret"
  value        = random_password.jwt_access_secret.result
  key_vault_id = azurerm_key_vault.hrm.id
}

resource "azurerm_key_vault_secret" "jwt_refresh_secret" {
  name         = "jwt-refresh-secret"
  value        = random_password.jwt_refresh_secret.result
  key_vault_id = azurerm_key_vault.hrm.id
}

resource "azurerm_key_vault_secret" "rabbitmq_password" {
  name         = "rabbitmq-password"
  value        = random_password.rabbitmq_password.result
  key_vault_id = azurerm_key_vault.hrm.id
}

resource "azurerm_key_vault_secret" "cosmosdb_connection" {
  name         = "cosmosdb-connection-string"
  value        = azurerm_cosmosdb_account.hrm.connection_strings[0]
  key_vault_id = azurerm_key_vault.hrm.id
}

resource "azurerm_key_vault_secret" "redis_connection" {
  name         = "redis-connection-string"
  value        = azurerm_redis_cache.hrm.primary_connection_string
  key_vault_id = azurerm_key_vault.hrm.id
}

resource "azurerm_key_vault_secret" "storage_connection" {
  name         = "storage-connection-string"
  value        = azurerm_storage_account.hrm.primary_connection_string
  key_vault_id = azurerm_key_vault.hrm.id
}

resource "azurerm_key_vault_secret" "acr_password" {
  name         = "acr-admin-password"
  value        = azurerm_container_registry.hrm.admin_password
  key_vault_id = azurerm_key_vault.hrm.id
}

# ============================================================================
# Outputs
# ============================================================================

output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.hrm.name
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.hrm.vault_uri
}

output "key_vault_id" {
  description = "Key Vault ID"
  value       = azurerm_key_vault.hrm.id
}
