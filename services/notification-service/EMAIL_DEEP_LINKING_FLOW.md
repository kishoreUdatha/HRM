# Email Deep Linking & Authentication Flow

## Overview
This document explains how email links work with authentication and deep linking in the HRZIO application.

---

## Fixed Issues

### 1. **Correct Domain**
- **Before**: `https://app.hrzio.com`
- **After**: `https://hrzio.com`
- All email templates now use the correct production domain

### 2. **Deep Linking Implementation**
- **Before**: Users were always redirected to `/dashboard` after login, regardless of which page they tried to access
- **After**: Users are now redirected back to the page they originally requested

---

## Complete User Flow

### Scenario 1: User is Already Logged In

```
1. User receives email: "Your plan expires in 7 days"
2. Email contains button: "Renew Now" → https://hrzio.com/billing
3. User clicks button
4. Frontend checks authentication (JWT token in localStorage)
5. ✅ User is authenticated
6. User goes directly to /billing page
7. User can renew subscription immediately
```

### Scenario 2: User is NOT Logged In

```
1. User receives email: "Payment Failed - Update Payment Method"
2. Email contains button: "Update Payment Method" → https://hrzio.com/billing
3. User clicks button
4. ProtectedRoute component intercepts the request
5. ❌ User is not authenticated
6. User is redirected to: /login
   - Original URL is saved in location.state: { from: { pathname: '/billing' } }
7. User logs in with organization slug + email + password
8. After successful authentication:
   - Login component reads location.state.from.pathname
   - Redirects user to: /billing (the original page they requested)
9. ✅ User is now on the billing page and can update payment method
```

---

## Email Template URL Mapping

All email templates now use these correct URLs:

| Email Type | Button/Link | URL | Purpose |
|------------|-------------|-----|---------|
| **Payment Success** | Download Invoice | `data.invoiceUrl` (dynamic) | View/download invoice PDF |
| **Payment Failed** | Update Payment Method | `/billing` | Update payment method, retry payment |
| **Invoice Generated** | Download Invoice | `data.invoiceUrl` (dynamic) | View/download invoice PDF |
| **Subscription Activated** | Go to Dashboard | `/dashboard` | Access main dashboard |
| **Plan Expiring (7/3 days)** | Renew Now | `/billing` | Renew subscription |
| **Plan Expiring** | View Upgrade Options | `/billing` | View and upgrade to higher plans |
| **Plan Expired** | Reactivate Subscription | `/billing` | Reactivate expired subscription |
| **Subscription Cancelled** | Reactivate Subscription | `/billing` | Reactivate cancelled subscription |

---

## Technical Implementation

### Frontend Changes

**File**: `frontend/src/pages/Login.tsx`

**Before**:
```typescript
useEffect(() => {
  if (isAuthenticated) {
    navigate('/dashboard');  // Always goes to dashboard
  }
}, [isAuthenticated, navigate]);
```

**After**:
```typescript
useEffect(() => {
  if (isAuthenticated) {
    // Redirect to the original page they were trying to access
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  }
}, [isAuthenticated, navigate, location]);
```

### Backend Changes

**Files Updated**:
1. `services/notification-service/.env`
   - `DASHBOARD_URL=https://hrzio.com`

2. `services/notification-service/src/templates/billing/index.ts`
   - All URLs changed from `app.hrzio.com` to `hrzio.com`
   - All paths updated to match actual frontend routes

3. `.env.example`
   - Updated documentation with correct domain

---

## Protected Routes

The following routes require authentication and support deep linking:

### Billing & Subscription (requires `settings:write` permission)
- `/billing` - Main billing page with 3 tabs:
  - **Current Plan**: View subscription details, features, cancel subscription
  - **Invoices**: View invoice history, download invoices
  - **Upgrade**: Select and upgrade to different plans

### Other Protected Routes
- `/dashboard` - Main dashboard (basic authentication)
- `/employees`, `/attendance`, `/leaves`, `/payroll`, etc. - Require specific permissions

---

## Authentication Mechanism

### JWT Token Storage
- **Access Token**: Stored in `localStorage.getItem('accessToken')`
- **Refresh Token**: Stored in `localStorage.getItem('refreshToken')`
- **Tenant ID**: Stored in `localStorage.getItem('tenantId')`

### Token Validation Flow
```
1. User lands on protected page (e.g., /billing)
2. ProtectedRoute component checks: localStorage.getItem('accessToken')
3. If token exists:
   - Validate JWT expiration
   - Check user permissions
   - If valid → Show page
   - If expired → Auto-refresh token via API
4. If no token or refresh fails:
   - Redirect to /login with state={{ from: location }}
```

### Auto Token Refresh
- Implemented in `frontend/src/services/api.ts`
- Automatically refreshes expired access tokens using refresh token
- Handles 401 responses transparently

---

## Testing the Flow

### Test 1: Authenticated User
```bash
# 1. Login to https://hrzio.com
# 2. Click email link to /billing
# 3. Should go directly to billing page ✓
```

### Test 2: Unauthenticated User
```bash
# 1. Logout or open incognito window
# 2. Click email link to /billing
# 3. Should redirect to /login
# 4. After login, should go to /billing (not /dashboard) ✓
```

### Test 3: Send Test Email
```bash
curl -X POST http://localhost:3025/billing/payment-failed \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 507f1f77bcf86cd799439011" \
  -d '{
    "email": "test@example.com",
    "tenantName": "Acme Corp",
    "planName": "Professional",
    "amount": 3999,
    "currency": "INR",
    "billingCycle": "monthly"
  }'
```

Check email for button link: Should be `https://hrzio.com/billing`

---

## Security Considerations

### Current Implementation
✓ JWT token-based authentication
✓ Token auto-refresh on expiration
✓ Permission-based access control
✓ Protected routes with ProtectedRoute component

### Recommendations
⚠️ Consider moving tokens to httpOnly cookies for XSS protection
⚠️ Implement CSRF protection for cookie-based auth
✓ Deep linking now works correctly
✓ Users can't bypass authentication by manipulating URLs

---

## Billing Page Structure

The `/billing` page has 3 tabs managed by `BillingSettings.tsx`:

1. **Current Plan Tab**
   - Shows current subscription details
   - Displays plan features
   - Shows employee/admin limits
   - Cancel subscription button

2. **Invoices Tab**
   - Lists all invoices
   - Download invoice as PDF
   - Filter by status, date range

3. **Upgrade Tab**
   - Plan comparison cards (Free, Starter, Professional, Enterprise)
   - Toggle between Monthly/Yearly billing
   - Shows pricing, features, limits
   - "Upgrade Now" button triggers Razorpay payment

---

## Invoice URL Generation

Invoice URLs are generated by the billing service and passed to email templates:

```typescript
invoiceUrl: `https://hrzio.com/billing?tab=invoices&invoice=${invoiceNumber}`
```

When clicked:
- Opens billing page
- Switches to "Invoices" tab
- Highlights the specific invoice
- User can download PDF

---

## Environment Variables

### Notification Service (.env)
```bash
RESEND_API_KEY=re_aEaESrEW_335xZsH9ukBMxqRCakiWM6Cr
EMAIL_FROM=HRZIO <billing@hrzio.com>
DASHBOARD_URL=https://hrzio.com
SUPPORT_EMAIL=support@hrzio.com
```

### Billing Service (.env)
```bash
NOTIFICATION_SERVICE_URL=http://localhost:3025/api/notifications
TENANT_SERVICE_URL=http://localhost:3021/api/tenants
```

---

## Summary

✅ **Domain Fixed**: All emails now use `https://hrzio.com`
✅ **Deep Linking Working**: Users redirect to original requested page after login
✅ **Correct Paths**: All email links use proper frontend routes
✅ **Authentication Flow**: Seamless experience for both logged-in and logged-out users
✅ **Security**: Protected routes with permission checking
✅ **User Experience**: No confusion, direct access to billing features

Users can now click email links and seamlessly access the billing page, whether they're logged in or not!
