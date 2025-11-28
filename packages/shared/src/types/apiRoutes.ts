/**
 * API Route Definitions for Third-Party Provider Management
 */

import { ApiProvider } from './thirdPartyApi';

/**
 * Base API Route Structure
 */
export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  requiresAuth: boolean;
  adminOnly?: boolean;
}

/**
 * Provider-specific API Routes
 */
export interface ProviderApiRoutes {
  provider: ApiProvider;
  baseUrl: string;
  routes: {
    // Account & Balance Management
    getAccount?: ApiRoute;
    getBalance?: ApiRoute;
    getUsage?: ApiRoute;
    getBilling?: ApiRoute;
    
    // Model Management
    listModels?: ApiRoute;
    getModelInfo?: ApiRoute;
    getModelPricing?: ApiRoute;
    
    // Request Management
    listRequests?: ApiRoute;
    getRequest?: ApiRoute;
    cancelRequest?: ApiRoute;
    
    // Configuration
    updateConfig?: ApiRoute;
    getConfig?: ApiRoute;
    
    // Health & Status
    healthCheck?: ApiRoute;
    getStatus?: ApiRoute;
  };
}

/**
 * Fal.ai API Routes
 */
export const FAL_AI_ROUTES: ProviderApiRoutes = {
  provider: ApiProvider.FAL_AI,
  baseUrl: 'https://fal.ai/api',
  routes: {
    // Account Management (via Dashboard - no direct API)
    // Balance typically checked via dashboard or webhook callbacks
    
    // Model Management
    listModels: {
      method: 'GET',
      path: '/models',
      description: 'List all available Fal.ai models',
      requiresAuth: true,
    },
    getModelInfo: {
      method: 'GET',
      path: '/models/:modelId',
      description: 'Get information about a specific model',
      requiresAuth: true,
    },
    
    // Request Management
    listRequests: {
      method: 'GET',
      path: '/requests',
      description: 'List all API requests (via webhook logs or dashboard)',
      requiresAuth: true,
      adminOnly: true,
    },
    getRequest: {
      method: 'GET',
      path: '/requests/:requestId',
      description: 'Get details of a specific request',
      requiresAuth: true,
      adminOnly: true,
    },
    
    // Health Check
    healthCheck: {
      method: 'GET',
      path: '/health',
      description: 'Check Fal.ai API health status',
      requiresAuth: false,
    },
  },
};

/**
 * Replicate API Routes
 */
export const REPLICATE_ROUTES: ProviderApiRoutes = {
  provider: ApiProvider.REPLICATE,
  baseUrl: 'https://api.replicate.com/v1',
  routes: {
    // Account & Balance Management
    getAccount: {
      method: 'GET',
      path: '/account',
      description: 'Get account information and balance',
      requiresAuth: true,
    },
    getUsage: {
      method: 'GET',
      path: '/usage',
      description: 'Get usage statistics',
      requiresAuth: true,
    },
    getBilling: {
      method: 'GET',
      path: '/billing',
      description: 'Get billing information',
      requiresAuth: true,
    },
    
    // Model Management
    listModels: {
      method: 'GET',
      path: '/models',
      description: 'List all available models',
      requiresAuth: false,
    },
    getModelInfo: {
      method: 'GET',
      path: '/models/:owner/:name',
      description: 'Get information about a specific model',
      requiresAuth: false,
    },
    getModelPricing: {
      method: 'GET',
      path: '/models/:owner/:name/pricing',
      description: 'Get pricing information for a model',
      requiresAuth: false,
    },
    
    // Request Management
    listRequests: {
      method: 'GET',
      path: '/predictions',
      description: 'List all predictions (requests)',
      requiresAuth: true,
    },
    getRequest: {
      method: 'GET',
      path: '/predictions/:id',
      description: 'Get details of a specific prediction',
      requiresAuth: true,
    },
    cancelRequest: {
      method: 'POST',
      path: '/predictions/:id/cancel',
      description: 'Cancel a running prediction',
      requiresAuth: true,
    },
    
    // Health Check
    healthCheck: {
      method: 'GET',
      path: '/health',
      description: 'Check Replicate API health status',
      requiresAuth: false,
    },
  },
};

/**
 * MiniMax API Routes
 */
export const MINIMAX_ROUTES: ProviderApiRoutes = {
  provider: ApiProvider.MINIMAX,
  baseUrl: 'https://api.minimax.chat',
  routes: {
    // Account & Balance Management
    getAccount: {
      method: 'GET',
      path: '/v1/account',
      description: 'Get account information and balance',
      requiresAuth: true,
    },
    getUsage: {
      method: 'GET',
      path: '/v1/usage',
      description: 'Get usage statistics and credit consumption',
      requiresAuth: true,
    },
    getBilling: {
      method: 'GET',
      path: '/v1/billing',
      description: 'Get billing information',
      requiresAuth: true,
    },
    
    // Model Management
    listModels: {
      method: 'GET',
      path: '/v1/models',
      description: 'List all available MiniMax models',
      requiresAuth: true,
    },
    getModelInfo: {
      method: 'GET',
      path: '/v1/models/:modelId',
      description: 'Get information about a specific model',
      requiresAuth: true,
    },
    
    // Request Management
    listRequests: {
      method: 'GET',
      path: '/v1/requests',
      description: 'List all API requests',
      requiresAuth: true,
      adminOnly: true,
    },
    getRequest: {
      method: 'GET',
      path: '/v1/requests/:requestId',
      description: 'Get details of a specific request',
      requiresAuth: true,
      adminOnly: true,
    },
    
    // Health Check
    healthCheck: {
      method: 'GET',
      path: '/v1/health',
      description: 'Check MiniMax API health status',
      requiresAuth: false,
    },
  },
};

/**
 * Runway ML API Routes
 */
export const RUNWAY_ML_ROUTES: ProviderApiRoutes = {
  provider: ApiProvider.RUNWAY_ML,
  baseUrl: 'https://api.runwayml.com/v1',
  routes: {
    // Account & Balance Management
    getAccount: {
      method: 'GET',
      path: '/account',
      description: 'Get account information and credits balance',
      requiresAuth: true,
    },
    getBalance: {
      method: 'GET',
      path: '/account/balance',
      description: 'Get current credits balance',
      requiresAuth: true,
    },
    getUsage: {
      method: 'GET',
      path: '/account/usage',
      description: 'Get usage statistics',
      requiresAuth: true,
    },
    getBilling: {
      method: 'GET',
      path: '/account/billing',
      description: 'Get billing information',
      requiresAuth: true,
    },
    
    // Model Management
    listModels: {
      method: 'GET',
      path: '/models',
      description: 'List all available Runway models',
      requiresAuth: true,
    },
    getModelInfo: {
      method: 'GET',
      path: '/models/:modelId',
      description: 'Get information about a specific model',
      requiresAuth: true,
    },
    
    // Request Management
    listRequests: {
      method: 'GET',
      path: '/tasks',
      description: 'List all tasks (generation requests)',
      requiresAuth: true,
    },
    getRequest: {
      method: 'GET',
      path: '/tasks/:taskId',
      description: 'Get details of a specific task',
      requiresAuth: true,
    },
    cancelRequest: {
      method: 'POST',
      path: '/tasks/:taskId/cancel',
      description: 'Cancel a running task',
      requiresAuth: true,
    },
    
    // Health Check
    healthCheck: {
      method: 'GET',
      path: '/health',
      description: 'Check Runway ML API health status',
      requiresAuth: false,
    },
  },
};

/**
 * Black Forest Labs API Routes
 */
export const BLACK_FOREST_LABS_ROUTES: ProviderApiRoutes = {
  provider: ApiProvider.BLACK_FOREST_LABS,
  baseUrl: 'https://api.bfl.ml',
  routes: {
    // Account & Balance Management
    getAccount: {
      method: 'GET',
      path: '/v1/account',
      description: 'Get account information and balance',
      requiresAuth: true,
    },
    getBalance: {
      method: 'GET',
      path: '/v1/account/balance',
      description: 'Get current credits/balance',
      requiresAuth: true,
    },
    getUsage: {
      method: 'GET',
      path: '/v1/account/usage',
      description: 'Get usage statistics',
      requiresAuth: true,
    },
    getBilling: {
      method: 'GET',
      path: '/v1/account/billing',
      description: 'Get billing information',
      requiresAuth: true,
    },
    
    // Model Management
    listModels: {
      method: 'GET',
      path: '/v1/models',
      description: 'List all available Flux models',
      requiresAuth: true,
    },
    getModelInfo: {
      method: 'GET',
      path: '/v1/models/:modelId',
      description: 'Get information about a specific model',
      requiresAuth: true,
    },
    getModelPricing: {
      method: 'GET',
      path: '/v1/models/:modelId/pricing',
      description: 'Get pricing information for a model',
      requiresAuth: true,
    },
    
    // Request Management
    listRequests: {
      method: 'GET',
      path: '/v1/requests',
      description: 'List all API requests',
      requiresAuth: true,
      adminOnly: true,
    },
    getRequest: {
      method: 'GET',
      path: '/v1/requests/:requestId',
      description: 'Get details of a specific request',
      requiresAuth: true,
      adminOnly: true,
    },
    
    // Health Check
    healthCheck: {
      method: 'GET',
      path: '/v1/health',
      description: 'Check Black Forest Labs API health status',
      requiresAuth: false,
    },
  },
};

/**
 * All Provider Routes
 */
export const ALL_PROVIDER_ROUTES: Record<ApiProvider, ProviderApiRoutes> = {
  [ApiProvider.FAL_AI]: FAL_AI_ROUTES,
  [ApiProvider.REPLICATE]: REPLICATE_ROUTES,
  [ApiProvider.MINIMAX]: MINIMAX_ROUTES,
  [ApiProvider.RUNWAY_ML]: RUNWAY_ML_ROUTES,
  [ApiProvider.BLACK_FOREST_LABS]: BLACK_FOREST_LABS_ROUTES,
};

