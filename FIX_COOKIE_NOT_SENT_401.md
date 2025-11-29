# Fix: Cookie Not Being Sent - 401 Unauthorized After Login

## Problem
After successful login, the token cookie is saved, but subsequent API requests return:
```
401 Unauthorized - No token provided
```

This happens on routes like:
- `/api/admin/auth/verify`
- `/api/admin/generations/filter-options`
- `/api/admin/artstation`

## Root Cause

The cookie is being set during login, but the browser isn't sending it back with subsequent requests. This is usually caused by:

1. **Cookie path mismatch** - Cookie set for one path, but requests go to different paths
2. **Cookie domain issues** - Cookie domain doesn't match the request domain
3. **Browser security** - Browser blocking cross-origin cookies

## Solution Applied

### 1. Fixed Cookie Path (✅ Fixed in Code)

Changed cookie to be available for all paths:
```typescript
path: '/'  // Cookie available for all paths on the domain
```

### 2. Added Debugging (✅ Fixed in Code)

Added debug endpoints to check cookie status:
- `/api/admin/cookie-debug` - Shows what cookies are received
- Enhanced logging in auth middleware

## Debugging Steps

### Step 1: Check if Cookie is Set

1. **After login**, open browser DevTools → **Application** → **Cookies**
2. Look for `admin_token` cookie
3. Check:
   - ✅ **Domain**: Should be `.onrender.com` or the backend domain
   - ✅ **Path**: Should be `/`
   - ✅ **Secure**: Should be checked (HTTPS only)
   - ✅ **SameSite**: Should be `None`
   - ✅ **HttpOnly**: Should be checked

### Step 2: Check if Cookie is Being Sent

1. Open DevTools → **Network** tab
2. Try to access a protected route (like `/generations/filter-options`)
3. Click on the failed request
4. Check **Request Headers**:
   - Look for `Cookie: admin_token=...`
   - If missing, cookie isn't being sent

### Step 3: Test Cookie Debug Endpoint

Visit in browser (from your frontend):
```
https://admin-panel-backend-xd9a.onrender.com/api/admin/cookie-debug
```

Should show:
```json
{
  "cookies": {
    "admin_token": "..."
  },
  "hasAdminToken": true,
  "cookieHeader": "admin_token=...",
  "origin": "https://your-frontend-site.netlify.app",
  "path": "/api/admin/cookie-debug"
}
```

If `hasAdminToken` is `false`, the cookie isn't being sent.

### Step 4: Check Backend Logs

In Render Dashboard → Logs, look for:
- `Auth failed - No token:` - Shows what cookies/headers were received
- This will help identify if cookies are missing

## Common Issues & Fixes

### Issue 1: Cookie Path Mismatch

**Symptom**: Cookie set but not sent with requests

**Fix**: ✅ Already fixed - cookie now uses `path: '/'`

### Issue 2: Cookie Domain Wrong

**Symptom**: Cookie not visible in browser DevTools

**Fix**: 
- Don't set `domain` explicitly (let browser handle it)
- ✅ Already fixed - domain not set in production

### Issue 3: SameSite Blocking

**Symptom**: Cookie visible but not sent

**Fix**: ✅ Already fixed - using `sameSite: 'none'` in production

### Issue 4: Browser Blocking Third-Party Cookies

**Symptom**: Cookie not being set or sent

**Fix**:
- Check browser settings - allow third-party cookies
- Try different browser
- Check if browser extensions are blocking cookies

### Issue 5: CORS Not Allowing Credentials

**Symptom**: Cookie set but CORS blocks it

**Fix**: 
- Verify `CORS_ORIGIN` matches frontend URL exactly
- ✅ Already configured - `credentials: true` in CORS

## Verification Checklist

After deploying the fix:

- [ ] Cookie is visible in DevTools → Application → Cookies
- [ ] Cookie has `Path: /`
- [ ] Cookie has `SameSite: None`
- [ ] Cookie has `Secure: true`
- [ ] Network requests show `Cookie: admin_token=...` in headers
- [ ] `/api/admin/cookie-debug` shows `hasAdminToken: true`
- [ ] Protected routes work without 401 errors

## Browser-Specific Issues

### Chrome/Edge
- Check: `chrome://settings/cookies`
- Make sure "Block third-party cookies" is OFF (or site is in exceptions)
- Check: `chrome://flags/#same-site-by-default-cookies` (should be enabled)

### Firefox
- Check: `about:preferences#privacy`
- Under "Cookies and Site Data", check settings
- Try disabling "Enhanced Tracking Protection" for the site

### Safari
- Safari has strict cookie policies
- Check: Preferences → Privacy → Cookies and website data
- May need to allow cookies for the site

## Alternative: Use Authorization Header as Fallback

If cookies continue to fail, you can modify the frontend to:

1. Store token from login response in localStorage
2. Send token as `Authorization: Bearer <token>` header
3. Backend already supports this (checks both cookie and header)

But cookies should work with the current fix!

## Testing

### Test 1: Cookie Debug Endpoint
```bash
# From your frontend, visit:
https://admin-panel-backend-xd9a.onrender.com/api/admin/cookie-debug
```

### Test 2: Check Network Tab
1. Login
2. Open Network tab
3. Make a request to `/generations/filter-options`
4. Check Request Headers → Should see `Cookie: admin_token=...`

### Test 3: Check Application Tab
1. After login
2. DevTools → Application → Cookies
3. Should see `admin_token` cookie

## Summary

The fix ensures:
1. ✅ Cookie path is `/` (available for all paths)
2. ✅ Cookie domain is not set (browser handles it)
3. ✅ Cookie SameSite is `none` (allows cross-origin)
4. ✅ Cookie Secure is `true` (HTTPS only)
5. ✅ Debug endpoints added for troubleshooting

**If still not working:**
1. Check browser cookie settings
2. Check `/api/admin/cookie-debug` endpoint
3. Check backend logs for detailed error messages
4. Verify CORS_ORIGIN is set correctly

