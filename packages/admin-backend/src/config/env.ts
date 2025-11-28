import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.ADMIN_PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.ADMIN_JWT_SECRET || 'admin-secret-key-change-in-production',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@wildmindai.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Wildmind@2025',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
};

