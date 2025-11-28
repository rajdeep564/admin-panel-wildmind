# Environment Variables Setup Guide

This document outlines all environment variables needed for the WildMind Admin Panel.

## Backend Environment Variables

Create a `.env` file in `admin-panel/packages/admin-backend/`:

### Required Variables

```env
# Server Configuration
ADMIN_PORT=5001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001

# Admin Authentication (Optional - defaults provided)
ADMIN_EMAIL=admin@wildmindai.com
ADMIN_PASSWORD=Wildmind@2025
ADMIN_JWT_SECRET=your-secret-key-change-in-production

# Firebase Configuration (Choose ONE method)
# Method 1: JSON string (recommended for development)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}

# Method 2: Base64 encoded JSON (recommended for production)
# FIREBASE_SERVICE_ACCOUNT_B64=base64-encoded-json-string

# Method 3: File path (alternative)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Variable Descriptions

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_PORT` | No | `5001` | Port for the admin backend server |
| `NODE_ENV` | No | `development` | Environment mode (development/production) |
| `CORS_ORIGIN` | No | `http://localhost:3001` | Frontend URL for CORS |
| `ADMIN_EMAIL` | No | `admin@wildmindai.com` | Admin login email |
| `ADMIN_PASSWORD` | No | `Wildmind@2025` | Admin login password |
| `ADMIN_JWT_SECRET` | No | `admin-secret-key-change-in-production` | Secret for JWT token signing |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes* | - | Firebase service account JSON as string |
| `FIREBASE_SERVICE_ACCOUNT_B64` | Yes* | - | Firebase service account JSON as base64 |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes* | - | Path to Firebase service account file |

*At least one Firebase credential method is required.

## Frontend Environment Variables

Create a `.env` file in `admin-panel/packages/admin-frontend/`:

### Required Variables

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:5001/api/admin
```

### Variable Descriptions

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `http://localhost:5001/api/admin` | Backend API base URL |

**Note:** In Vite, all environment variables must be prefixed with `VITE_` to be accessible in the browser.

## Example .env Files

### Backend Example (`admin-panel/packages/admin-backend/.env`)

```env
# Server
ADMIN_PORT=5001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001

# Admin Auth
ADMIN_EMAIL=admin@wildmindai.com
ADMIN_PASSWORD=Wildmind@2025
ADMIN_JWT_SECRET=change-this-to-a-random-secret-in-production

# Firebase (Method 1: JSON string)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

### Frontend Example (`admin-panel/packages/admin-frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5001/api/admin
```

## Production Environment Variables

For production, update these values:

### Backend Production `.env`

```env
ADMIN_PORT=5001
NODE_ENV=production
CORS_ORIGIN=https://admin.wildmindai.com

# Use strong, random secrets in production
ADMIN_JWT_SECRET=generate-a-strong-random-secret-here
ADMIN_EMAIL=admin@wildmindai.com
ADMIN_PASSWORD=YourStrongPasswordHere

# Use base64 encoding for Firebase credentials in production (more secure)
FIREBASE_SERVICE_ACCOUNT_B64=base64-encoded-service-account-json
```

### Frontend Production `.env`

```env
VITE_API_BASE_URL=https://api.wildmindai.com/api/admin
```

## Getting Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Download the JSON file
6. Use one of these methods:
   - **Method 1:** Copy the entire JSON content and set as `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Method 2:** Base64 encode the JSON: `base64 -i service-account.json` (Mac/Linux) or use an online tool
   - **Method 3:** Place the file in a secure location and set `GOOGLE_APPLICATION_CREDENTIALS` to the file path

## Security Best Practices

1. **Never commit `.env` files to Git** - Add them to `.gitignore`
2. **Use strong JWT secrets** - Generate random strings (at least 32 characters)
3. **Use base64 encoding in production** - More secure than plain JSON strings
4. **Restrict CORS origins** - Only allow your frontend domain in production
5. **Use environment-specific files** - `.env.development`, `.env.production`
6. **Rotate secrets regularly** - Especially if compromised

## Quick Setup Commands

```bash
# Backend
cd admin-panel/packages/admin-backend
cp .env.example .env  # If .env.example exists
# Edit .env with your values

# Frontend
cd admin-panel/packages/admin-frontend
echo "VITE_API_BASE_URL=http://localhost:5001/api/admin" > .env
```

## Troubleshooting

### Backend won't start
- Check that `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_B64` is set correctly
- Verify the JSON is valid (no line breaks in the string)
- Ensure port 5001 is not in use

### Frontend can't connect to backend
- Verify `VITE_API_BASE_URL` matches your backend URL
- Check CORS settings in backend `.env` (`CORS_ORIGIN`)
- Ensure backend is running

### Firebase connection errors
- Verify service account has Firestore read/write permissions
- Check that the service account JSON is complete
- Ensure the project ID matches your Firebase project

