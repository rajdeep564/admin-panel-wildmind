import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { env } from './config/env';
import routes from './routes';

dotenv.config();

const app = express();

// Middleware
// Configure helmet to allow cookies in cross-origin requests
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// Enhanced CORS configuration with dynamic origin support
const allowedOrigins = env.corsOrigin.split(',').map(origin => origin.trim());
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11) choke on 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/admin', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CORS debug endpoint
app.get('/api/admin/cors-debug', (req, res) => {
  res.json({
    origin: req.headers.origin,
    allowedOrigins: allowedOrigins,
    corsConfigured: true,
    credentials: true,
  });
});

// Cookie debug endpoint
app.get('/api/admin/cookie-debug', (req, res) => {
  res.json({
    cookies: req.cookies,
    hasAdminToken: !!req.cookies?.admin_token,
    cookieHeader: req.headers.cookie,
    origin: req.headers.origin,
    path: req.path,
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = env.port;

app.listen(PORT, () => {
  console.log(`Admin Panel Backend running on port ${PORT}`);
  console.log(`Environment: ${env.nodeEnv}`);
  console.log(`CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
});

