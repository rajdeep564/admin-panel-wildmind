# Fix: 404 Error on /auth/login in Production

## Problem
Getting `404 Not Found` when trying to POST to:
```
https://admin-panel-backend-xd9a.onrender.com/auth/login
```

## Root Cause
The frontend environment variable `VITE_API_BASE_URL` is either:
1. **Not set** in production deployment
2. **Set incorrectly** - missing `/api/admin` suffix
3. **Set to wrong value** - pointing to base URL instead of full API path

## Solution

### For Netlify Deployment

1. **Go to Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Select your admin panel site

2. **Navigate to Environment Variables**
   - Go to: **Site Settings** → **Environment Variables**

3. **Add/Update the Variable**
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://admin-panel-backend-xd9a.onrender.com/api/admin`
   - ⚠️ **IMPORTANT**: Must include `/api/admin` at the end!

4. **Redeploy**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**
   - Or push a new commit to trigger auto-deploy

### For Other Hosting Platforms

Set the environment variable `VITE_API_BASE_URL` to:
```
https://admin-panel-backend-xd9a.onrender.com/api/admin
```

**Platform-specific instructions:**

#### Vercel
- Dashboard → Project → Settings → Environment Variables
- Add `VITE_API_BASE_URL` with value above
- Redeploy

#### Railway
- Project → Variables tab
- Add `VITE_API_BASE_URL` with value above
- Redeploy

#### Render
- Dashboard → Your Frontend Service → Environment
- Add `VITE_API_BASE_URL` with value above
- Redeploy

## Verification

After setting the environment variable and redeploying:

1. **Check the built code** (in browser DevTools):
   - Open your deployed site
   - Open DevTools → Network tab
   - Try to login
   - Check the request URL - it should be:
     ```
     https://admin-panel-backend-xd9a.onrender.com/api/admin/auth/login
     ```
   - NOT:
     ```
     https://admin-panel-backend-xd9a.onrender.com/auth/login
     ```

2. **Check Environment Variable in Build Logs**
   - Look for `VITE_API_BASE_URL` in build logs
   - Should show: `https://admin-panel-backend-xd9a.onrender.com/api/admin`

## Why This Happens

The frontend code in `AuthContext.tsx` uses:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/admin';
```

Then makes requests like:
```typescript
axios.post(`${API_BASE_URL}/auth/login`, ...)
```

So if `VITE_API_BASE_URL` is:
- ✅ Correct: `https://admin-panel-backend-xd9a.onrender.com/api/admin`
  - Result: `https://admin-panel-backend-xd9a.onrender.com/api/admin/auth/login` ✅
  
- ❌ Wrong: `https://admin-panel-backend-xd9a.onrender.com`
  - Result: `https://admin-panel-backend-xd9a.onrender.com/auth/login` ❌ (404)

- ❌ Missing: (not set)
  - Result: Uses default `http://localhost:5001/api/admin/auth/login` ❌ (won't work in production)

## Quick Fix Checklist

- [ ] Go to your frontend hosting platform (Netlify/Vercel/etc.)
- [ ] Find Environment Variables section
- [ ] Set `VITE_API_BASE_URL` = `https://admin-panel-backend-xd9a.onrender.com/api/admin`
- [ ] Make sure it includes `/api/admin` at the end
- [ ] Save and redeploy
- [ ] Test login - should work now!

## Still Not Working?

1. **Clear browser cache** and hard refresh (Ctrl+Shift+R)
2. **Check browser console** for errors
3. **Verify backend is running** - visit `https://admin-panel-backend-xd9a.onrender.com/health`
4. **Check CORS settings** - backend `CORS_ORIGIN` should match your frontend URL
5. **Check build logs** - verify `VITE_API_BASE_URL` is being used in build

