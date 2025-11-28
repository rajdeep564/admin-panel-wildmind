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
      res.cookie('admin_token', token, {
        httpOnly: true,
        secure: env.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
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
  res.clearCookie('admin_token');
  return res.json({ success: true, message: 'Logged out successfully' });
}

export async function verify(req: Request, res: Response) {
  // This will be called after requireAdmin middleware
  return res.json({ success: true, message: 'Token is valid' });
}

