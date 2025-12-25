# ===========================================
# HRM SaaS Platform - Terraform Variables
# ===========================================

variable "project_name" {
  description = "Name of the project"
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

# ===========================================
# AKS CONFIGURATION
# ===========================================

variable "kubernetes_version" {
  description = "Kubernetes version for AKS"
  type        = string
  default     = "1.28.5"
}

variable "aks_system_node_count" {
  description = "Number of nodes in system node pool"
  type        = number
  default     = 2
}

variable "aks_system_node_size" {
  description = "VM size for system nodes"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "aks_user_node_count" {
  description = "Number of nodes in user node pool"
  type        = number
  default     = 3
}

variable "aks_user_node_size" {
  description = "VM size for user nodes"
  type        = string
  default     = "Standard_D4s_v3"
}

# ===========================================
# NETWORKING
# ===========================================

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "hrm.example.com"
}

variable "create_dns_zone" {
  description = "Whether to create Azure DNS zone"
  type        = bool
  default     = false
}

# ===========================================
# MONITORING & ALERTS
# ===========================================

variable "alert_email" {
  description = "Email for alert notifications"
  type        = string
  default     = "ops@example.com"
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  default     = ""
  sensitive   = true
}

# ===========================================
# EXTERNAL SERVICES
# ===========================================

variable "openai_api_key" {
  description = "OpenAI API key for AI features"
  type        = string
  default     = ""
  sensitive   = true
}

variable "sendgrid_api_key" {
  description = "SendGrid API key for email"
  type        = string
  default     = ""
  sensitive   = true
}

variable "razorpay_key_id" {
  description = "Razorpay Key ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "razorpay_key_secret" {
  description = "Razorpay Key Secret"
  type        = string
  default     = ""
  sensitive   = true
}
