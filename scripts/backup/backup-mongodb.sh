#!/bin/bash
# ===========================================
# HRM MongoDB Backup Script
# For internal MongoDB deployed in AKS cluster
# ===========================================

set -e

# Configuration
BACKUP_DIR="/tmp/mongodb-backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="hrm_backup_${DATE}"
RETENTION_DAYS=30

# Azure Storage Configuration (for storing backups)
AZURE_STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-hrmprodstorage}"
AZURE_STORAGE_CONTAINER="${AZURE_STORAGE_CONTAINER:-hrm-backups}"
AZURE_STORAGE_KEY="${AZURE_STORAGE_KEY:-}"

# MongoDB Configuration (Internal AKS deployment)
# Connection string format: mongodb://root:password@mongodb.hrm-production.svc.cluster.local:27017/?authSource=admin
MONGODB_URI="${MONGODB_URI:-mongodb://root:HRM_MongoDB_2024_Secure!@mongodb.hrm-production.svc.cluster.local:27017/?authSource=admin}"

# List of databases to backup
DATABASES=(
    "hrm_auth"
    "hrm_tenants"
    "hrm_employees"
    "hrm_attendance"
    "hrm_leaves"
    "hrm_payroll"
    "hrm_notifications"
    "hrm_reports"
    "hrm_chat"
    "hrm_analytics"
    "hrm_documents"
    "hrm_integrations"
    "hrm_engagement"
    "hrm_chatbot"
    "hrm_ai_ml"
    "hrm_recruitment"
    "hrm_localization"
    "hrm_benefits"
    "hrm_onboarding"
    "hrm_compliance"
    "hrm_expenses"
    "hrm_timesheets"
    "hrm_assets"
    "hrm_grievances"
    "hrm_billing"
    "hrm_workforce"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
create_backup_dir() {
    log_info "Creating backup directory: ${BACKUP_DIR}/${BACKUP_NAME}"
    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"
}

# Backup individual database
backup_database() {
    local db_name=$1
    log_info "Backing up database: ${db_name}"

    mongodump \
        --uri="${MONGODB_URI}" \
        --db="${db_name}" \
        --out="${BACKUP_DIR}/${BACKUP_NAME}" \
        --gzip \
        2>&1 || {
            log_error "Failed to backup database: ${db_name}"
            return 1
        }

    log_info "Successfully backed up: ${db_name}"
}

# Compress backup
compress_backup() {
    log_info "Compressing backup..."
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
    rm -rf "${BACKUP_NAME}"
    log_info "Backup compressed: ${BACKUP_NAME}.tar.gz"
}

# Upload to Azure Blob Storage
upload_to_azure() {
    log_info "Uploading backup to Azure Blob Storage..."

    if [ -z "${AZURE_STORAGE_KEY}" ]; then
        log_error "AZURE_STORAGE_KEY is not set"
        return 1
    fi

    az storage blob upload \
        --account-name "${AZURE_STORAGE_ACCOUNT}" \
        --account-key "${AZURE_STORAGE_KEY}" \
        --container-name "${AZURE_STORAGE_CONTAINER}" \
        --file "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
        --name "mongodb/${BACKUP_NAME}.tar.gz" \
        --overwrite \
        2>&1 || {
            log_error "Failed to upload backup to Azure"
            return 1
        }

    log_info "Backup uploaded successfully to Azure Blob Storage"
}

# Cleanup old backups from Azure
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    # Calculate cutoff date
    CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%dT%H:%M:%SZ)

    # List and delete old blobs
    az storage blob list \
        --account-name "${AZURE_STORAGE_ACCOUNT}" \
        --account-key "${AZURE_STORAGE_KEY}" \
        --container-name "${AZURE_STORAGE_CONTAINER}" \
        --prefix "mongodb/" \
        --query "[?properties.lastModified<'${CUTOFF_DATE}'].name" \
        -o tsv | while read blob_name; do
            log_info "Deleting old backup: ${blob_name}"
            az storage blob delete \
                --account-name "${AZURE_STORAGE_ACCOUNT}" \
                --account-key "${AZURE_STORAGE_KEY}" \
                --container-name "${AZURE_STORAGE_CONTAINER}" \
                --name "${blob_name}"
        done

    log_info "Cleanup completed"
}

# Cleanup local backup files
cleanup_local() {
    log_info "Cleaning up local backup files..."
    rm -rf "${BACKUP_DIR}"
    log_info "Local cleanup completed"
}

# Send notification (Slack/Email)
send_notification() {
    local status=$1
    local message=$2

    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"MongoDB Backup ${status}: ${message}\"}" \
            "${SLACK_WEBHOOK_URL}" 2>/dev/null || true
    fi
}

# Main execution
main() {
    log_info "Starting MongoDB backup process..."
    log_info "Backup name: ${BACKUP_NAME}"

    # Validate required variables
    if [ -z "${MONGODB_URI}" ]; then
        log_error "MONGODB_URI is not set"
        exit 1
    fi

    # Create backup directory
    create_backup_dir

    # Backup all databases
    local failed=0
    for db in "${DATABASES[@]}"; do
        backup_database "${db}" || ((failed++))
    done

    if [ $failed -gt 0 ]; then
        log_warn "${failed} database(s) failed to backup"
    fi

    # Compress backup
    compress_backup

    # Upload to Azure
    upload_to_azure

    # Cleanup old backups
    cleanup_old_backups

    # Cleanup local files
    cleanup_local

    log_info "Backup process completed successfully!"
    send_notification "SUCCESS" "Backup ${BACKUP_NAME} completed successfully"
}

# Run main function
main "$@"
