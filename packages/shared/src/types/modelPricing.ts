/**
 * Model Pricing Types
 */

import { ApiProvider } from './thirdPartyApi';

export interface ModelPricing {
  provider: ApiProvider;
  modelId: string;
  modelName: string;
  modelVersion?: string;
  pricing: {
    // Cost per generation/request
    costPerGeneration: number;
    currency: string;
    // Optional: tiered pricing
    tieredPricing?: {
      tier: string;
      minQuantity: number;
      maxQuantity?: number;
      costPerGeneration: number;
    }[];
    // Optional: resolution-based pricing
    resolutionBased?: {
      resolution: string;
      costPerGeneration: number;
    }[];
    // Optional: duration-based pricing (for video)
    durationBased?: {
      duration: string;
      costPerGeneration: number;
    }[];
  };
  // Credits equivalent (if using internal credit system)
  creditsPerGeneration?: number;
  lastUpdated: Date;
  isActive: boolean;
}

export interface ModelPricingUpdate {
  provider: ApiProvider;
  modelId: string;
  pricing: Partial<ModelPricing['pricing']>;
  creditsPerGeneration?: number;
  isActive?: boolean;
}

export interface PricingHistory {
  id: string;
  provider: ApiProvider;
  modelId: string;
  oldPricing: ModelPricing['pricing'];
  newPricing: ModelPricing['pricing'];
  oldCredits?: number;
  newCredits?: number;
  updatedBy: string; // admin ID
  updatedAt: Date;
  reason?: string;
}

