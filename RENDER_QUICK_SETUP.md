# 🚀 Render Quick Setup Guide

## Step-by-Step Deployment

### 1. Go to Render Dashboard
Visit [dashboard.render.com](https://dashboard.render.com) and sign in with GitHub.

### 2. Create New Web Service
- Click **"New +"** → **"Web Service"**
- Connect your GitHub account if not already connected
- Select repository: **`rajdeep564/admin-panel-wildmind`**

### 3. Configure Service Settings

**Basic Settings:**
- **Name**: `admin-panel-backend`
- **Environment**: `Node`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Plan**: Free

**⚠️ CRITICAL SETTINGS:**
- **Root Directory**: `packages/admin-backend` ← **This is the key fix!**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 4. Add Environment Variables

Go to **"Environment"** tab and add:

```
NODE_ENV=production
ADMIN_PORT=10000
CORS_ORIGIN=https://your-frontend-url.netlify.app
ADMIN_JWT_SECRET=your-strong-secret-key-here
ADMIN_EMAIL=admin@wildmindai.com
ADMIN_PASSWORD=Wildmind@2025
FIREBASE_SERVICE_ACCOUNT_B64=your-base64-encoded-service-account
```

**How to generate JWT Secret:**
```bash
openssl rand -base64 32
```

**How to get Firebase Base64:**
See [FIREBASE_ENV_EXPLANATION.md](./FIREBASE_ENV_EXPLANATION.md)

### 5. Deploy

- Click **"Create Web Service"**
- Wait for build to complete (2-5 minutes)
- Copy your service URL (e.g., `https://admin-panel-backend.onrender.com`)

### 6. Update Frontend

After backend is deployed:

1. **Get Backend URL**: `https://admin-panel-backend.onrender.com/api/admin`
2. **Update Netlify Environment Variable**:
   - Variable: `VITE_API_BASE_URL`
   - Value: `https://admin-panel-backend.onrender.com/api/admin`
3. **Redeploy Frontend**

---

## ✅ Verification

1. **Check Health Endpoint**: `https://your-backend.onrender.com/health`
2. **Test Login**: Use admin credentials
3. **Verify API**: Check ArtStation scoring page

---

## 🐛 Common Issues

### "Root Directory is missing"
**Fix**: Set Root Directory to: `packages/admin-backend`

### "Build failed"
**Check**:
- Root Directory is correct
- Build command: `npm install && npm run build`
- Node version (should be 18+)

### "Port error"
**Fix**: Backend now uses `$PORT` automatically (Render sets this)

---

## 📚 More Details

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for comprehensive guide.

