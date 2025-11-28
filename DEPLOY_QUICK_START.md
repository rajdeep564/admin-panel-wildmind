# 🚀 Quick Deploy Guide - Netlify Free Plan

## ⚡ Fastest Way: Hybrid Deployment (Recommended)

Deploy frontend to Netlify, backend to Railway (both free).

---

## 📋 Step-by-Step

### 1️⃣ Deploy Frontend to Netlify (5 minutes)

1. **Push code to GitHub** (if not already)
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Go to Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect GitHub and select your repository

3. **Configure Build Settings**
   ```
   Base directory: admin-panel
   Build command: npm install && npm run build:frontend
   Publish directory: packages/admin-frontend/dist
   ```

4. **Add Environment Variable**
   - Go to Site Settings → Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://your-backend.railway.app/api/admin`
   - (We'll get this URL in step 2)

5. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete
   - Copy your site URL (e.g., `https://your-site.netlify.app`)

---

### 2️⃣ Deploy Backend to Railway (5 minutes)

1. **Sign up at Railway**
   - Visit [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Click "Add Service" → "GitHub Repo"
   - Select your repo
   - In service settings:
     ```
     Root Directory: admin-panel/packages/admin-backend
     Build Command: npm install && npm run build
     Start Command: npm start
     ```

4. **Add Environment Variables**
   - Go to Variables tab
   - Add all variables from `admin-panel/packages/admin-backend/.env`:
     ```
     NODE_ENV=production
     ADMIN_PORT=5001
     CORS_ORIGIN=https://your-site.netlify.app
     ADMIN_JWT_SECRET=your-secret-key
     ADMIN_EMAIL=admin@wildmindai.com
     ADMIN_PASSWORD=Wildmind@2025
     FIREBASE_SERVICE_ACCOUNT_B64=your-base64-encoded-json
     ```

5. **Get Backend URL**
   - Railway provides a URL like `https://your-app.railway.app`
   - Copy this URL

6. **Update Frontend API URL**
   - Go back to Netlify
   - Update `VITE_API_BASE_URL` to: `https://your-app.railway.app/api/admin`
   - Redeploy frontend

---

### 3️⃣ Test Everything

1. Visit your Netlify site
2. Login with: `admin@wildmindai.com` / `Wildmind@2025`
3. Test ArtStation scoring page
4. Verify filters work

---

## 🎯 Alternative: Full Netlify (Everything on Netlify)

If you want everything on Netlify:

1. **Install dependencies**:
   ```bash
   cd admin-panel
   npm install --save-dev serverless-http @netlify/functions
   ```

2. **Follow Netlify Dashboard steps** (same as above)

3. **Set environment variables** in Netlify:
   - All backend variables
   - `VITE_API_BASE_URL=https://your-site.netlify.app/api/admin`

4. **Deploy** - Netlify will handle both frontend and functions

⚠️ **Note**: Netlify Functions have 10-second timeout on free plan. If your queries take longer, use Railway for backend.

---

## 🔧 Troubleshooting

### Build fails?
- Check Node version (should be 18+)
- Verify all dependencies are in `package.json`
- Check build logs in Netlify dashboard

### API not working?
- Verify `CORS_ORIGIN` matches your frontend URL
- Check backend logs in Railway dashboard
- Ensure environment variables are set correctly

### Firebase errors?
- Use Base64 encoded service account (`FIREBASE_SERVICE_ACCOUNT_B64`)
- Verify Firebase project permissions
- Check service account JSON is valid

---

## ✅ Done!

Your admin panel is now live on:
- **Frontend**: `https://your-site.netlify.app`
- **Backend**: `https://your-app.railway.app`

Both are on free tiers! 🎉

---

## 📚 Need More Details?

See [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md) for comprehensive guide.

