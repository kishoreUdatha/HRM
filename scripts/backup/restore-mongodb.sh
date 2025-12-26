#!/bin/bash
# ===========================================
# HRM MongoDB Restore Script
# For internal MongoDB deployed in AKS cluster
# ===========================================

set -e

# Configuration
RESTORE_DIR="/tmp/mongodb-restore"

# Azure Storage Configuration (for retrieving backups)
AZURE_STORAGE_ACCOUNT="${AZURE_STORAGE_ACCOUNT:-hrmprodstorage}"
AZURE_STORAGE_CONTAINER="${AZURE_STORAGE_CONTAINER:-hrm-backups}"
AZURE_STORAGE_KEY="${AZURE_STORAGE_KEY:-}"

# MongoDB Configuration (Internal AKS deployment)
# Connection string format: mongodb://root:password@mongodb.hrm-production.svc.cluster.local:27017/?authSource=admin
MONGODB_URI="${MONGODB_URI:-mongodb://root:HRM_MongoDB_2024_Secure!@mongodb.hrm-production.svc.cluster.local:27017/?authSource=admin}"

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

# List available backups
list_backups() {
    log_info "Available backups in Azure Blob Storage:"
    az storage blob list \
        --account-name "${AZURE_STORAGE_ACCOUNT}" \
        --account-key "${AZURE_STORAGE_KEY}" \
        --container-name "${AZURE_STORAGE_CONTAINER}" \
        --prefix "mongodb/" \
        --query "[].{Name:name, LastModified:properties.lastModified, Size:properties.contentLength}" \
        -o table
}

# Download backup from Azure
download_backup() {
    local backup_name=$1

    log_info "Downloading backup: ${backup_name}"
    mkdir -p "${RESTORE_DIR}"

    az storage blob download \
        --account-name "${AZURE_STORAGE_ACCOUNT}" \
        --account-key "${AZURE_STORAGE_KEY}" \
        --container-name "${AZURE_STORAGE_CONTAINER}" \
        --name "${backup_name}" \
        --file "${RESTORE_DIR}/backup.tar.gz" \
        2>&1 || {
            log_error "Failed to download backup"
            return 1
        }

    log_info "Backup downloaded successfully"
}

# Extract backup
extract_backup() {
    log_info "Extracting backup..."
    cd "${RESTORE_DIR}"
    tar -xzf backup.tar.gz
    rm backup.tar.gz
    log_info "Backup extracted"
}

# Restore database
restore_database() {
    local db_name=$1
    local backup_path=$2

    log_info "Restoring database: ${db_name}"

    mongorestore \
        --uri="${MONGODB_URI}" \
        --db="${db_name}" \
        --gzip \
        --drop \
        "${backup_path}/${db_name}" \
        2>&1 || {
            log_error "Failed to restore database: ${db_name}"
            return 1
        }

    log_info "Successfully restored: ${db_name}"
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    rm -rf "${RESTORE_DIR}"
    log_info "Cleanup completed"
}

# Usage
usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  list              List available backups"
    echo "  restore <name>    Restore from specified backup"
    echo "  latest            Restore from latest backup"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 restore mongodb/hrm_backup_20241225_120000.tar.gz"
    echo "  $0 latest"
}

# Main
main() {
    local command=$1

    # Validate required variables
    if [ -z "${MONGODB_URI}" ]; then
        log_error "MONGODB_URI is not set"
        exit 1
    fi

    if [ -z "${AZURE_STORAGE_KEY}" ]; then
        log_error "AZURE_STORAGE_KEY is not set"
        exit 1
    fi

    case $command in
        list)
            list_backups
            ;;
        restore)
            if [ -z "$2" ]; then
                log_error "Please specify backup name"
                usage
                exit 1
            fi
            download_backup "$2"
            extract_backup

            # Find the backup directory
            backup_dir=$(find "${RESTORE_DIR}" -type d -name "hrm_backup_*" | head -1)

            if [ -z "${backup_dir}" ]; then
                log_error "No backup directory found"
                exit 1
            fi

            # Restore all databases found in backup
            for db_path in "${backup_dir}"/*/; do
                db_name=$(basename "${db_path}")
                restore_database "${db_name}" "${backup_dir}"
            done

            cleanup
            log_info "Restore completed successfully!"
            ;;
        latest)
            # Get latest backup name
            latest=$(az storage blob list \
                --account-name "${AZURE_STORAGE_ACCOUNT}" \
                --account-key "${AZURE_STORAGE_KEY}" \
                --container-name "${AZURE_STORAGE_CONTAINER}" \
                --prefix "mongodb/" \
                --query "sort_by([].{name:name, lastModified:properties.lastModified}, &lastModified)[-1].name" \
                -o tsv)

            if [ -z "${latest}" ]; then
                log_error "No backups found"
                exit 1
            fi

            log_info "Latest backup: ${latest}"
            $0 restore "${latest}"
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
