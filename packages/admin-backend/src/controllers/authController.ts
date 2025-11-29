import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Hardcoded admin credentials
    if (email === env.adminEmail && password === env.adminPassword) {
      const token = jwt.sign(
        { adminId: 'admin-1', email: env.adminEmail },
        env.jwtSecret,
        { expiresIn: '24h' }
      );

      // Set cookie
      // In production, use 'none' for cross-origin requests (requires secure: true)
      // In development, use 'lax' for same-origin requests
      const cookieOptions: any = {
        httpOnly: true,
        secure: env.nodeEnv === 'production',
        sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/', // Make cookie available for all paths
      };
      
      // In production, don't set domain (let browser handle it)
      // Setting domain explicitly can cause issues with cross-origin cookies
      if (env.nodeEnv !== 'production') {
        cookieOptions.domain = undefined;
      }
      
      res.cookie('admin_token', token, cookieOptions);
      
      // Log cookie setting for debugging
      console.log('Cookie set:', {
        name: 'admin_token',
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        path: cookieOptions.path,
        maxAge: cookieOptions.maxAge,
      });

      return res.json({
        success: true,
        token,
        admin: {
          id: 'admin-1',
          email: env.adminEmail,
          role: 'admin',
        },
      });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function logout(req: Request, res: Response) {
  // Clear cookie with same options used to set it
  const cookieOptions: any = {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  };
  res.clearCookie('admin_token', cookieOptions);
  return res.json({ success: true, message: 'Logged out successfully' });
}

export async function verify(req: Request, res: Response) {
  // This will be called after requireAdmin middleware
  return res.json({ success: true, message: 'Token is valid' });
}

