# Netlify Deployment Guide for WildMind Admin Panel

This guide covers deploying the admin panel to Netlify's free plan.

## 🎯 Deployment Strategy

We have **two deployment options**:

### Option 1: Full Netlify Deployment (Frontend + Backend as Functions)
- ✅ Everything on one platform
- ✅ Simple deployment
- ⚠️ 10-second timeout limit on free plan
- ⚠️ Cold starts for serverless functions

### Option 2: Hybrid Deployment (Recommended)
- ✅ Frontend on Netlify (static site)
- ✅ Backend on Railway/Render (free tier)
- ✅ No timeout limits
- ✅ Better performance

---

## 🚀 Option 1: Full Netlify Deployment

### Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Prepare your `.env` variables

### Step 1: Install Netlify CLI (Optional)

```bash
npm install -g netlify-cli
```

### Step 2: Install Serverless HTTP Package

```bash
cd admin-panel
npm install --save-dev serverless-http @netlify/functions
```

### Step 3: Update Backend Package

Add to `packages/admin-backend/package.json`:

```json
{
  "dependencies": {
    "serverless-http": "^3.0.2",
    "@netlify/functions": "^2.0.0"
  }
}
```

### Step 4: Set Environment Variables in Netlify

1. Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Add these variables:

```env
# Backend Configuration
NODE_ENV=production
ADMIN_PORT=5001
CORS_ORIGIN=https://your-site.netlify.app
ADMIN_JWT_SECRET=your-secret-key-change-in-production
ADMIN_EMAIL=admin@wildmindai.com
ADMIN_PASSWORD=Wildmind@2025

# Firebase Service Account (Base64 encoded - RECOMMENDED)
FIREBASE_SERVICE_ACCOUNT_B64=your-base64-encoded-service-account-json

# OR Firebase Service Account (JSON string - Alternative)
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

### Step 5: Deploy via Netlify Dashboard

1. **Connect Repository**:
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Select the repository and branch

2. **Configure Build Settings**:
   - **Base directory**: `admin-panel` (or leave empty if repo root)
   - **Build command**: `npm run build:frontend`
   - **Publish directory**: `packages/admin-frontend/dist`

3. **Deploy**:
   - Click "Deploy site"
   - Wait for build to complete

### Step 6: Update Frontend API URL

After deployment, update `packages/admin-frontend/.env.production`:

```env
VITE_API_BASE_URL=https://your-site.netlify.app/api/admin
```

Or set it in Netlify Environment Variables and update your Vite config to use it.

### Step 7: Test Deployment

1. Visit your Netlify site URL
2. Test login: `admin@wildmindai.com` / `Wildmind@2025`
3. Verify API endpoints work

---

## 🎯 Option 2: Hybrid Deployment (Recommended)

This approach deploys the frontend to Netlify and backend to a free hosting service.

### Frontend on Netlify

Follow **Option 1 Steps 1-5**, but:
- Only deploy the frontend
- Build command: `npm run build:frontend`
- Publish directory: `packages/admin-frontend/dist`

### Backend on Railway (Free Tier)

1. **Sign up**: [railway.app](https://railway.app)
2. **Create New Project**: "New Project" → "Deploy from GitHub"
3. **Select Repository**: Choose your repo
4. **Configure**:
   - **Root Directory**: `admin-panel/packages/admin-backend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. **Environment Variables**: Add all backend env vars
6. **Get URL**: Railway provides a URL like `https://your-app.railway.app`

### Backend on Render (Alternative)

1. **Sign up**: [render.com](https://render.com)
2. **New Web Service**: Connect GitHub repo
3. **Configure**:
   - **Root Directory**: `admin-panel/packages/admin-backend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. **Environment Variables**: Add all backend env vars
5. **Get URL**: Render provides a URL like `https://your-app.onrender.com`

### Update Frontend API URL

Update `packages/admin-frontend/.env.production`:

```env
VITE_API_BASE_URL=https://your-backend.railway.app/api/admin
# OR
VITE_API_BASE_URL=https://your-backend.onrender.com/api/admin
```

---

## 🔧 Troubleshooting

### Issue: Functions timeout

**Solution**: 
- Use Option 2 (Hybrid deployment)
- Or optimize your queries to complete faster
- Consider upgrading to Netlify Pro ($19/mo) for 26s timeout

### Issue: CORS errors

**Solution**:
- Ensure `CORS_ORIGIN` in backend matches your Netlify frontend URL
- Check `netlify.toml` headers configuration

### Issue: Environment variables not loading

**Solution**:
- Verify variables are set in Netlify Dashboard
- Restart the site after adding variables
- Check variable names match exactly (case-sensitive)

### Issue: Firebase Admin SDK errors

**Solution**:
- Use Base64 encoded service account (`FIREBASE_SERVICE_ACCOUNT_B64`)
- Verify the JSON is correctly encoded
- Check Firebase project permissions

---

## 📝 Netlify Free Plan Limits

- **Build minutes**: 300/month
- **Bandwidth**: 100GB/month
- **Function invocations**: 125,000/month
- **Function execution time**: 10 seconds max
- **Concurrent builds**: 1

---

## 🚀 Quick Deploy Button

You can also use Netlify's deploy button:

```markdown
[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR_BADGE_ID/deploy-status)](https://app.netlify.com/sites/YOUR_SITE/deploys)
```

---

## 📚 Additional Resources

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Railway Documentation](https://docs.railway.app/)
- [Render Documentation](https://render.com/docs)

---

## ✅ Post-Deployment Checklist

- [ ] Frontend loads correctly
- [ ] Login works
- [ ] API endpoints respond
- [ ] Environment variables are set
- [ ] CORS is configured correctly
- [ ] Firebase connection works
- [ ] ArtStation scoring page loads
- [ ] Filters work correctly
- [ ] Score updates work

---

## 🔐 Security Notes

1. **Change default credentials** in production
2. **Use strong JWT secret** (generate with `openssl rand -base64 32`)
3. **Never commit** `.env` files
4. **Use Base64** for Firebase credentials in production
5. **Enable HTTPS** (automatic on Netlify)

---

## 💡 Pro Tips

1. **Use Netlify CLI** for local testing: `netlify dev`
2. **Monitor function logs** in Netlify Dashboard
3. **Set up deployment notifications** (email/Slack)
4. **Use branch deploys** for testing before production
5. **Enable form handling** if you add contact forms later

---

**Need Help?** Check the [Netlify Community](https://answers.netlify.com/) or [GitHub Issues](https://github.com/netlify/cli/issues)

