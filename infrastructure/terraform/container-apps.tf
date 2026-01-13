# ============================================================================
# Azure Container Apps Environment and Applications
# Budget Optimized: Scale-to-zero capability, pay only for usage
# Estimated Cost: ~$250-350/month
# ============================================================================

# ============================================================================
# Container Apps Environment
# ============================================================================

resource "azurerm_container_app_environment" "hrm" {
  name                       = "${local.name_prefix}-env"
  location                   = azurerm_resource_group.hrm.location
  resource_group_name        = azurerm_resource_group.hrm.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.hrm.id

  # Note: VNet integration removed to avoid subnet delegation issues
  # Can be re-enabled with proper subnet configuration if needed
  # infrastructure_subnet_id = azurerm_subnet.container_apps.id

  tags = local.common_tags
}

# ============================================================================
# RabbitMQ Container App (Message Broker)
# Runs as a container instead of Azure Service Bus (~$700 savings)
# ============================================================================

resource "azurerm_container_app" "rabbitmq" {
  name                         = "${local.name_prefix}-rabbitmq"
  container_app_environment_id = azurerm_container_app_environment.hrm.id
  resource_group_name          = azurerm_resource_group.hrm.name
  revision_mode                = "Single"

  template {
    min_replicas = 1
    max_replicas = 1

    container {
      name   = "rabbitmq"
      image  = "rabbitmq:3-management-alpine"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "RABBITMQ_DEFAULT_USER"
        value = "hrm_user"
      }

      env {
        name        = "RABBITMQ_DEFAULT_PASS"
        secret_name = "rabbitmq-password"
      }
    }
  }

  secret {
    name  = "rabbitmq-password"
    value = random_password.rabbitmq_password.result
  }

  ingress {
    external_enabled = false
    target_port      = 5672
    transport        = "tcp"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = local.common_tags
}

# ============================================================================
# API Gateway Container App (Always On)
# ============================================================================

resource "azurerm_container_app" "gateway" {
  name                         = "${local.name_prefix}-gateway"
  container_app_environment_id = azurerm_container_app_environment.hrm.id
  resource_group_name          = azurerm_resource_group.hrm.name
  revision_mode                = "Single"

  template {
    min_replicas = 1  # Always on for routing
    max_replicas = 5

    container {
      name   = "gateway"
      image  = "${azurerm_container_registry.hrm.login_server}/hrm-api-gateway:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "3000"
      }

      env {
        name        = "REDIS_URL"
        secret_name = "redis-url"
      }

      env {
        name  = "AUTH_SERVICE_URL"
        value = "https://${local.name_prefix}-core.internal.${azurerm_container_app_environment.hrm.default_domain}"
      }

      env {
        name  = "TENANT_SERVICE_URL"
        value = "https://${local.name_prefix}-core.internal.${azurerm_container_app_environment.hrm.default_domain}"
      }

      env {
        name  = "EMPLOYEE_SERVICE_URL"
        value = "https://${local.name_prefix}-core.internal.${azurerm_container_app_environment.hrm.default_domain}"
      }

      liveness_probe {
        path                    = "/health"
        port                    = 3000
        transport               = "HTTP"
        interval_seconds        = 30
        failure_count_threshold = 3
      }

      readiness_probe {
        path                    = "/health"
        port                    = 3000
        transport               = "HTTP"
        interval_seconds        = 10
        failure_count_threshold = 3
      }
    }
  }

  secret {
    name  = "redis-url"
    value = "rediss://:${azurerm_redis_cache.hrm.primary_access_key}@${azurerm_redis_cache.hrm.hostname}:${azurerm_redis_cache.hrm.ssl_port}"
  }

  registry {
    server               = azurerm_container_registry.hrm.login_server
    username             = azurerm_container_registry.hrm.admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.hrm.admin_password
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = local.common_tags
}

# ============================================================================
# Core Services Container App (Auth, Tenant, Employee)
# Scale-to-zero enabled
# ============================================================================

resource "azurerm_container_app" "core" {
  name                         = "${local.name_prefix}-core"
  container_app_environment_id = azurerm_container_app_environment.hrm.id
  resource_group_name          = azurerm_resource_group.hrm.name
  revision_mode                = "Single"

  template {
    min_replicas = 1  # Keep at least 1 replica running to avoid cold starts
    max_replicas = 3

    container {
      name   = "core"
      image  = "${azurerm_container_registry.hrm.login_server}/hrm-core-services:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "3001"
      }

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }

      env {
        name        = "JWT_ACCESS_SECRET"
        secret_name = "jwt-access-secret"
      }

      env {
        name        = "JWT_REFRESH_SECRET"
        secret_name = "jwt-refresh-secret"
      }

      env {
        name        = "REDIS_URL"
        secret_name = "redis-url"
      }

      env {
        name        = "RABBITMQ_URL"
        secret_name = "rabbitmq-url"
      }

      liveness_probe {
        path                    = "/health"
        port                    = 3001
        transport               = "HTTP"
        interval_seconds        = 30
        failure_count_threshold = 3
      }
    }
  }

  secret {
    name  = "mongodb-uri"
    value = azurerm_cosmosdb_account.hrm.connection_strings[0]
  }

  secret {
    name  = "jwt-access-secret"
    value = random_password.jwt_access_secret.result
  }

  secret {
    name  = "jwt-refresh-secret"
    value = random_password.jwt_refresh_secret.result
  }

  secret {
    name  = "redis-url"
    value = "rediss://:${azurerm_redis_cache.hrm.primary_access_key}@${azurerm_redis_cache.hrm.hostname}:${azurerm_redis_cache.hrm.ssl_port}"
  }

  secret {
    name  = "rabbitmq-url"
    value = "amqp://hrm_user:${random_password.rabbitmq_password.result}@${local.name_prefix}-rabbitmq.internal.${azurerm_container_app_environment.hrm.default_domain}:5672"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.hrm.admin_password
  }

  registry {
    server               = azurerm_container_registry.hrm.login_server
    username             = azurerm_container_registry.hrm.admin_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = false
    target_port      = 3001
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = local.common_tags
}

# ============================================================================
# HR Services Container App (Attendance, Leave, Timesheet)
# ============================================================================

resource "azurerm_container_app" "hr" {
  name                         = "${local.name_prefix}-hr"
  container_app_environment_id = azurerm_container_app_environment.hrm.id
  resource_group_name          = azurerm_resource_group.hrm.name
  revision_mode                = "Single"

  template {
    min_replicas = 1  # Keep at least 1 replica running to avoid cold starts
    max_replicas = 3

    container {
      name   = "hr"
      image  = "${azurerm_container_registry.hrm.login_server}/hrm-hr-services:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "3004"
      }

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }

      env {
        name        = "REDIS_URL"
        secret_name = "redis-url"
      }

      env {
        name        = "RABBITMQ_URL"
        secret_name = "rabbitmq-url"
      }

      liveness_probe {
        path                    = "/health"
        port                    = 3004
        transport               = "HTTP"
        interval_seconds        = 30
        failure_count_threshold = 3
      }
    }
  }

  secret {
    name  = "mongodb-uri"
    value = azurerm_cosmosdb_account.hrm.connection_strings[0]
  }

  secret {
    name  = "redis-url"
    value = "rediss://:${azurerm_redis_cache.hrm.primary_access_key}@${azurerm_redis_cache.hrm.hostname}:${azurerm_redis_cache.hrm.ssl_port}"
  }

  secret {
    name  = "rabbitmq-url"
    value = "amqp://hrm_user:${random_password.rabbitmq_password.result}@${local.name_prefix}-rabbitmq.internal.${azurerm_container_app_environment.hrm.default_domain}:5672"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.hrm.admin_password
  }

  registry {
    server               = azurerm_container_registry.hrm.login_server
    username             = azurerm_container_registry.hrm.admin_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = false
    target_port      = 3004
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = local.common_tags
}

# ============================================================================
# Payroll Services Container App (Payroll, Benefits, Expense)
# ============================================================================

resource "azurerm_container_app" "payroll" {
  name                         = "${local.name_prefix}-payroll"
  container_app_environment_id = azurerm_container_app_environment.hrm.id
  resource_group_name          = azurerm_resource_group.hrm.name
  revision_mode                = "Single"

  template {
    min_replicas = 1  # Keep at least 1 replica running to avoid cold starts
    max_replicas = 3

    container {
      name   = "payroll"
      image  = "${azurerm_container_registry.hrm.login_server}/hrm-payroll-services:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "3006"
      }

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }

      env {
        name        = "REDIS_URL"
        secret_name = "redis-url"
      }

      env {
        name        = "RABBITMQ_URL"
        secret_name = "rabbitmq-url"
      }

      liveness_probe {
        path                    = "/health"
        port                    = 3006
        transport               = "HTTP"
        interval_seconds        = 30
        failure_count_threshold = 3
      }
    }
  }

  secret {
    name  = "mongodb-uri"
    value = azurerm_cosmosdb_account.hrm.connection_strings[0]
  }

  secret {
    name  = "redis-url"
    value = "rediss://:${azurerm_redis_cache.hrm.primary_access_key}@${azurerm_redis_cache.hrm.hostname}:${azurerm_redis_cache.hrm.ssl_port}"
  }

  secret {
    name  = "rabbitmq-url"
    value = "amqp://hrm_user:${random_password.rabbitmq_password.result}@${local.name_prefix}-rabbitmq.internal.${azurerm_container_app_environment.hrm.default_domain}:5672"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.hrm.admin_password
  }

  registry {
    server               = azurerm_container_registry.hrm.login_server
    username             = azurerm_container_registry.hrm.admin_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = false
    target_port      = 3006
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = local.common_tags
}

# ============================================================================
# Communication Services Container App (Notification, WebSocket, Chat)
# ============================================================================

resource "azurerm_container_app" "comm" {
  name                         = "${local.name_prefix}-comm"
  container_app_environment_id = azurerm_container_app_environment.hrm.id
  resource_group_name          = azurerm_resource_group.hrm.name
  revision_mode                = "Single"

  template {
    min_replicas = 1  # Keep at least 1 replica running to avoid cold starts
    max_replicas = 3

    container {
      name   = "comm"
      image  = "${azurerm_container_registry.hrm.login_server}/hrm-comm-services:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "3007"
      }

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }

      env {
        name        = "REDIS_URL"
        secret_name = "redis-url"
      }

      env {
        name        = "RABBITMQ_URL"
        secret_name = "rabbitmq-url"
      }

      liveness_probe {
        path                    = "/health"
        port                    = 3007
        transport               = "HTTP"
        interval_seconds        = 30
        failure_count_threshold = 3
      }
    }
  }

  secret {
    name  = "mongodb-uri"
    value = azurerm_cosmosdb_account.hrm.connection_strings[0]
  }

  secret {
    name  = "redis-url"
    value = "rediss://:${azurerm_redis_cache.hrm.primary_access_key}@${azurerm_redis_cache.hrm.hostname}:${azurerm_redis_cache.hrm.ssl_port}"
  }

  secret {
    name  = "rabbitmq-url"
    value = "amqp://hrm_user:${random_password.rabbitmq_password.result}@${local.name_prefix}-rabbitmq.internal.${azurerm_container_app_environment.hrm.default_domain}:5672"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.hrm.admin_password
  }

  registry {
    server               = azurerm_container_registry.hrm.login_server
    username             = azurerm_container_registry.hrm.admin_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = false
    target_port      = 3007
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = local.common_tags
}

# ============================================================================
# Analytics Services Container App (Reports, Analytics, Document)
# ============================================================================

resource "azurerm_container_app" "analytics" {
  name                         = "${local.name_prefix}-analytics"
  container_app_environment_id = azurerm_container_app_environment.hrm.id
  resource_group_name          = azurerm_resource_group.hrm.name
  revision_mode                = "Single"

  template {
    min_replicas = 1  # Keep at least 1 replica running to avoid cold starts
    max_replicas = 3

    container {
      name   = "analytics"
      image  = "${azurerm_container_registry.hrm.login_server}/hrm-analytics-services:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "3008"
      }

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }

      env {
        name        = "REDIS_URL"
        secret_name = "redis-url"
      }

      env {
        name        = "STORAGE_CONNECTION_STRING"
        secret_name = "storage-connection"
      }

      liveness_probe {
        path                    = "/health"
        port                    = 3008
        transport               = "HTTP"
        interval_seconds        = 30
        failure_count_threshold = 3
      }
    }
  }

  secret {
    name  = "mongodb-uri"
    value = azurerm_cosmosdb_account.hrm.connection_strings[0]
  }

  secret {
    name  = "redis-url"
    value = "rediss://:${azurerm_redis_cache.hrm.primary_access_key}@${azurerm_redis_cache.hrm.hostname}:${azurerm_redis_cache.hrm.ssl_port}"
  }

  secret {
    name  = "storage-connection"
    value = azurerm_storage_account.hrm.primary_connection_string
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.hrm.admin_password
  }

  registry {
    server               = azurerm_container_registry.hrm.login_server
    username             = azurerm_container_registry.hrm.admin_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = false
    target_port      = 3008
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = local.common_tags
}

# ============================================================================
# Workforce Services Container App (Recruitment, Onboarding, Compliance)
# ============================================================================

resource "azurerm_container_app" "workforce" {
  name                         = "${local.name_prefix}-workforce"
  container_app_environment_id = azurerm_container_app_environment.hrm.id
  resource_group_name          = azurerm_resource_group.hrm.name
  revision_mode                = "Single"

  template {
    min_replicas = 1  # Keep at least 1 replica running to avoid cold starts
    max_replicas = 3

    container {
      name   = "workforce"
      image  = "${azurerm_container_registry.hrm.login_server}/hrm-workforce-services:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "3017"
      }

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }

      env {
        name        = "REDIS_URL"
        secret_name = "redis-url"
      }

      env {
        name        = "RABBITMQ_URL"
        secret_name = "rabbitmq-url"
      }

      liveness_probe {
        path                    = "/health"
        port                    = 3017
        transport               = "HTTP"
        interval_seconds        = 30
        failure_count_threshold = 3
      }
    }
  }

  secret {
    name  = "mongodb-uri"
    value = azurerm_cosmosdb_account.hrm.connection_strings[0]
  }

  secret {
    name  = "redis-url"
    value = "rediss://:${azurerm_redis_cache.hrm.primary_access_key}@${azurerm_redis_cache.hrm.hostname}:${azurerm_redis_cache.hrm.ssl_port}"
  }

  secret {
    name  = "rabbitmq-url"
    value = "amqp://hrm_user:${random_password.rabbitmq_password.result}@${local.name_prefix}-rabbitmq.internal.${azurerm_container_app_environment.hrm.default_domain}:5672"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.hrm.admin_password
  }

  registry {
    server               = azurerm_container_registry.hrm.login_server
    username             = azurerm_container_registry.hrm.admin_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = false
    target_port      = 3017
    transport        = "http"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = local.common_tags
}

# ============================================================================
# Random Passwords for Services
# ============================================================================

resource "random_password" "jwt_access_secret" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
}

resource "random_password" "rabbitmq_password" {
  length  = 32
  special = false
}

# ============================================================================
# Outputs
# ============================================================================

output "container_apps_environment_id" {
  description = "Container Apps Environment ID"
  value       = azurerm_container_app_environment.hrm.id
}

output "api_gateway_url" {
  description = "API Gateway URL"
  value       = "https://${azurerm_container_app.gateway.ingress[0].fqdn}"
}

output "container_apps_default_domain" {
  description = "Container Apps default domain"
  value       = azurerm_container_app_environment.hrm.default_domain
}
