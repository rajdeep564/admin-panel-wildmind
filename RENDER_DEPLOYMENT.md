# Render Deployment Guide for WildMind Admin Panel

This guide covers deploying the admin panel backend to Render's free tier.

## 🚀 Quick Deploy Steps

### Option 1: Using Render Blueprint (Recommended)

1. **Push your code to GitHub** (if not already done)
   ```bash
   git push -u origin main
   ```

2. **Go to Render Dashboard**
   - Visit [render.com](https://render.com)
   - Sign up/Login with GitHub

3. **Create Blueprint**
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository: `rajdeep564/admin-panel-wildmind`
   - Render will detect `render.yaml` automatically
   - Click "Apply"

4. **Configure Environment Variables**
   - Go to your backend service settings
   - Add these environment variables:
     ```
     NODE_ENV=production
     ADMIN_PORT=10000
     CORS_ORIGIN=https://your-frontend-url.netlify.app
     ADMIN_JWT_SECRET=your-strong-secret-key-here
     ADMIN_EMAIL=admin@wildmindai.com
     ADMIN_PASSWORD=Wildmind@2025
     FIREBASE_SERVICE_ACCOUNT_B64=your-base64-encoded-service-account
     ```

5. **Deploy**
   - Render will automatically deploy
   - Wait for build to complete
   - Copy your backend URL (e.g., `https://admin-panel-backend.onrender.com`)

---

### Option 2: Manual Web Service Setup

1. **Go to Render Dashboard**
   - Visit [render.com](https://render.com)
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect GitHub account
   - Select repository: `rajdeep564/admin-panel-wildmind`
   - Click "Connect"

3. **Configure Service**
   - **Name**: `admin-panel-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `packages/admin-backend` ⚠️ **IMPORTANT**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Environment Variables**
   Add all variables from the list above

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment

---

## ⚙️ Configuration Details

### Root Directory
**CRITICAL**: Set Root Directory to: `packages/admin-backend`

This tells Render where your backend code is located in the repository.

### Build Command
```
npm install && npm run build
```

### Start Command
```
npm start
```

### Port Configuration
Render automatically assigns a port via `$PORT` environment variable. Your backend should use:
```typescript
const PORT = process.env.PORT || process.env.ADMIN_PORT || 10000;
```

---

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `ADMIN_PORT` | Port (Render uses $PORT) | `10000` |
| `CORS_ORIGIN` | Frontend URL | `https://your-site.netlify.app` |
| `ADMIN_JWT_SECRET` | JWT secret key | Generate with: `openssl rand -base64 32` |
| `ADMIN_EMAIL` | Admin login email | `admin@wildmindai.com` |
| `ADMIN_PASSWORD` | Admin password | `Wildmind@2025` |
| `FIREBASE_SERVICE_ACCOUNT_B64` | Base64 Firebase credentials | See [FIREBASE_ENV_EXPLANATION.md](./FIREBASE_ENV_EXPLANATION.md) |

### Optional Variables

- `ADMIN_PORT`: Only needed if your code doesn't use `$PORT`

---

## 🔄 Updating Backend Code

Render automatically deploys when you push to the `main` branch. To manually trigger:

1. Go to Render Dashboard
2. Select your service
3. Click "Manual Deploy" → "Deploy latest commit"

---

## 🌐 Connecting Frontend to Backend

After backend is deployed:

1. **Get Backend URL**
   - From Render Dashboard: `https://admin-panel-backend.onrender.com`
   - Add `/api/admin` for API base: `https://admin-panel-backend.onrender.com/api/admin`

2. **Update Frontend Environment**
   - In Netlify (or your frontend host):
   - Add environment variable: `VITE_API_BASE_URL=https://admin-panel-backend.onrender.com/api/admin`
   - Redeploy frontend

---

## 🐛 Troubleshooting

### Error: "Service Root Directory is missing"

**Solution**: 
- Go to Render Dashboard → Your Service → Settings
- Set **Root Directory** to: `packages/admin-backend`
- Save and redeploy

### Error: "Build failed"

**Check**:
- Root Directory is correct: `packages/admin-backend`
- Build command: `npm install && npm run build`
- All dependencies are in `package.json`
- Node version matches (check `.nvmrc` or `package.json` engines)

### Error: "Port already in use"

**Solution**:
- Render uses `$PORT` environment variable
- Update your backend to use: `process.env.PORT || 10000`
- Don't hardcode port numbers

### Error: "CORS errors"

**Solution**:
- Set `CORS_ORIGIN` to your frontend URL (exact match)
- Include protocol: `https://your-site.netlify.app`
- No trailing slash

### Error: "Firebase authentication failed"

**Solution**:
- Verify `FIREBASE_SERVICE_ACCOUNT_B64` is correctly set
- Use Base64 encoded JSON (see [FIREBASE_ENV_EXPLANATION.md](./FIREBASE_ENV_EXPLANATION.md))
- Check Firebase project permissions

---

## 📊 Render Free Tier Limits

- **Build time**: 90 minutes/month
- **Bandwidth**: 100GB/month
- **Sleep**: Services sleep after 15 minutes of inactivity
- **Cold starts**: First request after sleep takes ~30-60 seconds

**Note**: Free tier services sleep after inactivity. Consider upgrading to Starter ($7/mo) for always-on service.

---

## 🔐 Security Best Practices

1. **Change default credentials** in production
2. **Use strong JWT secret**: Generate with `openssl rand -base64 32`
3. **Never commit** `.env` files
4. **Use Base64** for Firebase credentials
5. **Enable HTTPS** (automatic on Render)

---

## 📝 Post-Deployment Checklist

- [ ] Backend service is running
- [ ] Environment variables are set
- [ ] Frontend can connect to backend
- [ ] Login works
- [ ] API endpoints respond
- [ ] Firebase connection works
- [ ] ArtStation scoring page loads
- [ ] ArtStation management page works

---

## 🔗 Useful Links

- [Render Documentation](https://render.com/docs)
- [Render Dashboard](https://dashboard.render.com)
- [Node.js on Render](https://render.com/docs/node)

---

## 💡 Pro Tips

1. **Use Blueprint** for easier setup
2. **Monitor logs** in Render Dashboard
3. **Set up alerts** for deployment failures
4. **Use environment groups** for multiple services
5. **Enable auto-deploy** from main branch

---

**Need Help?** Check Render's [Support Documentation](https://render.com/docs/support) or [Community Forum](https://community.render.com)

