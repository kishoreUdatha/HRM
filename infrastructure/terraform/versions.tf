# ============================================================================
# HRM SaaS Platform - Budget-Optimized Azure Infrastructure
# Terraform Provider Configuration
# Target Budget: $700-900/month (Option 2)
# ============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.85.0"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 1.11.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6.0"
    }
  }

  # Uncomment to use Azure Storage backend for state management
  # backend "azurerm" {
  #   resource_group_name  = "hrm-tfstate-rg"
  #   storage_account_name = "hrmtfstate"
  #   container_name       = "tfstate"
  #   key                  = "production.terraform.tfstate"
  # }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
  skip_provider_registration = true
}

provider "azapi" {}

provider "random" {}
