# Third-Party API Management Routes

This document outlines all API routes and endpoints for managing the 5 third-party providers in the WildMind Admin Panel.

## Providers

1. **Fal.ai** - Image and video generation
2. **Replicate** - Various AI models (image, video, upscaling)
3. **MiniMax** - Image, video, and music generation
4. **Runway ML** - Creative AI tools and video generation
5. **Black Forest Labs** - Flux image generation models

---

## Admin Panel API Endpoints

### Base Path: `/api/admin/third-party-apis`

---

## 1. Provider Status & Health

### GET `/providers`
Get status overview of all providers.

**Response:**
```json
{
  "data": [
    {
      "provider": "fal_ai",
      "status": "healthy",
      "lastChecked": "2025-11-26T17:00:00Z",
      "responseTime": 120,
      "successRate": 99.5,
      "uptime24h": 99.9,
      "uptime7d": 99.8,
      "uptime30d": 99.7
    },
    // ... other providers
  ]
}
```

### GET `/providers/:provider/status`
Get detailed status for a specific provider.

**Parameters:**
- `provider`: `fal_ai` | `replicate` | `minimax` | `runway_ml` | `black_forest_labs`

**Response:**
```json
{
  "data": {
    "provider": "fal_ai",
    "status": "healthy",
    "lastChecked": "2025-11-26T17:00:00Z",
    "responseTime": 120,
    "successRate": 99.5,
    "uptime24h": 99.9,
    "uptime7d": 99.8,
    "uptime30d": 99.7,
    "errorMessage": null,
    "recentErrors": []
  }
}
```

### POST `/providers/:provider/health-check`
Manually trigger a health check for a provider.

**Response:**
```json
{
  "data": {
    "provider": "fal_ai",
    "status": "healthy",
    "responseTime": 120,
    "timestamp": "2025-11-26T17:00:00Z"
  }
}
```

---

## 2. Credit & Balance Management

### GET `/providers/:provider/balance`
Get current credit balance for a provider.

**Response:**
```json
{
  "data": {
    "provider": "fal_ai",
    "currentBalance": 1500.50,
    "currency": "USD",
    "consumptionRate": 25.5,
    "estimatedDaysUntilDepletion": 58,
    "lastUpdated": "2025-11-26T16:00:00Z",
    "lowBalanceThreshold": 100,
    "isLowBalance": false
  }
}
```

### GET `/providers/balances`
Get balances for all providers.

**Response:**
```json
{
  "data": [
    {
      "provider": "fal_ai",
      "currentBalance": 1500.50,
      "currency": "USD",
      "isLowBalance": false
    },
    // ... other providers
  ]
}
```

### GET `/providers/:provider/transactions`
Get credit transaction history for a provider.

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `type` (optional): `purchase` | `consumption` | `refund` | `adjustment`
- `limit` (optional): number (default: 50)
- `offset` (optional): number (default: 0)

**Response:**
```json
{
  "data": {
    "transactions": [
      {
        "id": "tx_123",
        "provider": "fal_ai",
        "type": "consumption",
        "amount": -0.05,
        "balanceBefore": 1500.55,
        "balanceAfter": 1500.50,
        "description": "Image generation - flux-2-pro",
        "createdAt": "2025-11-26T16:00:00Z",
        "metadata": {
          "requestId": "req_456",
          "model": "flux-2-pro"
        }
      }
    ],
    "total": 1250,
    "limit": 50,
    "offset": 0
  }
}
```

### POST `/providers/:provider/credits/add`
Add credits to a provider account (manual adjustment).

**Request Body:**
```json
{
  "amount": 100.00,
  "description": "Manual credit addition",
  "metadata": {}
}
```

**Response:**
```json
{
  "data": {
    "transactionId": "tx_789",
    "provider": "fal_ai",
    "amount": 100.00,
    "balanceBefore": 1500.50,
    "balanceAfter": 1600.50,
    "createdAt": "2025-11-26T17:00:00Z"
  }
}
```

---

## 3. Model Pricing Management

### GET `/providers/:provider/models`
List all models for a provider with current pricing.

**Query Parameters:**
- `activeOnly` (optional): boolean (default: true)

**Response:**
```json
{
  "data": {
    "provider": "fal_ai",
    "models": [
      {
        "modelId": "flux-2-pro",
        "modelName": "Flux 2 Pro",
        "modelVersion": "1.0",
        "pricing": {
          "costPerGeneration": 0.05,
          "currency": "USD",
          "creditsPerGeneration": 100
        },
        "isActive": true,
        "lastUpdated": "2025-11-26T10:00:00Z"
      }
    ],
    "total": 25
  }
}
```

### GET `/providers/:provider/models/:modelId`
Get detailed pricing information for a specific model.

**Response:**
```json
{
  "data": {
    "provider": "fal_ai",
    "modelId": "flux-2-pro",
    "modelName": "Flux 2 Pro",
    "modelVersion": "1.0",
    "pricing": {
      "costPerGeneration": 0.05,
      "currency": "USD",
      "tieredPricing": [
        {
          "tier": "standard",
          "minQuantity": 1,
          "costPerGeneration": 0.05
        },
        {
          "tier": "bulk",
          "minQuantity": 100,
          "costPerGeneration": 0.04
        }
      ],
      "resolutionBased": [
        {
          "resolution": "1024x1024",
          "costPerGeneration": 0.05
        },
        {
          "resolution": "2048x2048",
          "costPerGeneration": 0.10
        }
      ]
    },
    "creditsPerGeneration": 100,
    "isActive": true,
    "lastUpdated": "2025-11-26T10:00:00Z"
  }
}
```

### PUT `/providers/:provider/models/:modelId/pricing`
Update pricing for a model.

**Request Body:**
```json
{
  "pricing": {
    "costPerGeneration": 0.06,
    "currency": "USD"
  },
  "creditsPerGeneration": 120,
  "reason": "Provider increased pricing"
}
```

**Response:**
```json
{
  "data": {
    "modelId": "flux-2-pro",
    "oldPricing": {
      "costPerGeneration": 0.05,
      "creditsPerGeneration": 100
    },
    "newPricing": {
      "costPerGeneration": 0.06,
      "creditsPerGeneration": 120
    },
    "updatedAt": "2025-11-26T17:00:00Z",
    "updatedBy": "admin_123"
  }
}
```

### GET `/providers/:provider/models/:modelId/pricing/history`
Get pricing history for a model.

**Query Parameters:**
- `limit` (optional): number (default: 50)

**Response:**
```json
{
  "data": {
    "modelId": "flux-2-pro",
    "history": [
      {
        "id": "ph_123",
        "oldPricing": {
          "costPerGeneration": 0.05,
          "creditsPerGeneration": 100
        },
        "newPricing": {
          "costPerGeneration": 0.06,
          "creditsPerGeneration": 120
        },
        "updatedBy": "admin_123",
        "updatedAt": "2025-11-26T17:00:00Z",
        "reason": "Provider increased pricing"
      }
    ],
    "total": 5
  }
}
```

### POST `/providers/:provider/models/bulk-pricing-update`
Bulk update pricing for multiple models.

**Request Body:**
```json
{
  "updates": [
    {
      "modelId": "flux-2-pro",
      "pricing": {
        "costPerGeneration": 0.06,
        "creditsPerGeneration": 120
      }
    },
    {
      "modelId": "flux-1.1-pro",
      "pricing": {
        "costPerGeneration": 0.04,
        "creditsPerGeneration": 80
      }
    }
  ],
  "reason": "Provider-wide pricing update"
}
```

---

## 4. API Configuration Management

### GET `/providers/:provider/config`
Get current API configuration for a provider.

**Response:**
```json
{
  "data": {
    "provider": "fal_ai",
    "apiKey": "***masked***",
    "enabled": true,
    "priority": 1,
    "rateLimit": {
      "requestsPerMinute": 60,
      "requestsPerHour": 1000,
      "requestsPerDay": 10000
    },
    "timeout": 30000,
    "retryPolicy": {
      "maxRetries": 3,
      "retryDelay": 1000
    },
    "models": ["flux-2-pro", "flux-1.1-pro"],
    "activeModel": "flux-2-pro"
  }
}
```

### PUT `/providers/:provider/config`
Update API configuration.

**Request Body:**
```json
{
  "enabled": true,
  "priority": 1,
  "rateLimit": {
    "requestsPerMinute": 60,
    "requestsPerHour": 1000
  },
  "timeout": 30000,
  "retryPolicy": {
    "maxRetries": 3,
    "retryDelay": 1000
  }
}
```

### PUT `/providers/:provider/api-key`
Update API key for a provider.

**Request Body:**
```json
{
  "apiKey": "new_api_key_here",
  "testConnection": true
}
```

**Response:**
```json
{
  "data": {
    "success": true,
    "message": "API key updated and tested successfully",
    "testResult": {
      "status": "healthy",
      "responseTime": 120
    }
  }
}
```

### POST `/providers/:provider/test-connection`
Test API connection with current credentials.

**Response:**
```json
{
  "data": {
    "success": true,
    "status": "healthy",
    "responseTime": 120,
    "message": "Connection successful"
  }
}
```

---

## 5. Usage Analytics

### GET `/providers/:provider/usage`
Get usage statistics for a provider.

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `groupBy` (optional): `day` | `week` | `month` (default: `day`)

**Response:**
```json
{
  "data": {
    "provider": "fal_ai",
    "period": {
      "start": "2025-11-01T00:00:00Z",
      "end": "2025-11-26T23:59:59Z"
    },
    "totalRequests": 12500,
    "successfulRequests": 12400,
    "failedRequests": 100,
    "averageResponseTime": 120,
    "totalCost": 625.00,
    "byDay": [
      {
        "date": "2025-11-26",
        "requests": 500,
        "successful": 495,
        "failed": 5,
        "cost": 25.00,
        "averageResponseTime": 120
      }
    ]
  }
}
```

### GET `/providers/:provider/usage/by-model`
Get usage statistics grouped by model.

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "data": {
    "provider": "fal_ai",
    "period": {
      "start": "2025-11-01T00:00:00Z",
      "end": "2025-11-26T23:59:59Z"
    },
    "byModel": [
      {
        "modelId": "flux-2-pro",
        "modelName": "Flux 2 Pro",
        "requests": 8000,
        "successful": 7950,
        "failed": 50,
        "totalCost": 400.00,
        "averageResponseTime": 120
      },
      {
        "modelId": "flux-1.1-pro",
        "modelName": "Flux 1.1 Pro",
        "requests": 4500,
        "successful": 4450,
        "failed": 50,
        "totalCost": 225.00,
        "averageResponseTime": 110
      }
    ]
  }
}
```

### GET `/providers/usage/summary`
Get usage summary across all providers.

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "data": {
    "period": {
      "start": "2025-11-01T00:00:00Z",
      "end": "2025-11-26T23:59:59Z"
    },
    "totalRequests": 50000,
    "totalCost": 2500.00,
    "byProvider": [
      {
        "provider": "fal_ai",
        "requests": 12500,
        "cost": 625.00,
        "percentage": 25
      },
      {
        "provider": "replicate",
        "requests": 15000,
        "cost": 750.00,
        "percentage": 30
      }
    ]
  }
}
```

---

## 6. Request Management

### GET `/providers/:provider/requests`
List all requests for a provider.

**Query Parameters:**
- `status` (optional): `pending` | `processing` | `completed` | `failed`
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `limit` (optional): number (default: 50)
- `offset` (optional): number (default: 0)

**Response:**
```json
{
  "data": {
    "requests": [
      {
        "id": "req_123",
        "provider": "fal_ai",
        "model": "flux-2-pro",
        "status": "completed",
        "userId": "user_456",
        "createdAt": "2025-11-26T16:00:00Z",
        "completedAt": "2025-11-26T16:00:05Z",
        "responseTime": 5000,
        "cost": 0.05,
        "metadata": {
          "prompt": "A beautiful landscape",
          "resolution": "1024x1024"
        }
      }
    ],
    "total": 12500,
    "limit": 50,
    "offset": 0
  }
}
```

### GET `/providers/:provider/requests/:requestId`
Get details of a specific request.

**Response:**
```json
{
  "data": {
    "id": "req_123",
    "provider": "fal_ai",
    "model": "flux-2-pro",
    "status": "completed",
    "userId": "user_456",
    "createdAt": "2025-11-26T16:00:00Z",
    "completedAt": "2025-11-26T16:00:05Z",
    "responseTime": 5000,
    "cost": 0.05,
    "request": {
      "prompt": "A beautiful landscape",
      "resolution": "1024x1024",
      "n": 1
    },
    "response": {
      "images": ["https://..."],
      "metadata": {}
    },
    "error": null
  }
}
```

### POST `/providers/:provider/requests/:requestId/cancel`
Cancel a pending/processing request.

**Response:**
```json
{
  "data": {
    "id": "req_123",
    "status": "cancelled",
    "cancelledAt": "2025-11-26T17:00:00Z"
  }
}
```

---

## 7. Alert Management

### GET `/providers/:provider/alerts`
Get active alerts for a provider.

**Query Parameters:**
- `severity` (optional): `low` | `medium` | `high` | `critical`
- `resolved` (optional): boolean (default: false)

**Response:**
```json
{
  "data": {
    "alerts": [
      {
        "id": "alert_123",
        "provider": "fal_ai",
        "severity": "high",
        "type": "low_balance",
        "message": "Credit balance is below threshold: $50.00",
        "createdAt": "2025-11-26T16:00:00Z",
        "resolved": false
      }
    ],
    "total": 3
  }
}
```

### POST `/providers/:provider/alerts/:alertId/resolve`
Resolve an alert.

**Request Body:**
```json
{
  "resolutionNote": "Credits added to account"
}
```

**Response:**
```json
{
  "data": {
    "id": "alert_123",
    "resolved": true,
    "resolvedAt": "2025-11-26T17:00:00Z",
    "resolvedBy": "admin_123"
  }
}
```

### POST `/providers/:provider/alerts`
Create a custom alert.

**Request Body:**
```json
{
  "severity": "medium",
  "type": "custom",
  "message": "Custom alert message"
}
```

---

## 8. Provider Routing & Load Balancing

### GET `/providers/routing`
Get current routing configuration.

**Response:**
```json
{
  "data": {
    "rules": [
      {
        "model": "flux-2-pro",
        "providers": [
          {
            "provider": "fal_ai",
            "priority": 1,
            "weight": 70,
            "enabled": true
          },
          {
            "provider": "black_forest_labs",
            "priority": 2,
            "weight": 30,
            "enabled": true
          }
        ]
      }
    ]
  }
}
```

### PUT `/providers/routing`
Update routing configuration.

**Request Body:**
```json
{
  "rules": [
    {
      "model": "flux-2-pro",
      "providers": [
        {
          "provider": "fal_ai",
          "priority": 1,
          "weight": 70,
          "enabled": true
        }
      ]
    }
  ]
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request parameters",
    "details": {}
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal error occurred"
  }
}
```

---

## Notes

1. **Authentication**: All endpoints require admin authentication via JWT token in `Authorization` header.

2. **Rate Limiting**: Admin endpoints may have rate limits to prevent abuse.

3. **Audit Logging**: All admin actions are logged for audit purposes.

4. **Real-time Updates**: Some endpoints support WebSocket connections for real-time updates.

5. **Pagination**: List endpoints support pagination via `limit` and `offset` query parameters.

6. **Filtering**: Most list endpoints support filtering by date range, status, etc.

7. **Export**: List endpoints may support CSV/JSON export via `?format=csv` or `?format=json` query parameter.

