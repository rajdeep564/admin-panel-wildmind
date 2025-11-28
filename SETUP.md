# Admin Panel Setup Guide

## Overview

The WildMind Admin Panel allows administrators to manage content, specifically for scoring generations for the ArtStation feed. Currently, it supports:

- Admin authentication with hardcoded credentials
- ArtStation scoring dashboard (score generations 9-10)
- Score updates that sync to the public feed

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Firebase project with Firestore enabled
- Firebase service account credentials

## Installation

1. **Install dependencies for all packages:**

```bash
cd admin-panel
npm install
```

2. **Set up environment variables:**

### Backend (.env)

Create `admin-panel/packages/admin-backend/.env`:

```env
ADMIN_PORT=5001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001
ADMIN_EMAIL=admin@wildmindai.com
ADMIN_PASSWORD=Wildmind@2025
ADMIN_JWT_SECRET=your-secret-key-change-in-production

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# OR
FIREBASE_SERVICE_ACCOUNT_B64=base64-encoded-json
```

### Frontend (.env)

Create `admin-panel/packages/admin-frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api/admin
```

## Running the Application

### Development Mode

**Option 1: Run both frontend and backend together**

```bash
npm run dev
```

**Option 2: Run separately**

Terminal 1 (Backend):
```bash
npm run dev:backend
```

Terminal 2 (Frontend):
```bash
npm run dev:frontend
```

### Production Build

```bash
npm run build
npm run start  # Backend only - frontend needs a static server
```

## Accessing the Admin Panel

1. **Start the servers** (backend on port 5001, frontend on port 3001)
2. **Navigate to** `http://localhost:3001`
3. **Login with:**
   - Email: `admin@wildmindai.com`
   - Password: `Wildmind@2025`

## Features

### ArtStation Scoring Dashboard

- View all public generations
- Assign aesthetic scores between 9.0 and 10.0
- Scores automatically update in the public feed
- Only generations with scores 9-10 appear in ArtStation

### API Endpoints

- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/logout` - Admin logout
- `GET /api/admin/auth/verify` - Verify admin token
- `GET /api/admin/generations` - Fetch generations for scoring
- `GET /api/admin/generations/:id` - Get specific generation
- `PUT /api/admin/generations/:id/score` - Update aesthetic score (9-10 only)

## Architecture

```
admin-panel/
├── packages/
│   ├── admin-backend/      # Express.js API server
│   │   ├── src/
│   │   │   ├── config/     # Firebase, environment config
│   │   │   ├── controllers/ # Request handlers
│   │   │   ├── middleware/  # Auth middleware
│   │   │   └── routes/      # API routes
│   │   └── package.json
│   ├── admin-frontend/     # React.js frontend
│   │   ├── src/
│   │   │   ├── contexts/    # Auth context
│   │   │   ├── pages/       # React pages
│   │   │   └── App.tsx
│   │   └── package.json
│   └── shared/             # Shared types (future use)
└── package.json
```

## Security Notes

⚠️ **Important:** The current implementation uses hardcoded admin credentials. For production:

1. Implement proper user management in Firestore
2. Use password hashing (bcrypt)
3. Add 2FA support
4. Implement IP whitelisting
5. Use secure JWT secrets
6. Enable HTTPS
7. Add rate limiting

## Troubleshooting

### Backend won't start
- Check Firebase credentials are set correctly
- Ensure port 5001 is not in use
- Check `.env` file exists and has correct values

### Frontend can't connect to backend
- Verify backend is running on port 5001
- Check `VITE_API_BASE_URL` in frontend `.env`
- Check CORS settings in backend

### Authentication fails
- Verify credentials match: `admin@wildmindai.com` / `Wildmind@2025`
- Check JWT secret is set
- Clear browser cookies and try again

### Generations not loading
- Verify Firestore has `generations` collection
- Check Firebase service account has read/write permissions
- Check browser console for errors

## Next Steps

Future enhancements planned:
- User management dashboard
- Content moderation tools
- Analytics and reporting
- Third-party API management
- System configuration
- Audit logging UI

