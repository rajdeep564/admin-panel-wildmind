# Fix: ArtStation Score Changes Taking Too Long to Appear

## Problem
When you update an aesthetic score in the admin panel, it takes a long time (or doesn't appear) in the ArtStation live view.

## Root Cause

The admin panel was updating the `generations` collection directly, but **not queuing a mirror task**. This caused a race condition:

1. Admin panel updates `generations` collection ✅
2. Admin panel updates `generationHistory` ✅
3. **BUT**: No mirror queue task is queued ❌
4. Mirror queue worker processes old pending tasks
5. Worker overwrites the admin panel's change with stale data from `generationHistory` ❌
6. ArtStation shows old score (or takes time to update)

## Solution Applied

### ✅ Fixed: Queue Mirror Update Task

After updating the score, the admin panel now:
1. Updates `generations` collection (immediate)
2. Updates `generationHistory` (source of truth)
3. **Queues a mirror update task** (ensures worker syncs the change)

This ensures:
- Changes appear immediately in `generations` collection
- Mirror queue worker syncs the change properly
- No race condition with stale data
- ArtStation updates within 2-5 seconds (mirror worker poll interval)

## How It Works Now

```
Admin Panel Update Score
    ↓
1. Update generations collection (immediate)
2. Update generationHistory (source of truth)
3. Queue mirrorQueue task ← NEW!
    ↓
Mirror Queue Worker (polls every 2.5s)
    ↓
Processes update task
    ↓
Syncs to generations mirror
    ↓
ArtStation shows updated score ✅
```

## Expected Timing

- **Immediate**: Score updated in `generations` collection
- **2-5 seconds**: Mirror worker processes the queued task
- **Up to 2 minutes**: Cache expires (Redis cache TTL = 2 minutes)
- **After cache expires**: ArtStation shows the updated score

**Total delay: Up to 2 minutes** (due to Redis cache)

## ⚠️ Additional Issue: Redis Cache

The public feed is cached in Redis for **2 minutes**. Even after the mirror worker syncs, the cache may still serve old data.

**Current behavior:**
- Score updates in Firestore ✅
- Mirror worker syncs (2-5 seconds) ✅
- **BUT**: Cache serves old data for up to 2 minutes ❌
- After 2 minutes: Cache expires → Shows new data ✅

**To fix cache issue:**
1. Add cache invalidation endpoint in main API
2. Call it from admin panel after updating scores
3. See `FIX_CACHE_AND_FRONTEND_ISSUE.md` for details

## Verification

After deploying the fix:

1. Update a score in admin panel
2. Check Firestore `mirrorQueue` collection - should see a new task
3. Wait 2-5 seconds
4. Check ArtStation - should show updated score
5. Check backend logs - should see mirror worker processing the task

## Technical Details

### Mirror Queue Task Structure
```typescript
{
  op: 'update',
  uid: string,
  historyId: string,
  updates: {
    aestheticScore: number,
    images?: array,
    videos?: array,
  },
  status: 'pending',
  attempts: 0,
  createdAt: timestamp
}
```

### Worker Processing
- Polls every 2.5 seconds
- Processes up to 12 tasks per poll
- 4 concurrent tasks
- Updates `generations` mirror from `generationHistory`

## If Still Slow

### Check 1: Mirror Worker Running?
- Verify mirror queue worker is running
- Check worker logs for processing activity

### Check 2: Queue Backlog?
- Check `mirrorQueue` collection
- If many pending tasks, worker might be behind
- Consider increasing worker concurrency

### Check 3: ArtStation Caching?
- ArtStation might cache results
- Check if ArtStation has client-side caching
- May need to refresh or clear cache

## Summary

**Before**: Admin panel update → No mirror task → Worker overwrites with stale data → Delay/never updates

**After**: Admin panel update → Queue mirror task → Worker syncs immediately → Updates in 2-5 seconds ✅

The fix ensures the mirror queue worker knows about the change and syncs it properly, preventing race conditions with stale data.

