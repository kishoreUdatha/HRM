#!/bin/bash
# ===========================================
# Deploy Timesheet Service to Production
# ===========================================
# Usage: ./scripts/deploy-timesheet-service.sh
#
# This script deploys the timesheet service to the production server.
# Run this from your local machine or CI/CD pipeline.
# ===========================================

set -e

# Configuration
PRODUCTION_SERVER="135.171.160.105"
PRODUCTION_USER="${DEPLOY_USER:-root}"
PROJECT_DIR="/opt/hrm"
SERVICE_NAME="timesheet-service"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "  Deploying Timesheet Service"
echo "  Server: ${PRODUCTION_SERVER}"
echo "=========================================="

# Step 1: Commit and push changes
log_info "Step 1: Committing changes..."
git add services/timesheet-service/
git commit -m "Update timesheet service with attendance sync feature" 2>/dev/null || log_warn "Nothing to commit"

# Step 2: Deploy to production server
log_info "Step 2: Deploying to production server..."

ssh ${PRODUCTION_USER}@${PRODUCTION_SERVER} << 'ENDSSH'
set -e

cd /opt/hrm || cd ~/hrm || { echo "Project directory not found"; exit 1; }

echo "Pulling latest changes..."
git pull origin master 2>/dev/null || git pull origin main 2>/dev/null || echo "Git pull skipped"

echo "Rebuilding timesheet service..."
docker-compose build timesheet-service

echo "Restarting timesheet service..."
docker-compose up -d timesheet-service

echo "Waiting for service to start..."
sleep 5

echo "Checking service status..."
docker-compose logs --tail=20 timesheet-service

echo "Service deployed successfully!"
ENDSSH

log_info "Deployment completed!"
echo ""
echo "=========================================="
echo "  Next Steps:"
echo "  1. Run cleanup: POST /api/timesheets/{tenantId}/timesheets/cleanup"
echo "  2. Sync timesheets: POST /api/timesheets/{tenantId}/timesheets/sync-from-attendance?month=12&year=2025"
echo "=========================================="
