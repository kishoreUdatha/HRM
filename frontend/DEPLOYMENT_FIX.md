# Azure Static Web App - Routing Fix

## Problem
When users click email links like `https://hrzio.com/billing`, they get a **404 Not Found** error. This happens because Azure Static Web Apps doesn't know how to handle React Router routes - it tries to find a physical file at `/billing` and fails.

## Root Cause
Azure Static Web Apps needs a `staticwebapp.config.json` configuration file to:
1. Serve `index.html` for all routes (SPA behavior)
2. Let React Router handle the routing on the client side
3. Convert 404 errors into serving the app

## Solution Applied

### 1. Created `staticwebapp.config.json`
**Location**: `frontend/staticwebapp.config.json`

This file configures:
- **Navigation Fallback**: Serves `index.html` for any non-static route
- **Response Overrides**: Converts 404 → 200 with index.html
- **Routes**: Allows all routes for anonymous and authenticated users
- **Security Headers**: Adds XSS protection, frame options, etc.

### 2. Updated `vite.config.ts`
**Location**: `frontend/vite.config.ts`

Added a Vite plugin that automatically copies `staticwebapp.config.json` to the `dist/` folder during build.

## Deployment Required

**IMPORTANT**: The fix requires redeploying the frontend to Azure Static Web Apps.

### Deployment Options

#### Option 1: Using GitHub Actions (Recommended)
```bash
# Commit the changes
cd frontend
git add staticwebapp.config.json vite.config.ts
git commit -m "Fix: Add Azure Static Web App routing configuration for SPA"
git push origin master

# GitHub Actions will automatically deploy to Azure
```

#### Option 2: Manual Deployment with Azure CLI
```bash
# Build the frontend
cd frontend
npm run build

# Deploy to Azure Static Web App (requires Azure CLI)
az staticwebapp deploy \
  --name hrm-prod-frontend \
  --resource-group hrm-prod-rg \
  --app-location "." \
  --output-location "dist"
```

#### Option 3: Using SWA CLI
```bash
# Install SWA CLI if not already installed
npm install -g @azure/static-web-apps-cli

# Build and deploy
cd frontend
npm run build
swa deploy ./dist --deployment-token <YOUR_DEPLOYMENT_TOKEN>
```

## Verification

After deployment, test these URLs:

```bash
# 1. Root should work (landing page or dashboard)
curl -I https://hrzio.com/
# Expected: 200 OK

# 2. Billing page should work
curl -I https://hrzio.com/billing
# Expected: 200 OK (serves index.html, React Router handles /billing)

# 3. Dashboard should work
curl -I https://hrzio.com/dashboard
# Expected: 200 OK

# 4. Any other route should work
curl -I https://hrzio.com/employees
# Expected: 200 OK
```

## Testing Email Links

After deployment, test the email flow:

1. **Send a test email**:
```bash
curl -X POST http://localhost:3025/billing/plan-expiring \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 507f1f77bcf86cd799439011" \
  -d '{
    "email": "your-email@example.com",
    "tenantName": "Test Company",
    "planName": "Professional",
    "amount": 3999,
    "currency": "INR",
    "billingCycle": "monthly",
    "expiryDate": "January 20, 2026",
    "daysUntilExpiry": 7
  }'
```

2. **Click the "Renew Now" button** in the email

3. **Expected behavior**:
   - If logged in: Direct access to `/billing` page ✓
   - If logged out: Redirect to `/login`, then back to `/billing` after login ✓

## What Changed

### Files Created/Modified

1. **Created**: `frontend/staticwebapp.config.json`
   - Configures Azure Static Web App routing
   - Enables SPA fallback to index.html

2. **Modified**: `frontend/vite.config.ts`
   - Added plugin to copy config file to dist on build
   - Ensures config is included in deployments

3. **Copied**: `frontend/dist/staticwebapp.config.json`
   - Manually copied for current build (will auto-copy on next build)

## Additional Notes

### Why This Wasn't Working Before
- Azure Static Web Apps serve static files
- Routes like `/billing` don't exist as physical files
- Without `staticwebapp.config.json`, Azure returns 404
- With the config, Azure serves `index.html` for all routes
- React Router then takes over and renders the correct page

### Security
The config includes security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Performance
- Navigation fallback excludes static assets (CSS, JS, images)
- Only HTML routes are rewritten to index.html
- Maintains optimal caching for assets

## Troubleshooting

### If routes still don't work after deployment:

1. **Check deployment logs**:
```bash
az staticwebapp list --query "[?name=='hrm-prod-frontend']"
```

2. **Verify config file is in deployment**:
   - Visit: `https://hrzio.com/staticwebapp.config.json`
   - Should download or show the JSON config

3. **Clear CDN cache** (if using):
```bash
# Cloudflare
# Go to https://dash.cloudflare.com → Caching → Purge Everything

# Or use API
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

4. **Test in incognito mode**: Bypasses browser cache

## Next Steps

1. ✅ Fixed: Created `staticwebapp.config.json`
2. ✅ Fixed: Updated `vite.config.ts` to auto-copy on build
3. ⏳ **TODO**: Deploy frontend to Azure
4. ⏳ **TODO**: Test email links after deployment
5. ⏳ **TODO**: Clear CDN cache if using Cloudflare

---

**Status**: Ready for deployment
**Impact**: Critical - Email links won't work until deployed
**Effort**: ~5 minutes to deploy via GitHub Actions
