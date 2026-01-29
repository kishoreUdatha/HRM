#!/bin/bash

# HRM Mobile App - Deployment Script
# This script deploys the APK and download page to hrzio.com/app

# Configuration
REMOTE_HOST="hrzio.com"
REMOTE_USER="your-username"
REMOTE_PATH="/var/www/html/app"  # Adjust this path based on your server configuration

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  HRM Mobile App Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if files exist
if [ ! -f "index.html" ]; then
    echo -e "${RED}Error: index.html not found${NC}"
    exit 1
fi

if [ ! -f "HRMobile-release.apk" ]; then
    echo -e "${RED}Error: HRMobile-release.apk not found${NC}"
    exit 1
fi

# Method 1: Deploy via SCP (recommended)
deploy_scp() {
    echo -e "${BLUE}Deploying via SCP...${NC}"

    # Create remote directory if it doesn't exist
    ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_PATH}"

    # Upload files
    scp index.html ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/
    scp HRMobile-release.apk ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/

    # Set permissions
    ssh ${REMOTE_USER}@${REMOTE_HOST} "chmod 644 ${REMOTE_PATH}/*"

    echo -e "${GREEN}Deployment successful!${NC}"
    echo -e "${GREEN}Access your app at: https://${REMOTE_HOST}/app/${NC}"
}

# Method 2: Deploy via FTP
deploy_ftp() {
    echo -e "${BLUE}Deploying via FTP...${NC}"

    # You'll need to install lftp: sudo apt-get install lftp
    lftp -u ${REMOTE_USER} ${REMOTE_HOST} <<EOF
cd ${REMOTE_PATH}
put index.html
put HRMobile-release.apk
bye
EOF

    echo -e "${GREEN}Deployment successful!${NC}"
    echo -e "${GREEN}Access your app at: https://${REMOTE_HOST}/app/${NC}"
}

# Method 3: Deploy via rsync (fastest for updates)
deploy_rsync() {
    echo -e "${BLUE}Deploying via rsync...${NC}"

    rsync -avz --progress \
        index.html \
        HRMobile-release.apk \
        ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/

    echo -e "${GREEN}Deployment successful!${NC}"
    echo -e "${GREEN}Access your app at: https://${REMOTE_HOST}/app/${NC}"
}

# Show menu
echo "Select deployment method:"
echo "1) SCP (recommended)"
echo "2) FTP"
echo "3) rsync"
echo "4) Exit"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        deploy_scp
        ;;
    2)
        deploy_ftp
        ;;
    3)
        deploy_rsync
        ;;
    4)
        echo "Deployment cancelled"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
