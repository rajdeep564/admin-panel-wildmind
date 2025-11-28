# 🚀 Render Setup Instructions

## Option 1: Using Render Blueprint (Automatic - Recommended)

Render Blueprint automatically detects `render.yaml` and creates services.

### Steps:

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Sign in with GitHub

2. **Create Blueprint**
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repository: `rajdeep564/admin-panel-wildmind`
   - Render will automatically detect `render.yaml` in the root
   - Click **"Apply"**

3. **Configure Environment Variables**
   - After Blueprint creates the service, go to **Settings** → **Environment**
   - Add these variables (the ones marked `sync: false` in render.yaml):
     ```
     CORS_ORIGIN=https://your-frontend-url.netlify.app
     ADMIN_JWT_SECRET=your-strong-secret-key
     ADMIN_PASSWORD=Wildmind@2025
     FIREBASE_SERVICE_ACCOUNT_B64=your-base64-encoded-json
     ```

4. **Deploy**
   - Render will automatically deploy
   - Wait for build to complete

---

## Option 2: Manual Web Service Setup

If Blueprint doesn't work, set up manually:

### Steps:

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click **"New +"** → **"Web Service"**

2. **Connect Repository**
   - Connect GitHub account
   - Select: `rajdeep564/admin-panel-wildmind`
   - Branch: `main`

3. **Configure Service** (IMPORTANT SETTINGS)

   **Basic:**
   - **Name**: `admin-panel-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest
   - **Branch**: `main`
   - **Plan**: Free

   **⚠️ CRITICAL SETTINGS:**
   - **Root Directory**: `packages/admin-backend` ← **MUST SET THIS!**
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `npm start`

4. **Environment Variables**
   Add all variables from the list in `RENDER_QUICK_SETUP.md`

5. **Deploy**
   - Click **"Create Web Service"**

---

## ✅ Verify render.yaml is in Repository

Make sure `render.yaml` is in the **root** of your repository:

```bash
# Check if file exists
ls render.yaml

# Check if it's committed
git ls-files render.yaml

# If not committed, add and push:
git add render.yaml
git commit -m "Add render.yaml"
git push origin main
```

---

## 🔍 Troubleshooting

### "Render not detecting render.yaml"

**Solutions:**
1. **Check file location**: Must be in repository root (not in subdirectory)
2. **Check file name**: Must be exactly `render.yaml` (not `render.yml` or `render.yaml.txt`)
3. **Check if committed**: File must be committed and pushed to GitHub
4. **Use Blueprint**: Go to "New +" → "Blueprint" (not "Web Service")
5. **Refresh Render**: Sometimes Render needs a refresh to detect new files

### "Blueprint not showing services"

**Solutions:**
1. Make sure `render.yaml` is in the root directory
2. Check YAML syntax is valid (no tabs, proper indentation)
3. Try manual setup instead (Option 2)

### "Build fails with TypeScript errors"

**Solution**: The build command now includes `--include=dev` to install TypeScript types:
```
npm install --include=dev && npm run build
```

---

## 📝 Current render.yaml Location

The `render.yaml` file should be at:
```
admin-panel/
  render.yaml  ← Must be here (root of repo)
  packages/
    admin-backend/
      ...
```

---

## 🎯 Quick Checklist

- [ ] `render.yaml` exists in repository root
- [ ] `render.yaml` is committed to git
- [ ] `render.yaml` is pushed to GitHub
- [ ] Using "Blueprint" option in Render (not "Web Service")
- [ ] Repository is connected in Render
- [ ] Environment variables are set

---

**Need Help?** Check [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed guide.

