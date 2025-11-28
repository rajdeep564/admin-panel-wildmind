# WildMind AI Admin Panel

A comprehensive admin panel for managing WildMind AI platform, including user management, content moderation, analytics, third-party API management, and system configuration.

## Monorepo Structure

```
admin-panel/
├── packages/
│   ├── admin-frontend/     # React.js admin panel (TypeScript)
│   ├── admin-backend/      # Express.js/NestJS backend (TypeScript)
│   ├── shared/             # Shared types, utilities, constants
│   └── admin-api-client/   # API client library for frontend
├── package.json            # Root package.json with workspaces
└── README.md
```

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Install all dependencies
npm install

# Install dependencies for a specific package
npm install --workspace=admin-frontend
npm install --workspace=admin-backend
```

### Development

```bash
# Run both frontend and backend in development mode
npm run dev

# Run only frontend
npm run dev:frontend

# Run only backend
npm run dev:backend
```

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build:frontend
npm run build:backend
```

## Packages

### admin-frontend
React.js application for the admin panel UI.

**Tech Stack:**
- React 18+ with TypeScript
- Vite or Create React App
- Redux Toolkit or Zustand for state management
- React Router for routing
- Material-UI or Ant Design for UI components
- Recharts for data visualization

### admin-backend
Backend API server for admin operations.

**Tech Stack:**
- Express.js or NestJS with TypeScript
- MongoDB/Firestore for database
- Redis for caching
- JWT for authentication
- WebSockets for real-time updates

### shared
Shared TypeScript types, utilities, and constants used across packages.

### admin-api-client
Type-safe API client library for frontend to communicate with backend.

## Features

See [ADMIN_PANEL_FEATURES.md](../ADMIN_PANEL_FEATURES.md) for complete feature list.

### Key Features:
- User Management
- Content Moderation (ArtStation)
- Credits & Plans Management
- Third-Party API Management (Status, Credits, Configuration)
- Analytics & Reporting
- System Configuration
- Audit Logging
- API Gateway Monitoring

## Environment Variables

Create `.env` files in each package as needed:

### admin-backend/.env
```
NODE_ENV=development
PORT=5001
MONGODB_URI=...
REDIS_URL=...
JWT_SECRET=...
ADMIN_JWT_SECRET=...
API_BASE_URL=http://localhost:5000
```

### admin-frontend/.env
```
VITE_API_BASE_URL=http://localhost:5001
VITE_APP_NAME=WildMind Admin Panel
```

## Security

- Admin-only endpoints with role-based access control
- IP whitelisting for admin access
- 2FA support for admin accounts
- Comprehensive audit logging
- Secure session management

## License

Private - WildMind AI

