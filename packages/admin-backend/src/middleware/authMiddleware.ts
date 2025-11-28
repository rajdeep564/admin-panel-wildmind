import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AdminRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  query: any;
  params: any;
  body: any;
}

export function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.admin_token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    try {
      const decoded = jwt.verify(token, env.jwtSecret) as { adminId: string; email: string };
      req.adminId = decoded.adminId;
      req.adminEmail = decoded.email;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

