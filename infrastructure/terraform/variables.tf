# ============================================================================
# HRM SaaS Platform - Budget-Optimized Azure Infrastructure
# Variables Configuration
# Target Budget: $700-900/month (Option 2)
# ============================================================================

# ============================================================================
# General Variables
# ============================================================================

variable "project_name" {
  description = "Name of the project (used in resource naming)"
  type        = string
  default     = "hrm"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "owner" {
  description = "Owner of the resources"
  type        = string
  default     = "HRM-Team"
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# ============================================================================
# Networking Variables
# ============================================================================

variable "domain_name" {
  description = "Custom domain name for the application"
  type        = string
  default     = ""
}

variable "create_dns_zone" {
  description = "Whether to create Azure DNS zone for custom domain"
  type        = bool
  default     = false
}

# ============================================================================
# Container Registry Variables
# ============================================================================

variable "acr_sku" {
  description = "SKU for Azure Container Registry (Basic for budget)"
  type        = string
  default     = "Basic"
}

# ============================================================================
# CosmosDB Variables (Serverless for budget)
# ============================================================================

variable "cosmosdb_consistency_level" {
  description = "Consistency level for CosmosDB"
  type        = string
  default     = "Session"
}

variable "cosmosdb_databases" {
  description = "List of databases to create in CosmosDB"
  type        = list(string)
  default = [
    "hrm_auth",
    "hrm_tenants",
    "hrm_employees",
    "hrm_attendance",
    "hrm_leaves",
    "hrm_payroll",
    "hrm_notifications",
    "hrm_reports",
    "hrm_documents",
    "hrm_analytics"
  ]
}

# ============================================================================
# Redis Variables (Basic tier for budget)
# ============================================================================

variable "redis_sku" {
  description = "SKU for Redis Cache (Basic for budget)"
  type        = string
  default     = "Basic"
}

variable "redis_family" {
  description = "Redis family (C for Basic/Standard)"
  type        = string
  default     = "C"
}

variable "redis_capacity" {
  description = "Size of Redis cache (1 = 1GB for Basic C1)"
  type        = number
  default     = 1
}

# ============================================================================
# Container Apps Variables
# ============================================================================

variable "container_apps" {
  description = "Configuration for each container app service"
  type = map(object({
    min_replicas = number
    max_replicas = number
    cpu          = number
    memory       = string
    port         = number
    external     = bool
    services     = list(string)
  }))
  default = {
    "gateway" = {
      min_replicas = 1
      max_replicas = 5
      cpu          = 0.5
      memory       = "1Gi"
      port         = 3000
      external     = true
      services     = ["api-gateway"]
    }
    "core" = {
      min_replicas = 0
      max_replicas = 3
      cpu          = 0.5
      memory       = "1Gi"
      port         = 3001
      external     = false
      services     = ["auth-service", "tenant-service", "employee-service"]
    }
    "hr" = {
      min_replicas = 0
      max_replicas = 3
      cpu          = 0.5
      memory       = "1Gi"
      port         = 3004
      external     = false
      services     = ["attendance-service", "leave-service", "timesheet-service"]
    }
    "payroll" = {
      min_replicas = 0
      max_replicas = 3
      cpu          = 0.5
      memory       = "1Gi"
      port         = 3006
      external     = false
      services     = ["payroll-service", "benefits-service", "expense-service"]
    }
    "comm" = {
      min_replicas = 0
      max_replicas = 3
      cpu          = 0.25
      memory       = "0.5Gi"
      port         = 3007
      external     = false
      services     = ["notification-service", "websocket-service", "chat-service"]
    }
    "analytics" = {
      min_replicas = 0
      max_replicas = 3
      cpu          = 0.5
      memory       = "1Gi"
      port         = 3008
      external     = false
      services     = ["reports-service", "analytics-service", "document-service"]
    }
    "workforce" = {
      min_replicas = 0
      max_replicas = 3
      cpu          = 0.25
      memory       = "0.5Gi"
      port         = 3017
      external     = false
      services     = ["recruitment-service", "onboarding-service", "compliance-service"]
    }
  }
}

# ============================================================================
# Static Web App Variables
# ============================================================================

variable "static_webapp_sku_tier" {
  description = "SKU tier for Static Web App"
  type        = string
  default     = "Standard"
}

variable "static_webapp_sku_size" {
  description = "SKU size for Static Web App"
  type        = string
  default     = "Standard"
}

# ============================================================================
# Storage Account Variables
# ============================================================================

variable "storage_replication_type" {
  description = "Storage account replication type (LRS for budget, GRS for production)"
  type        = string
  default     = "LRS"
}

# ============================================================================
# Monitoring Variables
# ============================================================================

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

variable "alert_email" {
  description = "Email for alert notifications"
  type        = string
  default     = "ops@example.com"
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

# ============================================================================
# Secrets Variables (provide via terraform.tfvars or environment)
# ============================================================================

variable "jwt_access_secret" {
  description = "JWT access token secret (auto-generated if empty)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret (auto-generated if empty)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_host" {
  description = "SMTP host for email notifications"
  type        = string
  default     = "smtp.gmail.com"
}

variable "smtp_port" {
  description = "SMTP port"
  type        = string
  default     = "587"
}

variable "smtp_user" {
  description = "SMTP username"
  type        = string
  default     = ""
}

variable "smtp_pass" {
  description = "SMTP password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "openai_api_key" {
  description = "OpenAI API key for AI services (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "razorpay_key_id" {
  description = "Razorpay key ID for billing (optional)"
  type        = string
  default     = ""
}

variable "razorpay_key_secret" {
  description = "Razorpay key secret"
  type        = string
  sensitive   = true
  default     = ""
}

# ============================================================================
# Local Values
# ============================================================================

locals {
  common_tags = merge({
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = var.owner
    CostCenter  = "Budget-Option2"
  }, var.tags)

  name_prefix = "${var.project_name}-${var.environment}"
}
