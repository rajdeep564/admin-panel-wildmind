/**
 * Admin Authentication & Authorization Types
 */

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support',
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: AdminRole;
  permissions: string[];
  lastLoginAt?: Date;
  createdAt: Date;
  isActive: boolean;
}

export interface AdminSession {
  id: string;
  adminId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

