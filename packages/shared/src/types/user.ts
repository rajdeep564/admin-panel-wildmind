/**
 * User Management Types
 */

export enum UserRole {
  USER = 'user',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export interface User {
  uid: string;
  email: string;
  username?: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  credits: number;
  plan?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  totalGenerations: number;
  totalImages: number;
  totalVideos: number;
  metadata?: Record<string, any>;
}

export interface UserStats {
  uid: string;
  totalGenerations: number;
  totalImages: number;
  totalVideos: number;
  totalMusic: number;
  totalCreditsUsed: number;
  averageAestheticScore?: number;
  lastGenerationAt?: Date;
  period: {
    start: Date;
    end: Date;
  };
}

