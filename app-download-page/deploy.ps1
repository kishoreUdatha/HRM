# HRM Mobile App - Deployment Script for Windows
# This script deploys the APK and download page to hrzio.com/app

# Configuration
$REMOTE_HOST = "hrzio.com"
$REMOTE_USER = "your-username"
$REMOTE_PATH = "/var/www/html/app"  # Adjust this path based on your server configuration

Write-Host "========================================" -ForegroundColor Blue
Write-Host "  HRM Mobile App Deployment" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Check if files exist
if (-not (Test-Path "index.html")) {
    Write-Host "Error: index.html not found" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "HRMobile-release.apk")) {
    Write-Host "Error: HRMobile-release.apk not found" -ForegroundColor Red
    exit 1
}

# Method 1: Deploy via SCP (using WinSCP or pscp)
function Deploy-SCP {
    Write-Host "Deploying via SCP..." -ForegroundColor Blue

    # Using pscp (PuTTY's SCP client)
    # Install from: https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html

    $sshCommand = "${REMOTE_USER}@${REMOTE_HOST}"

    # Create remote directory
    plink $sshCommand "mkdir -p ${REMOTE_PATH}"

    # Upload files
    pscp index.html "${sshCommand}:${REMOTE_PATH}/"
    pscp HRMobile-release.apk "${sshCommand}:${REMOTE_PATH}/"

    # Set permissions
    plink $sshCommand "chmod 644 ${REMOTE_PATH}/*"

    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "Access your app at: https://${REMOTE_HOST}/app/" -ForegroundColor Green
}

# Method 2: Deploy via FTP (using WinSCP scripting)
function Deploy-FTP {
    Write-Host "Deploying via FTP..." -ForegroundColor Blue

    # Create WinSCP script
    $scriptContent = @"
open ftp://${REMOTE_USER}@${REMOTE_HOST}
cd ${REMOTE_PATH}
put index.html
put HRMobile-release.apk
close
exit
"@

    $scriptContent | Out-File -FilePath "winscp_script.txt" -Encoding ASCII

    # Run WinSCP with script (requires WinSCP installed)
    & "C:\Program Files (x86)\WinSCP\WinSCP.com" /script=winscp_script.txt

    Remove-Item "winscp_script.txt"

    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "Access your app at: https://${REMOTE_HOST}/app/" -ForegroundColor Green
}

# Method 3: Deploy to Azure Blob Storage (if using Azure)
function Deploy-Azure {
    Write-Host "Deploying to Azure Blob Storage..." -ForegroundColor Blue

    # Requires Azure CLI installed: https://aka.ms/installazurecliwindows
    $STORAGE_ACCOUNT = "hrmprodstorage"
    $CONTAINER = "app"

    # Upload files
    az storage blob upload --account-name $STORAGE_ACCOUNT --container-name $CONTAINER --name "index.html" --file "index.html" --overwrite
    az storage blob upload --account-name $STORAGE_ACCOUNT --container-name $CONTAINER --name "HRMobile-release.apk" --file "HRMobile-release.apk" --overwrite

    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "Access your app at: https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}/index.html" -ForegroundColor Green
}

# Show menu
Write-Host "Select deployment method:"
Write-Host "1) SCP (using PuTTY tools)"
Write-Host "2) FTP (using WinSCP)"
Write-Host "3) Azure Blob Storage"
Write-Host "4) Exit"
Write-Host ""
$choice = Read-Host "Enter choice [1-4]"

switch ($choice) {
    "1" { Deploy-SCP }
    "2" { Deploy-FTP }
    "3" { Deploy-Azure }
    "4" {
        Write-Host "Deployment cancelled"
        exit 0
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
        exit 1
    }
}
