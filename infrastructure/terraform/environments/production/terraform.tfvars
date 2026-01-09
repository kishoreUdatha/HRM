# ============================================================================
# HRM SaaS Platform - Production Environment Variables
# Budget-Optimized Deployment (Option 2: $700-900/month)
# ============================================================================
#
# IMPORTANT: Do not commit sensitive values to version control!
# Use environment variables or Azure Key Vault for secrets.
#
# To use this file:
#   terraform plan -var-file="environments/production/terraform.tfvars"
#   terraform apply -var-file="environments/production/terraform.tfvars"
# ============================================================================

# ============================================================================
# General Settings
# ============================================================================

project_name = "hrm"
environment  = "production"
location     = "centralindia"  # Azure Central India (Pune)
owner        = "HRM-Team"

tags = {
  CostCenter  = "Production"
  Application = "HRM-SaaS"
  Budget      = "Option2-700-900"
  Region      = "India"
}

# ============================================================================
# Networking
# ============================================================================

# Set to true and provide domain_name if you want Azure to manage DNS
create_dns_zone = false
domain_name     = ""  # e.g., "hrm.example.com"

# ============================================================================
# Container Registry (Basic for budget)
# ============================================================================

acr_sku = "Basic"  # ~$5/month

# ============================================================================
# CosmosDB Settings (Serverless for budget)
# ============================================================================

cosmosdb_consistency_level = "Session"

cosmosdb_databases = [
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

# ============================================================================
# Redis Settings (Basic C1 for budget)
# ============================================================================

redis_sku      = "Basic"  # ~$40/month
redis_family   = "C"
redis_capacity = 1        # 1GB

# ============================================================================
# Static Web App Settings
# ============================================================================

static_webapp_sku_tier = "Standard"  # ~$9/month
static_webapp_sku_size = "Standard"

# ============================================================================
# Storage Settings (LRS for budget)
# ============================================================================

storage_replication_type = "LRS"  # Locally redundant (cheaper)

# ============================================================================
# Monitoring Settings
# ============================================================================

log_retention_days = 30  # Reduced for budget
alert_email        = "ops@example.com"  # UPDATE THIS!

# Slack webhook for alerts (optional)
# slack_webhook_url = ""

# ============================================================================
# Container Apps Configuration
# ============================================================================

container_apps = {
  "gateway" = {
    min_replicas = 1       # Always on for routing
    max_replicas = 5
    cpu          = 0.5
    memory       = "1Gi"
    port         = 3000
    external     = true
    services     = ["api-gateway"]
  }
  "core" = {
    min_replicas = 0       # Scale to zero when idle
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

# ============================================================================
# Secrets (DO NOT commit actual values!)
# ============================================================================
#
# Set these via environment variables:
#   export TF_VAR_smtp_user="your-email@gmail.com"
#   export TF_VAR_smtp_pass="your-app-password"
#   export TF_VAR_openai_api_key="sk-..."
#   export TF_VAR_razorpay_key_id="rzp_..."
#   export TF_VAR_razorpay_key_secret="..."
#
# Or create a separate secrets.tfvars file (add to .gitignore):
#   terraform apply -var-file="terraform.tfvars" -var-file="secrets.tfvars"
# ============================================================================

# SMTP Settings (for email notifications)
smtp_host = "smtp.gmail.com"
smtp_port = "587"
# smtp_user = ""  # Set via TF_VAR_smtp_user
# smtp_pass = ""  # Set via TF_VAR_smtp_pass

# OpenAI API (for AI features - optional)
# openai_api_key = ""  # Set via TF_VAR_openai_api_key

# Razorpay (for billing - optional)
# razorpay_key_id = ""      # Set via TF_VAR_razorpay_key_id
# razorpay_key_secret = ""  # Set via TF_VAR_razorpay_key_secret
