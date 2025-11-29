# ArtStation Duplicate Issue - Root Cause Analysis & Solution

## Table of Contents
1. [Overview](#overview)
2. [Architecture & Data Flow](#architecture--data-flow)
3. [Where ArtStation Items Are Stored](#where-artstation-items-are-stored)
4. [The Duplicate Problem](#the-duplicate-problem)
5. [Root Cause Analysis](#root-cause-analysis)
6. [Current Fixes Implemented](#current-fixes-implemented)
7. [What Needs to Be Done Correctly](#what-needs-to-be-done-correctly)
8. [Related Files](#related-files)

---

## Overview

The ArtStation feed displays high-quality AI-generated content (images, videos, music) with aesthetic scores >= 9.0. However, duplicate images are appearing in the feed, causing the same image to be displayed multiple times. This document explains the root cause and the solution.

---

## Architecture & Data Flow

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Generates Content                                       │
│    Location: generationHistory/{uid}/items/{historyId}           │
│    - Initial image stored with: id, url, originalUrl            │
│    - Aesthetic score calculated and stored                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Image Optimization (Background Process)                      │
│    - AVIF conversion (avifUrl)                                  │
│    - Thumbnail generation (thumbnailUrl)                        │
│    - Blur placeholder (blurDataUrl)                              │
│    - Updates: images array with optimized fields                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Mirror Sync (generationsMirrorRepository)                    │
│    Location: generations/{historyId}                              │
│    - Syncs public items from history to public mirror           │
│    - Uses Firestore merge: true                                 │
│    - This is where duplicates can occur!                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Admin Panel Scoring                                          │
│    - Admin updates aestheticScore via admin panel                │
│    - Updates both: generations/{id} AND                          │
│                    generationHistory/{uid}/items/{id}           │
│    - Also updates images[].aestheticScore                       │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Public Feed (publicGenerationsRepository)                    │
│    - Queries: generations collection                             │
│    - Filters: isPublic=true, isDeleted=false,                  │
│               aestheticScore >= 9.0                              │
│    - Returns items for ArtStation feed                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Where ArtStation Items Are Stored

### Primary Storage: `generations` Collection

**Collection Path:** `generations/{historyId}`

This is the **public mirror** of all public generations. It's a denormalized copy of items from `generationHistory/{uid}/items/{historyId}` that are marked as public.

**Key Fields:**
- `id`: The generation history ID
- `isPublic`: Must be `true`
- `isDeleted`: Must be `false`
- `aestheticScore`: Document-level aesthetic score (number)
- `scoreUpdatedAt`: Timestamp when admin updated the score (Firestore Timestamp)
- `scoreUpdatedBy`: Admin email who updated the score
- `images`: Array of image objects
- `videos`: Array of video objects
- `createdBy`: User information (uid, username, email, photoURL)
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Source of Truth: `generationHistory` Collection

**Collection Path:** `generationHistory/{uid}/items/{historyId}`

This is the **source of truth** for each user's generations. Items are synced to the `generations` mirror when:
- Item is marked as `isPublic: true`
- Item status changes to `completed`
- Item is updated (images, videos, aestheticScore, etc.)

---

## The Duplicate Problem

### Symptom

When viewing the ArtStation feed or admin panel, the same image appears multiple times. For example:

```
Document ID: c1tw2V85uxpKz78EgMnv
images: [
  {
    id: "056de59002a008c7807b196e28e9b56b-0",
    url: "https://...image-1.jpeg",
    avifUrl: "https://...image-1_optimized.avif",
    thumbnailUrl: "https://...image-1_thumb.avif",
    aestheticScore: 9.5,
    optimized: true,
    ...
  },
  {
    id: "056de59002a008c7807b196e28e9b56b-0",  // SAME ID!
    url: "https://...image-1.jpeg",
    // Missing optimized fields
    aestheticScore: 9.5,
    ...
  }
]
```

### Impact

1. **Frontend Display**: Same image rendered multiple times
2. **Pagination Issues**: Duplicates cause pagination to skip items or show same items
3. **Performance**: Unnecessary data transfer and rendering
4. **User Experience**: Confusing duplicate content

---

## Root Cause Analysis

### Root Cause #1: Firestore Merge Operations

**Location:** `api-gateway-services-wildmind/src/repository/generationsMirrorRepository.ts`

**Problem:**
```typescript
// Line 76-83: upsertFromHistory
await ref.set({
  ...historyDoc,
  createdBy,
  uid,
  id: historyId,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  ...(historyDoc.createdAt ? { createdAt: historyDoc.createdAt } : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
}, { merge: true });  // ⚠️ MERGE: true preserves existing array elements
```

**Why This Causes Duplicates:**

1. **Initial State**: Image is stored with basic fields:
   ```json
   {
     "images": [
       {
         "id": "056de59002a008c7807b196e28e9b56b-0",
         "url": "https://...image-1.jpeg",
         "aestheticScore": 9.5
       }
     ]
   }
   ```

2. **Optimization Process**: Background process adds optimized fields:
   ```json
   {
     "images": [
       {
         "id": "056de59002a008c7807b196e28e9b56b-0",
         "url": "https://...image-1.jpeg",
         "avifUrl": "https://...image-1_optimized.avif",
         "thumbnailUrl": "https://...image-1_thumb.avif",
         "aestheticScore": 9.5,
         "optimized": true
       }
     ]
   }
   ```

3. **Mirror Sync with Merge**: When the mirror repository syncs using `merge: true`, if the document already exists, Firestore **merges arrays by appending**, not replacing. This can result in:
   ```json
   {
     "images": [
       {
         "id": "056de59002a008c7807b196e28e9b56b-0",
         "url": "https://...image-1.jpeg",
         "avifUrl": "https://...image-1_optimized.avif",  // Optimized version
         "thumbnailUrl": "https://...image-1_thumb.avif",
         "aestheticScore": 9.5,
         "optimized": true
       },
       {
         "id": "056de59002a008c7807b196e28e9b56b-0",  // DUPLICATE!
         "url": "https://...image-1.jpeg",
         "aestheticScore": 9.5  // Missing optimized fields
       }
     ]
   }
   ```

### Root Cause #2: Multiple Update Paths

**Problem:** Images can be updated through multiple paths:

1. **Initial Generation**: Provider service (MiniMax, Replicate, etc.) stores images
2. **Aesthetic Scoring**: `aestheticScoreService.scoreImages()` adds scores
3. **Image Optimization**: Background process adds `avifUrl`, `thumbnailUrl`, `blurDataUrl`
4. **Admin Scoring**: Admin panel updates `aestheticScore` and `images[].aestheticScore`
5. **Mirror Sync**: `generationsMirrorRepository` syncs changes to public mirror

Each update path may not properly deduplicate existing images before adding new ones.

### Root Cause #3: Array Merge Behavior in Firestore

**Firestore Behavior:**
- `set()` with `merge: true` **replaces** the entire document, but if arrays are nested, it can preserve existing array elements if the update doesn't explicitly replace the array
- `update()` **merges** object fields, but arrays are replaced entirely (not merged element-wise)

**The Issue:**
When `upsertFromHistory` is called with `merge: true`, if the `images` array in the source document has duplicates, those duplicates are preserved in the mirror.

---

## Current Fixes Implemented

### Fix #1: Backend Deduplication (Admin Panel)

**Location:** `admin-panel/packages/admin-backend/src/controllers/generationsController.ts`

**Implementation:**
```typescript
// Lines 73-131: getGenerationsForScoring
// Lines 850-874: getArtStationItems

// Deduplicate images by ID first, then by base URL
const getImageKey = (img: any): string => {
  if (img?.id) return `id:${String(img.id)}`;  // Priority 1: Use ID
  const url = img?.url || img?.avifUrl || img?.thumbnailUrl || img?.thumbUrl || '';
  if (url) {
    const baseUrl = String(url).replace(/[._](optimized|avif|jpeg|jpg|png|webp|thumb)(\?.*)?$/i, '');
    return `url:${baseUrl}`;
  }
  return '';
};

// Count optimized fields to prefer better versions
const getOptimizedFieldCount = (img: any): number => {
  let count = 0;
  if (img?.avifUrl) count += 3;      // Highest priority
  if (img?.thumbnailUrl) count += 2;
  if (img?.thumbUrl) count += 1;
  if (img?.blurDataUrl) count += 1;
  if (img?.optimized === true) count += 1;
  return count;
};

// Deduplicate: keep the version with most optimized fields
const imageMap = new Map<string, any>();
for (const img of data.images) {
  const key = getImageKey(img);
  if (!key) continue;
  
  const existing = imageMap.get(key);
  if (!existing) {
    imageMap.set(key, img);
  } else {
    const existingScore = getOptimizedFieldCount(existing);
    const newScore = getOptimizedFieldCount(img);
    
    if (newScore > existingScore) {
      imageMap.set(key, img);  // Replace with better version
    } else if (newScore === existingScore) {
      // Tiebreaker: prefer avifUrl > thumbnailUrl
      if (img.avifUrl && !existing.avifUrl) {
        imageMap.set(key, img);
      }
    }
  }
}
normalized.images = Array.from(imageMap.values());
```

**What This Does:**
- Deduplicates images by ID (primary) or base URL (fallback)
- Keeps the version with the most optimized fields (AVIF, thumbnails, etc.)
- Ensures only one image per unique ID is returned

### Fix #2: Frontend Deduplication

**Location:** 
- `admin-panel/packages/admin-frontend/src/pages/ArtStationScoringPage.tsx`
- `admin-panel/packages/admin-frontend/src/pages/ArtStationManagementPage.tsx`

**Implementation:**
```typescript
// Deduplicate when appending new items
const fetchGenerations = useCallback(async (append = false) => {
  // ... fetch logic ...
  
  // Deduplicate by ID
  const seenIds = new Set(generations.map(g => g.id));
  const newItems = data.items.filter(item => !seenIds.has(item.id));
  
  setGenerations(prev => [...prev, ...newItems]);
}, [generations]);
```

**What This Does:**
- Prevents duplicate generations from being added to the frontend list
- Uses generation ID as the unique identifier

### Fix #3: Public Feed Deduplication

**Location:** `api-gateway-services-wildmind/src/repository/publicGenerationsRepository.ts`

**Implementation:**
```typescript
// Lines 276-297: Deduplicate during mapping
const highScoredSeenIds = new Set<string>();
const highScoredItemsWithData = snapHigh.docs
  .map(d => {
    const docId = String(d.id);
    if (highScoredSeenIds.has(docId)) {
      return null;  // Skip duplicates
    }
    highScoredSeenIds.add(docId);
    // ... normalize ...
  })
  .filter(item => item !== null);

// Lines 551-570: Final deduplication before returning
const seenIds = new Set<string>();
let items: GenerationHistoryItem[] = [];
for (const { item } of allItemsWithData) {
  const itemId = String(item.id || '');
  if (!itemId || seenIds.has(itemId)) continue;
  seenIds.add(itemId);
  items.push(item);
}
```

**What This Does:**
- Prevents duplicate generations from appearing in the public feed
- Ensures each generation ID appears only once

---

## What Needs to Be Done Correctly

### ✅ Already Fixed: Read-Time Deduplication

The current fixes handle duplicates at **read time** (when fetching data). This is a **defensive approach** that ensures duplicates don't appear in the UI, but it doesn't fix the root cause in the database.

### ⚠️ Still Needed: Write-Time Prevention

To **prevent duplicates from being created in the first place**, we need to fix the write operations:

#### 1. Fix Mirror Repository Sync

**File:** `api-gateway-services-wildmind/src/repository/generationsMirrorRepository.ts`

**Current Code (Line 76-83):**
```typescript
await ref.set({
  ...historyDoc,
  createdBy,
  uid,
  id: historyId,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  ...(historyDoc.createdAt ? { createdAt: historyDoc.createdAt } : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
}, { merge: true });
```

**Recommended Fix:**
```typescript
// Deduplicate images before syncing
const deduplicatedHistoryDoc = {
  ...historyDoc,
  images: deduplicateImages(historyDoc.images || []),
  videos: deduplicateVideos(historyDoc.videos || []),
};

await ref.set({
  ...deduplicatedHistoryDoc,
  createdBy,
  uid,
  id: historyId,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  ...(deduplicatedHistoryDoc.createdAt ? { createdAt: deduplicatedHistoryDoc.createdAt } : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
}, { merge: true });
```

**Helper Functions Needed:**
```typescript
function deduplicateImages(images: any[]): any[] {
  if (!Array.isArray(images) || images.length === 0) return [];
  
  const imageMap = new Map<string, any>();
  for (const img of images) {
    if (!img) continue;
    const key = img.id ? `id:${String(img.id)}` : `url:${extractBaseUrl(img.url || img.avifUrl || img.thumbnailUrl || '')}`;
    if (!key || key === 'url:') continue;
    
    const existing = imageMap.get(key);
    if (!existing) {
      imageMap.set(key, img);
    } else {
      // Keep the one with more optimized fields
      const existingScore = countOptimizedFields(existing);
      const newScore = countOptimizedFields(img);
      if (newScore > existingScore || (newScore === existingScore && img.avifUrl && !existing.avifUrl)) {
        imageMap.set(key, img);
      }
    }
  }
  return Array.from(imageMap.values());
}

function deduplicateVideos(videos: any[]): any[] {
  if (!Array.isArray(videos) || videos.length === 0) return [];
  const videoMap = new Map<string, any>();
  for (const vid of videos) {
    if (!vid) continue;
    const key = vid.id || vid.url || vid.thumbUrl || vid.thumbnailUrl || '';
    if (!key || videoMap.has(key)) continue;
    videoMap.set(key, vid);
  }
  return Array.from(videoMap.values());
}

function extractBaseUrl(url: string): string {
  if (!url) return '';
  return String(url).replace(/[._](optimized|avif|jpeg|jpg|png|webp|thumb)(\?.*)?$/i, '');
}

function countOptimizedFields(item: any): number {
  let count = 0;
  if (item?.avifUrl) count += 3;
  if (item?.thumbnailUrl) count += 2;
  if (item?.thumbUrl) count += 1;
  if (item?.blurDataUrl) count += 1;
  if (item?.optimized === true) count += 1;
  return count;
}
```

#### 2. Fix Admin Score Update

**File:** `admin-panel/packages/admin-backend/src/controllers/generationsController.ts`

**Current Code (Line 343-509):**
```typescript
// updateAestheticScore function updates images array
const updatedImages = images.map((img: any, index: number) => {
  if (index === 0 || !img.aestheticScore) {
    return { ...img, aestheticScore: scoreNum };
  }
  return img;
});
```

**Recommended Fix:**
```typescript
// Deduplicate images before updating
const deduplicatedImages = deduplicateImages(images);
const updatedImages = deduplicatedImages.map((img: any, index: number) => {
  if (index === 0 || !img.aestheticScore) {
    return { ...img, aestheticScore: scoreNum };
  }
  return img;
});
```

#### 3. Fix Image Optimization Process

**File:** `api-gateway-services-wildmind/src/services/generationHistoryService.ts`

**Current Code (Line 78-110):**
```typescript
const baseImages = Array.isArray(rawImages) ? rawImages.map((im: any, index: number) => {
  // ... normalization logic ...
}) : [];
```

**Recommended Fix:**
```typescript
// Deduplicate images after normalization
const normalizedImages = Array.isArray(rawImages) ? rawImages.map((im: any, index: number) => {
  // ... normalization logic ...
}) : [];
const baseImages = deduplicateImages(normalizedImages);
```

#### 4. Fix Provider Services

**Files:**
- `api-gateway-services-wildmind/src/services/minimaxService.ts`
- `api-gateway-services-wildmind/src/services/replicateService.ts`
- `api-gateway-services-wildmind/src/services/runwayService.ts`
- `api-gateway-services-wildmind/src/services/bflService.ts`
- `api-gateway-services-wildmind/src/services/falService.ts`

**Recommended Fix:**
After scoring images, deduplicate before updating:
```typescript
const scoredImages = await aestheticScoreService.scoreImages(storedImages);
const deduplicatedScoredImages = deduplicateImages(scoredImages);
const highestScore = aestheticScoreService.getHighestScore(deduplicatedScoredImages);

await generationHistoryRepository.update(uid, historyId, {
  status: 'completed',
  images: deduplicatedScoredImages,  // Use deduplicated array
  aestheticScore: highestScore,
});
```

### 🔧 Migration Script (Optional)

To clean up existing duplicates in the database:

**File:** `api-gateway-services-wildmind/scripts/deduplicateImages.ts` (new file)

```typescript
import { adminDb } from '../src/config/firebaseAdmin';

async function deduplicateAllGenerations() {
  const snapshot = await adminDb.collection('generations').get();
  let processed = 0;
  let fixed = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const images = Array.isArray(data.images) ? data.images : [];
    const deduplicated = deduplicateImages(images);
    
    if (deduplicated.length !== images.length) {
      await doc.ref.update({ images: deduplicated });
      fixed++;
      console.log(`Fixed ${doc.id}: ${images.length} -> ${deduplicated.length} images`);
    }
    processed++;
    
    if (processed % 100 === 0) {
      console.log(`Processed ${processed} documents, fixed ${fixed}`);
    }
  }
  
  console.log(`✅ Complete: Processed ${processed}, Fixed ${fixed}`);
}

// Run migration
deduplicateAllGenerations().catch(console.error);
```

---

## Related Files

### API Gateway Service (Main Backend)

1. **`api-gateway-services-wildmind/src/repository/publicGenerationsRepository.ts`**
   - Public feed repository
   - Queries `generations` collection
   - **Status:** ✅ Has read-time deduplication

2. **`api-gateway-services-wildmind/src/repository/generationsMirrorRepository.ts`**
   - Syncs items from history to public mirror
   - **Status:** ⚠️ Needs write-time deduplication

3. **`api-gateway-services-wildmind/src/repository/generationHistoryRepository.ts`**
   - Source of truth for user generations
   - **Status:** ⚠️ Should deduplicate on updates

4. **`api-gateway-services-wildmind/src/services/generationHistoryService.ts`**
   - Handles generation completion and optimization
   - **Status:** ⚠️ Should deduplicate images before storing

5. **Provider Services:**
   - `api-gateway-services-wildmind/src/services/minimaxService.ts`
   - `api-gateway-services-wildmind/src/services/replicateService.ts`
   - `api-gateway-services-wildmind/src/services/runwayService.ts`
   - `api-gateway-services-wildmind/src/services/bflService.ts`
   - `api-gateway-services-wildmind/src/services/falService.ts`
   - **Status:** ⚠️ Should deduplicate images after scoring

### Admin Panel

1. **`admin-panel/packages/admin-backend/src/controllers/generationsController.ts`**
   - Admin endpoints for scoring and management
   - **Status:** ✅ Has read-time deduplication, ⚠️ Needs write-time deduplication

2. **`admin-panel/packages/admin-frontend/src/pages/ArtStationScoringPage.tsx`**
   - Frontend for scoring ArtStation items
   - **Status:** ✅ Has frontend deduplication

3. **`admin-panel/packages/admin-frontend/src/pages/ArtStationManagementPage.tsx`**
   - Frontend for managing ArtStation items
   - **Status:** ✅ Has frontend deduplication

---

## Summary

### Current State
- ✅ **Read-time deduplication** is implemented in all read paths (admin panel, public feed)
- ✅ Duplicates are filtered out when displaying data
- ⚠️ **Write-time deduplication** is NOT implemented
- ⚠️ Duplicates still exist in the database

### Recommended Actions

1. **Immediate (Defensive):** ✅ Already done - Read-time deduplication prevents UI issues
2. **Short-term (Preventive):** Implement write-time deduplication in:
   - `generationsMirrorRepository.upsertFromHistory()`
   - `generationsMirrorRepository.updateFromHistory()`
   - `generationsController.updateAestheticScore()`
   - `generationHistoryService.markGenerationCompleted()`
   - All provider services (after scoring)
3. **Long-term (Cleanup):** Run migration script to clean existing duplicates

### Priority

- **High:** Fix mirror repository sync (prevents new duplicates)
- **Medium:** Fix admin score updates (prevents duplicates during scoring)
- **Low:** Migration script (cleans existing duplicates, but read-time deduplication already handles them)

---

## Conclusion

The duplicate issue is caused by Firestore merge operations preserving duplicate image entries in arrays. The current fixes handle this defensively at read time, ensuring duplicates don't appear in the UI. However, to fully resolve the issue, we should implement write-time deduplication to prevent duplicates from being created in the first place.

The recommended approach is to:
1. ✅ Keep read-time deduplication (already implemented)
2. ⚠️ Add write-time deduplication to all write operations
3. 🔧 Optionally run a migration to clean existing duplicates

This ensures both **defensive** (read-time) and **preventive** (write-time) measures are in place.

