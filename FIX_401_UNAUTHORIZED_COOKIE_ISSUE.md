# Fix: 401 Unauthorized - Cookie Not Being Sent in Production

## Problem
After fixing the 404 issue and setting `VITE_API_BASE_URL` correctly, you're now getting:
```
401 Unauthorized - No token provided
```
on requests like:
```
GET https://admin-panel-backend-xd9a.onrender.com/api/admin/generations/filter-options
```

This happens **only in production**, not locally.

## Root Cause

The issue is with **cookie `sameSite` settings**. When your frontend and backend are on different domains (e.g., frontend on Netlify, backend on Render), the browser's cookie security prevents cookies from being sent.

### The Problem:
1. **Cookie `sameSite: 'strict'`** - This is too restrictive for cross-origin requests
2. When frontend (e.g., `https://your-site.netlify.app`) makes requests to backend (e.g., `https://admin-panel-backend-xd9a.onrender.com`), the browser sees this as cross-origin
3. With `sameSite: 'strict'`, the browser **refuses to send the cookie** in cross-origin requests
4. Backend receives no cookie → 401 Unauthorized

## Solution Applied

### 1. Updated Cookie Settings (✅ Fixed in Code)

Changed from:
```typescript
sameSite: 'strict'  // ❌ Blocks cross-origin cookies
```

To:
```typescript
sameSite: env.nodeEnv === 'production' ? 'none' : 'lax'
// ✅ 'none' allows cross-origin cookies (requires secure: true)
// ✅ 'lax' works for same-origin in development
```

**Important**: `sameSite: 'none'` **requires** `secure: true`, which is already set in production.

### 2. Updated Helmet Configuration (✅ Fixed in Code)

Helmet's default settings can interfere with cookies. Updated to:
```typescript
helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
})
```

### 3. Enhanced CORS Configuration (✅ Fixed in Code)

Added explicit methods and headers:
```typescript
cors({
  origin: env.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
```

## Required Backend Environment Variables

Make sure these are set correctly in your Render backend:

### Critical: `CORS_ORIGIN`
This **must** match your frontend URL exactly (no trailing slash):

```env
CORS_ORIGIN=https://your-frontend-site.netlify.app
```

**Common mistakes:**
- ❌ `CORS_ORIGIN=https://your-frontend-site.netlify.app/` (trailing slash)
- ❌ `CORS_ORIGIN=https://your-frontend-site.netlify.app,https://another-site.com` (multiple origins - not supported)
- ❌ `CORS_ORIGIN=*` (wildcard doesn't work with credentials: true)
- ✅ `CORS_ORIGIN=https://your-frontend-site.netlify.app` (correct)

### Other Required Variables:
```env
NODE_ENV=production
ADMIN_JWT_SECRET=your-strong-secret-key
ADMIN_EMAIL=admin@wildmindai.com
ADMIN_PASSWORD=Wildmind@2025
FIREBASE_SERVICE_ACCOUNT_B64=your-base64-encoded-credentials
```

## Deployment Steps

1. **Deploy the Updated Backend Code**
   ```bash
   git add .
   git commit -m "Fix: Update cookie sameSite for cross-origin support"
   git push
   ```
   Render will auto-deploy

2. **Verify Backend Environment Variables**
   - Go to Render Dashboard → Your Backend Service → Environment
   - Verify `CORS_ORIGIN` matches your frontend URL exactly
   - No trailing slash!

3. **Test the Fix**
   - Clear browser cookies for your site
   - Login again
   - Check Network tab - cookies should be sent with requests
   - Should no longer get 401 errors

## Verification Checklist

After deploying:

- [ ] Backend code is deployed with new cookie settings
- [ ] `CORS_ORIGIN` is set to exact frontend URL (no trailing slash)
- [ ] `NODE_ENV=production` is set
- [ ] Clear browser cookies and cache
- [ ] Login works
- [ ] Check Network tab - see `admin_token` cookie being sent
- [ ] API requests (like `/generations/filter-options`) work without 401

## Debugging Steps

If still getting 401:

### 1. Check Cookie in Browser DevTools
- Open DevTools → Application → Cookies
- Look for `admin_token` cookie
- Check:
  - ✅ Domain: Should match backend domain
  - ✅ Secure: Should be checked (HTTPS only)
  - ✅ SameSite: Should be "None"
  - ✅ HttpOnly: Should be checked

### 2. Check Network Request Headers
- Open DevTools → Network tab
- Click on a failed request
- Check **Request Headers**:
  - Should see `Cookie: admin_token=...`
  - If missing, cookie isn't being sent

### 3. Check CORS Headers in Response
- Open DevTools → Network tab
- Click on a failed request
- Check **Response Headers**:
  - Should see `Access-Control-Allow-Origin: https://your-frontend-site.netlify.app`
  - Should see `Access-Control-Allow-Credentials: true`
  - If missing/wrong, CORS_ORIGIN is incorrect

### 4. Check Backend Logs
- Go to Render Dashboard → Your Backend Service → Logs
- Look for CORS errors or cookie-related errors

### 5. Test CORS_ORIGIN
If `CORS_ORIGIN` is wrong, you'll see errors like:
```
Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy
```

## Common Issues

### Issue: Cookie still not being sent
**Solution:**
- Verify `CORS_ORIGIN` matches frontend URL exactly
- Clear all cookies and try again
- Check browser console for CORS errors
- Verify backend is using HTTPS (required for `secure: true`)

### Issue: "SameSite=None requires Secure"
**Solution:**
- Backend must be on HTTPS (Render provides this automatically)
- Verify `secure: true` is set in production (it is in the code)

### Issue: Cookie sent but still 401
**Solution:**
- Check `ADMIN_JWT_SECRET` is set correctly
- Verify token is valid (check in jwt.io)
- Check backend logs for JWT verification errors

## Technical Details

### Cookie SameSite Values:
- **`strict`**: Cookie only sent in same-site requests (same domain)
- **`lax`**: Cookie sent in same-site and top-level navigation
- **`none`**: Cookie sent in all requests (requires `secure: true`)

### Why `none` for Production?
When frontend and backend are on different domains:
- Frontend: `https://your-site.netlify.app`
- Backend: `https://admin-panel-backend-xd9a.onrender.com`

These are **different origins**, so `strict` or `lax` won't send cookies. `none` is required.

### Security Note
`sameSite: 'none'` with `secure: true` is secure because:
- Cookie can only be sent over HTTPS
- `httpOnly: true` prevents JavaScript access
- Backend validates the JWT token

## Summary

The fix changes:
1. ✅ Cookie `sameSite` from `'strict'` to `'none'` in production
2. ✅ Helmet configuration to allow cookies
3. ✅ CORS configuration enhanced

**After deploying, make sure `CORS_ORIGIN` matches your frontend URL exactly!**

