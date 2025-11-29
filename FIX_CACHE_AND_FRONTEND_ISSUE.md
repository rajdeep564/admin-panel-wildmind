# Fix: Cache and Frontend State Preventing Score Updates

## Problem
After updating scores in admin panel, changes don't appear in ArtStation live view for a long time (or never).

## Root Causes Found

### 1. Backend Cache (Redis)
- Public feed is cached in Redis for **2 minutes** (LIST_CACHE_TTL)
- When admin updates score, cache still has old data
- Frontend gets cached response with old scores

### 2. Frontend State Caching
- React state stores items in memory
- Only refetches when:
  - Category changes
  - Search query changes
  - User scrolls (pagination)
- **Does NOT refetch when scores update in backend**

### 3. Missing Field in Type
- Frontend `PublicItem` type didn't include `aestheticScore`
- Even if backend returns it, TypeScript might not recognize it

## Solutions Applied

### ✅ Fixed: Added `aestheticScore` to Frontend Type
- Updated `PublicItem` type to include `aestheticScore`
- Preserves score when mapping API response

### ✅ Fixed: Preserve Score in Response Mapping
- Frontend now preserves `aestheticScore` from API response

## Solutions Needed (Not Yet Implemented)

### 1. Cache Invalidation (Backend)
The admin panel needs to invalidate the public feed cache after updating scores.

**Option A: Call Cache Invalidation API** (if available)
```typescript
// In admin panel after updating score
try {
  await fetch(`${API_BASE_URL}/api/admin/invalidate-feed-cache`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
} catch (e) {
  console.warn('Failed to invalidate cache:', e);
}
```

**Option B: Add Cache Invalidation Endpoint**
Create an endpoint in the main API that admin panel can call:
```typescript
// In api-gateway-services-wildmind
POST /api/admin/invalidate-feed-cache
// Calls invalidatePublicFeedCache()
```

**Option C: Direct Redis Access** (if admin panel has Redis access)
```typescript
// In admin panel
import { invalidatePublicFeedCache } from '../utils/generationCache';
await invalidatePublicFeedCache();
```

### 2. Frontend Auto-Refresh (Optional)
Add periodic refresh or websocket updates:

```typescript
// Poll for updates every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    if (!loading && items.length > 0) {
      fetchFeed(false); // Refresh without reset
    }
  }, 30000); // 30 seconds
  
  return () => clearInterval(interval);
}, [items.length, loading]);
```

## Current Behavior

### Without Cache Invalidation:
1. Admin updates score ✅
2. Score saved to Firestore ✅
3. Mirror queue task queued ✅
4. Mirror worker syncs (2-5 seconds) ✅
5. **BUT**: Cache still has old data ❌
6. Frontend requests feed → Gets cached old data ❌
7. **Cache expires in 2 minutes** → Then shows new data ✅

**Delay: Up to 2 minutes** (cache TTL)

### With Cache Invalidation:
1. Admin updates score ✅
2. Score saved to Firestore ✅
3. Mirror queue task queued ✅
4. **Cache invalidated immediately** ✅
5. Mirror worker syncs (2-5 seconds) ✅
6. Frontend requests feed → Gets fresh data ✅

**Delay: 2-5 seconds** (mirror worker poll interval)

## Recommended Fix

### Step 1: Add Cache Invalidation to Admin Panel

Add this after updating the score in `generationsController.ts`:

```typescript
// After queuing mirror task
try {
  // Call cache invalidation endpoint (if available)
  // OR: Direct Redis access if admin panel has it
  // OR: HTTP call to main API endpoint
  await invalidatePublicFeedCache();
  console.log('[AdminPanel] Cache invalidated');
} catch (cacheError: any) {
  console.warn('[AdminPanel] Failed to invalidate cache:', cacheError?.message);
  // Non-blocking: cache will expire in 2 minutes anyway
}
```

### Step 2: Create Cache Invalidation Endpoint (if needed)

In `api-gateway-services-wildmind/src/routes/index.ts`:
```typescript
router.post('/api/admin/invalidate-feed-cache', requireAdmin, async (req, res) => {
  try {
    const { invalidatePublicFeedCache } = await import('../utils/generationCache');
    await invalidatePublicFeedCache();
    res.json({ success: true, message: 'Cache invalidated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to invalidate cache' });
  }
});
```

## Verification

After implementing cache invalidation:

1. Update score in admin panel
2. Check backend logs - should see "Cache invalidated"
3. Wait 2-5 seconds (mirror worker)
4. Refresh ArtStation page
5. Should see updated score immediately ✅

## Summary

**Issues:**
1. ✅ Frontend type missing `aestheticScore` - FIXED
2. ❌ Backend cache not invalidated - NEEDS FIX
3. ❌ Frontend doesn't auto-refresh - OPTIONAL

**Current delay:** Up to 2 minutes (cache TTL)  
**With cache invalidation:** 2-5 seconds (mirror worker)

The main blocker is the **Redis cache** - it needs to be invalidated when scores are updated!

