# ============================================================================
# Azure Storage Account (LRS - Budget Optimized)
# Used for document storage and backups
# Estimated Cost: ~$5-10/month (based on usage)
# ============================================================================

resource "azurerm_storage_account" "hrm" {
  name                     = "${var.project_name}${var.environment}st${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.hrm.name
  location                 = azurerm_resource_group.hrm.location
  account_tier             = "Standard"
  account_replication_type = var.storage_replication_type  # LRS for budget
  min_tls_version          = "TLS1_2"

  # Enable blob versioning for data protection
  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 7  # Reduced for budget
    }

    container_delete_retention_policy {
      days = 7
    }
  }

  tags = local.common_tags
}

# ============================================================================
# Storage Containers
# ============================================================================

resource "azurerm_storage_container" "documents" {
  name                  = "documents"
  storage_account_name  = azurerm_storage_account.hrm.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "backups" {
  name                  = "backups"
  storage_account_name  = azurerm_storage_account.hrm.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "uploads" {
  name                  = "uploads"
  storage_account_name  = azurerm_storage_account.hrm.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "exports" {
  name                  = "exports"
  storage_account_name  = azurerm_storage_account.hrm.name
  container_access_type = "private"
}

# ============================================================================
# Lifecycle Management (Auto-delete old files to save costs)
# ============================================================================

resource "azurerm_storage_management_policy" "lifecycle" {
  storage_account_id = azurerm_storage_account.hrm.id

  rule {
    name    = "delete-old-exports"
    enabled = true

    filters {
      prefix_match = ["exports/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 30
      }
    }
  }

  rule {
    name    = "archive-old-backups"
    enabled = true

    filters {
      prefix_match = ["backups/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than = 30
        delete_after_days_since_modification_greater_than       = 90
      }
    }
  }
}

# ============================================================================
# Outputs
# ============================================================================

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
