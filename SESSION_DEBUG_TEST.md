# Session Persistence Debug Test

## Issue
User logs in successfully, but when opening https://hrzio.com/billing in a new tab (same browser), it asks to login again instead of recognizing the existing session.

## Debug Test Steps

### Step 1: Login and Initial Tab
1. Open Chrome/Edge in **normal mode** (not incognito)
2. Press **F12** to open Developer Tools → **Console** tab
3. Clear console
4. Go to https://hrzio.com/billing
5. Login with your credentials

**Watch for these logs:**
```
[login] Attempting login
[login] Login successful, saving tokens
[login] Tokens saved to localStorage
[login] AccessToken: eyJhbGciOiJIUzI1NiI...
[login] TenantId: 67xxxxx
```

6. **After successful login**, open **Application** tab in DevTools
7. Go to **Storage → Local Storage → https://hrzio.com**
8. **Take screenshot** of localStorage showing:
   - `accessToken`
   - `refreshToken`
   - `tenantId`

9. Note the values (first 20 chars of accessToken is enough)

### Step 2: Open New Tab (While First Tab is Open)
1. Keep the first tab open
2. Press **Ctrl+T** to open a new tab
3. In the new tab, press **F12** → **Console** tab
4. Go to https://hrzio.com/billing

**Watch for these logs:**
```
[checkAuth] Starting authentication check
[checkAuth] Token found: Yes/No
[isTokenExpired] Token expiration check:
[isTokenExpired] Current time: 2026-01-14T...
[isTokenExpired] Token expires: 2026-01-14T...
[isTokenExpired] Is expired: true/false
[isTokenExpired] Time until expiry (minutes): X.XX
```

5. In the new tab, also check **Application → Local Storage**
6. **Compare** if the `accessToken` matches the first tab

### Step 3: Analyze Results

#### Scenario A: Token Not Found
If logs show:
```
[checkAuth] Token found: No
```

**Problem**: localStorage not syncing across tabs
**Solutions**:
- Browser bug (unlikely)
- Need to investigate localStorage usage

#### Scenario B: Token Expired
If logs show:
```
[checkAuth] Token found: Yes
[isTokenExpired] Is expired: true
[isTokenExpired] Time until expiry (minutes): -5.00
```

**Problem**: JWT token expiration is too short
**Solution**: Increase token expiration time in backend auth service

#### Scenario C: Token Valid but API Call Fails
If logs show:
```
[checkAuth] Token found: Yes
[isTokenExpired] Is expired: false
[checkAuth] Token is valid, fetching user data
[checkAuth] Authentication failed: Error...
```

**Problem**: API call failing (CORS, network, or server error)
**Solution**: Check backend logs and network errors

#### Scenario D: Token Valid, API Succeeds, but Still Redirects
If logs show:
```
[checkAuth] Authentication successful
```
But still redirects to login...

**Problem**: React state management issue
**Solution**: Check Redux store state

---

## Additional Debug Info to Collect

### In Console, run these commands:

**Check localStorage manually:**
```javascript
console.log('accessToken:', localStorage.getItem('accessToken')?.substring(0, 30) + '...');
console.log('refreshToken:', localStorage.getItem('refreshToken')?.substring(0, 30) + '...');
console.log('tenantId:', localStorage.getItem('tenantId'));
```

**Check token expiration manually:**
```javascript
const token = localStorage.getItem('accessToken');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  const exp = new Date(payload.exp * 1000);
  const now = new Date();
  console.log('Token expires:', exp.toISOString());
  console.log('Current time:', now.toISOString());
  console.log('Minutes until expiry:', ((exp - now) / 1000 / 60).toFixed(2));
}
```

---

## Expected Behavior

When you open a new tab and navigate to /billing:
1. `[checkAuth]` should find the token
2. Token should NOT be expired
3. API call to `/auth/me` should succeed
4. You should see the billing page, NOT login page

---

## Send Me This Info

Please copy-paste from console:
1. **All logs from Step 1** (login process)
2. **All logs from Step 2** (new tab opening)
3. **localStorage values** from both tabs
4. **Any red error messages**
5. **Network tab** - check if `/auth/me` API call is made and what status code it returns

This will help me pinpoint exactly where the session is breaking!
