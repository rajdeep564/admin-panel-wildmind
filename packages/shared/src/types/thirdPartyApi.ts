/**
 * Third-Party API Provider Types
 */

export enum ApiProvider {
  FAL_AI = 'fal_ai',
  REPLICATE = 'replicate',
  MINIMAX = 'minimax',
  RUNWAY_ML = 'runway_ml',
  BLACK_FOREST_LABS = 'black_forest_labs',
}

export enum ApiStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  UNKNOWN = 'unknown',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ApiProviderStatus {
  provider: ApiProvider;
  status: ApiStatus;
  lastChecked: Date;
  responseTime?: number; // in milliseconds
  successRate?: number; // percentage
  uptime24h?: number; // percentage
  uptime7d?: number; // percentage
  uptime30d?: number; // percentage
  errorMessage?: string;
}

export interface ApiCreditBalance {
  provider: ApiProvider;
  currentBalance: number;
  currency?: string;
  consumptionRate?: number; // credits per day
  estimatedDaysUntilDepletion?: number;
  lastUpdated: Date;
  lowBalanceThreshold?: number;
  isLowBalance?: boolean;
}

export interface ApiUsageStats {
  provider: ApiProvider;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalCost?: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface ApiConfiguration {
  provider: ApiProvider;
  apiKey: string; // encrypted
  enabled: boolean;
  priority: number; // for routing
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  timeout?: number; // in milliseconds
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
  };
  models?: string[];
  activeModel?: string;
}

export interface ApiAlert {
  id: string;
  provider: ApiProvider;
  severity: AlertSeverity;
  type: 'low_balance' | 'downtime' | 'high_error_rate' | 'performance_degradation';
  message: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolved: boolean;
}

export interface ApiHealthCheck {
  provider: ApiProvider;
  timestamp: Date;
  status: ApiStatus;
  responseTime: number;
  success: boolean;
  error?: string;
}

export interface ApiTransaction {
  id: string;
  provider: ApiProvider;
  type: 'purchase' | 'consumption' | 'refund' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

