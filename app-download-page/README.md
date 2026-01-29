# HRM Mobile App Download Page

This directory contains the download page and deployment scripts for the HRM Mobile App.

## Files

- `index.html` - Beautiful download page for the APK
- `HRMobile-release.apk` - Latest release APK (production build)
- `deploy.sh` - Linux/Mac deployment script
- `deploy.ps1` - Windows deployment script
- `auto-deploy.yml` - GitHub Actions workflow for automatic deployment

## Quick Start

### Option 1: Deploy via SCP (Linux/Mac)

```bash
cd app-download-page
chmod +x deploy.sh
./deploy.sh
```

### Option 2: Deploy via PowerShell (Windows)

```powershell
cd app-download-page
.\deploy.ps1
```

### Option 3: Manual Deployment

1. Upload `index.html` and `HRMobile-release.apk` to your web server
2. Place them in the `/var/www/html/app/` directory (or equivalent)
3. Ensure files have proper permissions: `chmod 644 *`
4. Access at: `https://hrzio.com/app/`

## Deployment Methods

### SSH/SCP Deployment

Edit the deployment script and update:
```bash
REMOTE_HOST="hrzio.com"
REMOTE_USER="your-username"
REMOTE_PATH="/var/www/html/app"
```

Then run:
```bash
./deploy.sh
```

### FTP Deployment

If using FTP, update the FTP credentials in the script and select option 2.

### Azure Blob Storage

If your website uses Azure Blob Storage for static hosting:

```powershell
# Set your storage account name
$STORAGE_ACCOUNT = "hrmprodstorage"

# Upload files
az storage blob upload --account-name $STORAGE_ACCOUNT --container-name app --name index.html --file index.html
az storage blob upload --account-name $STORAGE_ACCOUNT --container-name app --name HRMobile-release.apk --file HRMobile-release.apk
```

## Automatic Deployment with GitHub Actions

The included `auto-deploy.yml` can be added to `.github/workflows/` to automatically deploy when you push changes.

### Setup:

1. Add GitHub secrets:
   - `SSH_HOST` - Your server hostname (hrzio.com)
   - `SSH_USERNAME` - SSH username
   - `SSH_PRIVATE_KEY` - SSH private key
   - `DEPLOY_PATH` - Server path (/var/www/html/app)

2. Copy `auto-deploy.yml` to `.github/workflows/`

3. Push changes to trigger deployment

## Build New APK

To rebuild the APK with latest changes:

```bash
cd ../mobile-app/android
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk ../../app-download-page/HRMobile-release.apk
```

## Nginx Configuration

If using Nginx, add this to your server block:

```nginx
location /app {
    alias /var/www/html/app;
    index index.html;

    # Enable CORS for APK download
    add_header Access-Control-Allow-Origin *;

    # Set correct MIME type for APK
    location ~ \.apk$ {
        add_header Content-Type application/vnd.android.package-archive;
        add_header Content-Disposition 'attachment; filename="HRMobile.apk"';
    }
}
```

## Apache Configuration

If using Apache, add this to your `.htaccess`:

```apache
<Files "*.apk">
    Header set Content-Type "application/vnd.android.package-archive"
    Header set Content-Disposition "attachment; filename=\"HRMobile.apk\""
</Files>
```

## Testing Locally

To test the download page locally:

```bash
# Python 3
python -m http.server 8080

# Then visit: http://localhost:8080
```

## Mobile App Version Updates

When releasing a new version:

1. Update version in `mobile-app/package.json`
2. Update version in `index.html` (line with id="version")
3. Rebuild APK: `cd mobile-app/android && ./gradlew assembleRelease`
4. Copy APK to download page
5. Deploy

## Security Notes

- The APK should be signed with your release keystore
- Always scan APKs for security before deployment
- Use HTTPS for the download page
- Consider implementing version checking in the mobile app

## Support

For issues or questions, contact your development team.
