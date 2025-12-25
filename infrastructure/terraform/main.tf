# ===========================================
# HRM SaaS Platform - Azure Infrastructure
# Terraform Configuration
# ===========================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.115.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "hrm-terraform-state-rg"
    storage_account_name = "hrmtfstatesea"
    container_name       = "tfstate"
    key                  = "hrm.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
  skip_provider_registration = true
}

provider "azuread" {}

# ===========================================
# DATA SOURCES
# ===========================================

data "azurerm_client_config" "current" {}

data "azuread_client_config" "current" {}

# ===========================================
# RESOURCE GROUP
# ===========================================

resource "azurerm_resource_group" "hrm" {
  name     = "${var.project_name}-${var.environment}-rg"
  location = var.location

  tags = local.common_tags
}

# ===========================================
# VIRTUAL NETWORK
# ===========================================

resource "azurerm_virtual_network" "hrm" {
  name                = "${var.project_name}-${var.environment}-vnet"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name
  address_space       = ["10.0.0.0/8"]

  tags = local.common_tags
}

resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.hrm.name
  virtual_network_name = azurerm_virtual_network.hrm.name
  address_prefixes     = ["10.240.0.0/16"]
}

resource "azurerm_subnet" "app_gateway" {
  name                 = "appgw-subnet"
  resource_group_name  = azurerm_resource_group.hrm.name
  virtual_network_name = azurerm_virtual_network.hrm.name
  address_prefixes     = ["10.1.0.0/24"]
}

resource "azurerm_subnet" "database" {
  name                 = "database-subnet"
  resource_group_name  = azurerm_resource_group.hrm.name
  virtual_network_name = azurerm_virtual_network.hrm.name
  address_prefixes     = ["10.2.0.0/24"]

  service_endpoints = ["Microsoft.AzureCosmosDB"]
}

# ===========================================
# AZURE CONTAINER REGISTRY
# ===========================================

resource "azurerm_container_registry" "hrm" {
  name                = "${var.project_name}${var.environment}acr"
  resource_group_name = azurerm_resource_group.hrm.name
  location            = azurerm_resource_group.hrm.location
  sku                 = "Standard"
  admin_enabled       = true

  tags = local.common_tags
}

# ===========================================
# AZURE KUBERNETES SERVICE (AKS)
# ===========================================

resource "azurerm_kubernetes_cluster" "hrm" {
  name                = "${var.project_name}-${var.environment}-aks"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name
  dns_prefix          = "${var.project_name}-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "system"
    node_count          = var.aks_system_node_count
    vm_size             = var.aks_system_node_size
    vnet_subnet_id      = azurerm_subnet.aks.id
    enable_auto_scaling = true
    min_count           = 2
    max_count           = 5
    os_disk_size_gb     = 128
    os_disk_type        = "Managed"

    node_labels = {
      "nodepool-type" = "system"
      "environment"   = var.environment
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
    service_cidr      = "10.0.0.0/16"
    dns_service_ip    = "10.0.0.10"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.hrm.id
  }

  key_vault_secrets_provider {
    secret_rotation_enabled = true
  }

  azure_policy_enabled = true

  tags = local.common_tags
}

# User node pool for application workloads
resource "azurerm_kubernetes_cluster_node_pool" "user" {
  name                  = "user"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.hrm.id
  vm_size               = var.aks_user_node_size
  node_count            = var.aks_user_node_count
  vnet_subnet_id        = azurerm_subnet.aks.id
  enable_auto_scaling   = true
  min_count             = 3
  max_count             = 20
  os_disk_size_gb       = 128
  os_disk_type          = "Managed"
  mode                  = "User"

  node_labels = {
    "nodepool-type" = "user"
    "environment"   = var.environment
    "workload"      = "hrm-services"
  }

  node_taints = []

  tags = local.common_tags
}

# Attach ACR to AKS
resource "azurerm_role_assignment" "aks_acr" {
  principal_id                     = azurerm_kubernetes_cluster.hrm.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.hrm.id
  skip_service_principal_aad_check = true
}

# ===========================================
# AZURE COSMOS DB (MongoDB API)
# ===========================================

resource "azurerm_cosmosdb_account" "hrm" {
  name                = "${var.project_name}-${var.environment}-cosmos"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name
  offer_type          = "Standard"
  kind                = "MongoDB"

  enable_automatic_failover         = true
  is_virtual_network_filter_enabled = true

  capabilities {
    name = "EnableMongo"
  }

  capabilities {
    name = "MongoDBv3.4"
  }


  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  geo_location {
    location          = azurerm_resource_group.hrm.location
    failover_priority = 0
  }

  virtual_network_rule {
    id = azurerm_subnet.database.id
  }

  backup {
    type = "Continuous"
  }

  tags = local.common_tags
}

# Create MongoDB databases for each service
resource "azurerm_cosmosdb_mongo_database" "databases" {
  for_each = toset([
    "hrm_auth",
    "hrm_tenants",
    "hrm_employees",
    "hrm_attendance",
    "hrm_leaves",
    "hrm_payroll",
    "hrm_notifications",
    "hrm_reports",
    "hrm_chat",
    "hrm_analytics",
    "hrm_documents",
    "hrm_integrations",
    "hrm_engagement",
    "hrm_chatbot",
    "hrm_ai_ml",
    "hrm_recruitment",
    "hrm_localization",
    "hrm_benefits",
    "hrm_onboarding",
    "hrm_compliance",
    "hrm_expenses",
    "hrm_timesheets",
    "hrm_assets",
    "hrm_grievances",
    "hrm_billing",
    "hrm_workforce"
  ])

  name                = each.key
  resource_group_name = azurerm_resource_group.hrm.name
  account_name        = azurerm_cosmosdb_account.hrm.name
}

# ===========================================
# AZURE CACHE FOR REDIS
# ===========================================

resource "azurerm_redis_cache" "hrm" {
  name                = "${var.project_name}-${var.environment}-redis"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name
  capacity            = 2
  family              = "P"
  sku_name            = "Premium"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_reserved              = 50
    maxmemory_delta                 = 50
    maxmemory_policy                = "volatile-lru"
    rdb_backup_enabled              = true
    rdb_backup_frequency            = 60
    rdb_storage_connection_string   = azurerm_storage_account.hrm.primary_blob_connection_string
  }

  tags = local.common_tags
}

# ===========================================
# AZURE STORAGE ACCOUNT
# ===========================================

resource "azurerm_storage_account" "hrm" {
  name                     = "${var.project_name}${var.environment}storage"
  resource_group_name      = azurerm_resource_group.hrm.name
  location                 = azurerm_resource_group.hrm.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  min_tls_version          = "TLS1_2"

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  tags = local.common_tags
}

resource "azurerm_storage_container" "documents" {
  name                  = "hrm-documents"
  storage_account_name  = azurerm_storage_account.hrm.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "backups" {
  name                  = "hrm-backups"
  storage_account_name  = azurerm_storage_account.hrm.name
  container_access_type = "private"
}

# ===========================================
# AZURE KEY VAULT
# ===========================================

resource "azurerm_key_vault" "hrm" {
  name                        = "${var.project_name}-${var.environment}-kv"
  location                    = azurerm_resource_group.hrm.location
  resource_group_name         = azurerm_resource_group.hrm.name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = true
  sku_name                    = "premium"

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "Get", "List", "Create", "Delete", "Update", "Recover", "Backup", "Restore", "Purge"
    ]

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge"
    ]

    certificate_permissions = [
      "Get", "List", "Create", "Delete", "Update", "Recover", "Backup", "Restore", "Purge"
    ]
  }

  # Access policy for AKS
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = azurerm_kubernetes_cluster.hrm.key_vault_secrets_provider[0].secret_identity[0].object_id

    secret_permissions = [
      "Get", "List"
    ]
  }

  network_acls {
    default_action = "Allow"
    bypass         = "AzureServices"
  }

  tags = local.common_tags
}

# Generate and store secrets
resource "random_password" "jwt_access_secret" {
  length  = 64
  special = true
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = true
}

resource "random_password" "rabbitmq_password" {
  length  = 32
  special = false
}

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

resource "azurerm_key_vault_secret" "mongodb_connection" {
  name         = "mongodb-connection-string"
  value        = azurerm_cosmosdb_account.hrm.primary_mongodb_connection_string
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

# ===========================================
# LOG ANALYTICS & APPLICATION INSIGHTS
# ===========================================

resource "azurerm_log_analytics_workspace" "hrm" {
  name                = "${var.project_name}-${var.environment}-logs"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name
  sku                 = "PerGB2018"
  retention_in_days   = 90

  tags = local.common_tags
}

resource "azurerm_application_insights" "hrm" {
  name                = "${var.project_name}-${var.environment}-appinsights"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name
  workspace_id        = azurerm_log_analytics_workspace.hrm.id
  application_type    = "web"

  tags = local.common_tags
}

# ===========================================
# APPLICATION GATEWAY WITH WAF
# ===========================================

resource "azurerm_public_ip" "appgw" {
  name                = "${var.project_name}-${var.environment}-appgw-pip"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name
  allocation_method   = "Static"
  sku                 = "Standard"
  domain_name_label   = "${var.project_name}-${var.environment}"

  tags = local.common_tags
}

resource "azurerm_web_application_firewall_policy" "hrm" {
  name                = "${var.project_name}-${var.environment}-waf-policy"
  resource_group_name = azurerm_resource_group.hrm.name
  location            = azurerm_resource_group.hrm.location

  policy_settings {
    enabled                     = true
    mode                        = "Prevention"
    request_body_check          = true
    file_upload_limit_in_mb     = 100
    max_request_body_size_in_kb = 128
  }

  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"
    }
  }

  tags = local.common_tags
}

# ===========================================
# DNS ZONE (Optional - if using Azure DNS)
# ===========================================

resource "azurerm_dns_zone" "hrm" {
  count               = var.create_dns_zone ? 1 : 0
  name                = var.domain_name
  resource_group_name = azurerm_resource_group.hrm.name

  tags = local.common_tags
}

# ===========================================
# AZURE MONITOR ACTION GROUPS & ALERTS
# ===========================================

resource "azurerm_monitor_action_group" "critical" {
  name                = "${var.project_name}-critical-alerts"
  resource_group_name = azurerm_resource_group.hrm.name
  short_name          = "hrm-crit"

  email_receiver {
    name                    = "ops-team"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }

  dynamic "webhook_receiver" {
    for_each = var.slack_webhook_url != "" ? [1] : []
    content {
      name        = "slack-webhook"
      service_uri = var.slack_webhook_url
    }
  }

  tags = local.common_tags
}

resource "azurerm_monitor_metric_alert" "aks_cpu" {
  name                = "${var.project_name}-aks-cpu-alert"
  resource_group_name = azurerm_resource_group.hrm.name
  scopes              = [azurerm_kubernetes_cluster.hrm.id]
  description         = "Alert when AKS CPU usage exceeds threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_cpu_usage_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = local.common_tags
}

resource "azurerm_monitor_metric_alert" "aks_memory" {
  name                = "${var.project_name}-aks-memory-alert"
  resource_group_name = azurerm_resource_group.hrm.name
  scopes              = [azurerm_kubernetes_cluster.hrm.id]
  description         = "Alert when AKS memory usage exceeds threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.ContainerService/managedClusters"
    metric_name      = "node_memory_working_set_percentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = local.common_tags
}

# ===========================================
# LOCAL VALUES
# ===========================================

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = var.owner
  }
}
