// Netlify Serverless Function - Main API Handler
// This wraps the Express app for Netlify Functions

import { Handler, Context } from '@netlify/functions';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import routes from '../../packages/admin-backend/src/routes';

// Load environment variables
dotenv.config();

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/admin', routes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Convert Express app to Netlify Function handler
const serverlessHandler = serverless(app);

// Export Netlify Function handler
export const handler: Handler = async (event, context: Context) => {
  // Set timeout to prevent function from running too long
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const result = await serverlessHandler(event, context);
    return result;
  } catch (error: any) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

