import { ApiProvider } from '../types';

/**
 * API Provider Constants
 */

export const API_PROVIDER_NAMES: Record<ApiProvider, string> = {
  [ApiProvider.FAL_AI]: 'Fal.ai',
  [ApiProvider.REPLICATE]: 'Replicate',
  [ApiProvider.MINIMAX]: 'MiniMax',
  [ApiProvider.RUNWAY_ML]: 'Runway ML',
  [ApiProvider.BLACK_FOREST_LABS]: 'Black Forest Labs',
};

export const API_PROVIDER_COLORS: Record<ApiProvider, string> = {
  [ApiProvider.FAL_AI]: '#ef4444',
  [ApiProvider.REPLICATE]: '#6366f1',
  [ApiProvider.MINIMAX]: '#8b5cf6',
  [ApiProvider.RUNWAY_ML]: '#10b981',
  [ApiProvider.BLACK_FOREST_LABS]: '#f59e0b',
};

export const API_PROVIDER_BASE_URLS: Record<ApiProvider, string> = {
  [ApiProvider.FAL_AI]: 'https://fal.ai/api',
  [ApiProvider.REPLICATE]: 'https://api.replicate.com/v1',
  [ApiProvider.MINIMAX]: 'https://api.minimax.chat',
  [ApiProvider.RUNWAY_ML]: 'https://api.runwayml.com/v1',
  [ApiProvider.BLACK_FOREST_LABS]: 'https://api.bfl.ml',
};

export const ALL_API_PROVIDERS = Object.values(ApiProvider);

