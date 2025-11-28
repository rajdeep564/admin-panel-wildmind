# Quick Start Guide

## Setup Steps

1. **Install dependencies:**
```bash
cd admin-panel
npm install
```

2. **Configure backend environment:**
```bash
cd packages/admin-backend
cp .env.example .env
# Edit .env and add your Firebase service account credentials
```

3. **Configure frontend environment:**
```bash
cd ../admin-frontend
cp .env.example .env
# VITE_API_BASE_URL should be http://localhost:5001/api/admin
```

4. **Start the development servers:**
```bash
# From admin-panel root directory
npm run dev
```

This will start:
- Backend on http://localhost:5001
- Frontend on http://localhost:3001

5. **Login:**
- Navigate to http://localhost:3001
- Email: `admin@wildmindai.com`
- Password: `Wildmind@2025`

6. **Use ArtStation Scoring:**
- Click on "ArtStation Scoring" card
- View generations and assign scores (9.0, 9.5, or 10.0)
- Scores are saved immediately and update the public feed

## Troubleshooting

- **Backend errors:** Check Firebase credentials in `.env`
- **Frontend can't connect:** Verify backend is running on port 5001
- **No generations shown:** Check Firestore has `generations` collection with public items

