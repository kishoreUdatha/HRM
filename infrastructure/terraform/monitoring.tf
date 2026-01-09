# ============================================================================
# Azure Monitoring (Budget Optimized)
# Log Analytics + Application Insights
# Estimated Cost: ~$0 (5GB free tier)
# ============================================================================

# ============================================================================
# Log Analytics Workspace
# ============================================================================

resource "azurerm_log_analytics_workspace" "hrm" {
  name                = "${local.name_prefix}-logs"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days  # 30 days for budget

  tags = local.common_tags
}

# ============================================================================
# Application Insights
# ============================================================================

resource "azurerm_application_insights" "hrm" {
  name                = "${local.name_prefix}-appinsights"
  location            = azurerm_resource_group.hrm.location
  resource_group_name = azurerm_resource_group.hrm.name
  workspace_id        = azurerm_log_analytics_workspace.hrm.id
  application_type    = "web"

  # Daily cap to control costs (5GB free, then $2.30/GB)
  daily_data_cap_in_gb = 5

  tags = local.common_tags
}

# ============================================================================
# Action Group for Alerts
# ============================================================================

resource "azurerm_monitor_action_group" "critical" {
  name                = "${local.name_prefix}-critical-alerts"
  resource_group_name = azurerm_resource_group.hrm.name
  short_name          = "hrm-crit"

  email_receiver {
    name                    = "ops-team"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }

  tags = local.common_tags
}

# ============================================================================
# Metric Alerts (Essential only for budget)
# ============================================================================

# Note: Container Apps API metrics alerts removed due to limited metric availability
# Configure Application Insights alerts for API monitoring instead

# Alert: CosmosDB High RU Consumption
resource "azurerm_monitor_metric_alert" "cosmosdb_ru" {
  name                = "${local.name_prefix}-cosmosdb-ru"
  resource_group_name = azurerm_resource_group.hrm.name
  scopes              = [azurerm_cosmosdb_account.hrm.id]
  description         = "Alert when CosmosDB RU consumption is high"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.DocumentDB/databaseAccounts"
    metric_name      = "TotalRequestUnits"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 10000  # Adjust based on expected usage
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = local.common_tags
}

# Alert: Redis Memory Usage
resource "azurerm_monitor_metric_alert" "redis_memory" {
  name                = "${local.name_prefix}-redis-memory"
  resource_group_name = azurerm_resource_group.hrm.name
  scopes              = [azurerm_redis_cache.hrm.id]
  description         = "Alert when Redis memory usage exceeds 80%"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Cache/redis"
    metric_name      = "usedmemorypercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = local.common_tags
}

# ============================================================================
# Outputs
# ============================================================================

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = azurerm_log_analytics_workspace.hrm.id
}

output "log_analytics_workspace_key" {
  description = "Log Analytics workspace key"
  value       = azurerm_log_analytics_workspace.hrm.primary_shared_key
  sensitive   = true
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

output "application_insights_app_id" {
  description = "Application Insights app ID"
  value       = azurerm_application_insights.hrm.app_id
}
