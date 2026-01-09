# ============================================================================
# HRM SaaS Platform - Budget-Optimized Azure Infrastructure
# Main Configuration
# Target Budget: $700-900/month (Option 2)
# ============================================================================
#
# Architecture Overview:
# - Azure Static Web Apps (Standard) for Frontend        ~$9/month
# - Azure Container Apps for Backend (8 services)       ~$250-350/month
# - Azure CosmosDB Serverless (MongoDB API)             ~$250-350/month
# - Azure Cache for Redis (Basic C1)                    ~$40/month
# - RabbitMQ runs as Container App                      ~$0 (included)
# - Azure Key Vault (Standard)                          ~$3/month
# - Azure Container Registry (Basic)                    ~$5/month
# - Azure CDN Standard                                  ~$25/month
# - Azure Application Insights                          ~$0 (5GB free)
# ============================================================================
# Total Estimated: $592-792/month
# ============================================================================

# Random suffix for globally unique resource names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# ============================================================================
# Data Sources
# ============================================================================

data "azurerm_client_config" "current" {}

# ============================================================================
# Resource Group
# ============================================================================

resource "azurerm_resource_group" "hrm" {
  name     = "${local.name_prefix}-rg"
  location = var.location
  tags     = local.common_tags
}

# ============================================================================
# Virtual Network (for Container Apps integration)
# ============================================================================

resource "azurerm_virtual_network" "hrm" {
  name                = "${local.name_prefix}-vnet"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name
  address_space       = ["10.0.0.0/16"]
  tags                = local.common_tags
}

resource "azurerm_subnet" "container_apps" {
  name                 = "container-apps-subnet"
  resource_group_name  = azurerm_resource_group.hrm.name
  virtual_network_name = azurerm_virtual_network.hrm.name
  address_prefixes     = ["10.0.0.0/23"]

  # Note: Delegation removed - not using VNet integration for Container Apps
  # Can be re-enabled if VNet integration is needed later
}

resource "azurerm_subnet" "private_endpoints" {
  name                 = "private-endpoints-subnet"
  resource_group_name  = azurerm_resource_group.hrm.name
  virtual_network_name = azurerm_virtual_network.hrm.name
  address_prefixes     = ["10.0.4.0/24"]
}
