# Deep Linking Debug Test Instructions

## Test the Email Link Flow with Debug Logging

### Step 1: Open Browser Console
1. Open Chrome/Edge in **Incognito mode** (to ensure you're logged out)
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Click the **Clear** button to start fresh

### Step 2: Click Email Link
1. Open the test email sent to **sales@candycodetech.com**
2. Click the **"Renew Now"** button
3. You should be redirected to: `https://hrzio.com/billing`
4. Then automatically redirected to: `https://hrzio.com/login`

**Check Console Logs** - You should see:
```
[ProtectedRoute] Redirecting to login from: /billing
[ProtectedRoute] Passing state: { from: { pathname: '/billing', ... } }
```

### Step 3: Login
1. On the login page, **before entering anything**, check the console
2. You should see:
```
[Login] Location state: { from: { pathname: '/billing', ... } }
[Login] Redirect target: /billing
```

3. Enter your organization slug (e.g., `test-company`)
4. Click **Continue**
5. Enter email and password
6. Click **Sign In**

### Step 4: Check Redirect
After successful login, watch the console for:
```
[Login] Redirecting authenticated user to: /billing
```

**Expected Result**: You should land on `/billing` page ✓
**Current Issue**: Landing on `/dashboard` page ❌

---

## Debug Information to Collect

If you still land on `/dashboard` instead of `/billing`, please collect this info:

### From Console Tab:
1. Screenshot all console logs
2. Look for any errors (red messages)
3. Check if the logs show:
   - Was `from` stored as `/billing`?
   - What did it redirect to?

### From Network Tab:
1. Go to **Network** tab in DevTools
2. Filter by: `Doc` (documents only)
3. Look for the sequence of navigations:
   - `/billing` → 302 redirect → `/login`
   - After login → redirect to `/dashboard` or `/billing`?

---

## If Issue Persists

### Check Location State Manually
On the login page, before submitting, open console and type:
```javascript
window.location.state
```

This will show what state was passed from the ProtectedRoute.

### Alternative Test - Direct URL
1. Logout completely
2. Manually type in browser: `https://hrzio.com/billing`
3. Check console logs during redirect
4. Login and see where you land

---

## Expected Console Log Flow

```
# When clicking email link and landing on protected page:
[ProtectedRoute] Redirecting to login from: /billing
[ProtectedRoute] Passing state: { from: Location { pathname: '/billing', ... } }

# When login page loads:
[Login] Location state: { from: Location { pathname: '/billing', ... } }
[Login] Redirect target: /billing

# After successful authentication:
[Login] Redirecting authenticated user to: /billing

# Result: Browser URL changes to https://hrzio.com/billing ✓
```

---

## Possible Issues to Look For

1. **State Not Preserved**: If logs show `Location state: null` or `undefined`
2. **Wrong Redirect Target**: If logs show `Redirect target: /dashboard`
3. **State Lost During Tenant Verification**: Check if state exists after entering slug
4. **Browser Cache**: Try in Incognito/Private mode

---

## Send Me This Info

Please copy-paste from console:
1. All messages starting with `[ProtectedRoute]`
2. All messages starting with `[Login]`
3. Final URL after login
4. Any error messages (red text)

This will help me understand exactly where the state is being lost!
