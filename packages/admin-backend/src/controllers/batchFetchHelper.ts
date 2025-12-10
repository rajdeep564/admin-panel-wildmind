import { adminDb } from '../config/firebaseAdmin';

/**
 * Batch fetch generations with filters - keeps fetching until we have enough results
 * This helper ensures ALL matching items are returned, not just first N batches
 */
export async function batchFetchAndFilterGenerations(params: {
  filterByUid: string | null;
  requestedLimit: number;
  cursor: string | null;
  filters: {
    generationType?: any;
    model?: any;
    status?: any;
    dateStart?: any;
    dateEnd?: any;
    minScore?: any;
    maxScore?: any;
    unscoredOnly?: any;
    search?: any;
  };
}): Promise<{ items: any[]; hasMore: boolean }> {
  const BATCH_SIZE = 200;
  const TARGET_COUNT = params.requestedLimit + 1;
  const MAX_BATCHES = 100; // Safety: max 20K items
  
  let allItems: any[] = [];
  let lastDoc: any = null;
  let batchCount = 0;
  
  // Handle pagination cursor
  if (params.cursor) {
    try {
      const cursorDoc = await adminDb.collection('generations').doc(params.cursor).get();
      if (cursorDoc.exists) lastDoc = cursorDoc;
    } catch (e) {
      console.warn('[batchFetch] Invalid cursor');
    }
  }
  
  while (batchCount < MAX_BATCHES) {
    // Build query
    let query: any = adminDb.collection('generations');
    if (params.filterByUid) {
      query = query.where('createdBy.uid', '==', params.filterByUid);
    }
    query = query.orderBy('createdAt', 'desc').limit(BATCH_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);
    
    const snapshot = await query.get();
    if (snapshot.empty) break;
    
    // Normalize items
    const batchItems = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      const normalized: any = { id: doc.id, ...data };
      
      // Normalize timestamps
      if (data.createdAt?.toDate) normalized.createdAt = data.createdAt.toDate();
      else if (data.createdAt?.seconds) normalized.createdAt = new Date(data.createdAt.seconds * 1000);
      
      if (data.updatedAt?.toDate) normalized.updatedAt = data.updatedAt.toDate();
      else if (data.updatedAt?.seconds) normalized.updatedAt = new Date(data.updatedAt.seconds * 1000);
      
      // Normalize arrays
      normalized.images = Array.isArray(data.images) ? data.images : [];
      normalized.videos = Array.isArray(data.videos) ? data.videos : [];
      normalized.audios = Array.isArray(data.audios) ? data.audios : [];
      
      // Normalize createdBy
      if (data.createdBy) {
        normalized.createdBy = {
          uid: String(data.createdBy.uid || ''),
          email: data.createdBy.email || undefined,
          username: data.createdBy.username || undefined,
          photoURL: data.createdBy.photoURL || undefined,
        };
      }
      
      return normalized;
    });
    
    allItems.push(...batchItems);
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    batchCount++;
    
    // Apply filters to check if we have enough
    let filtered = allItems.filter((item: any) => {
      // Type filter
      if (params.filters.generationType) {
        const types = Array.isArray(params.filters.generationType) ? params.filters.generationType : [params.filters.generationType];
        const typeSet = new Set(types.map((t: string) => String(t).toLowerCase()));
        if (!typeSet.has((item.generationType || '').toLowerCase())) return false;
      }
      
      // Model filter
      if (params.filters.model && (item.model || '').toLowerCase() !== String(params.filters.model).toLowerCase()) return false;
      
      // Status filter
      if (params.filters.status && (item.status || '').toLowerCase() !== String(params.filters.status).toLowerCase()) return false;
      
      // Date filter
      if (params.filters.dateStart || params.filters.dateEnd) {
        const itemDate = item.createdAt ? new Date(item.createdAt) : null;
        if (!itemDate || isNaN(itemDate.getTime())) return false;
        if (params.filters.dateStart && itemDate < new Date(params.filters.dateStart)) return false;
        if (params.filters.dateEnd && itemDate > new Date(params.filters.dateEnd)) return false;
      }
      
      // Score filter
      if (params.filters.minScore !== undefined || params.filters.maxScore !== undefined) {
        const score = typeof item.aestheticScore === 'number' ? item.aestheticScore : null;
        if (score === null) return false;
        const min = params.filters.minScore !== undefined ? parseFloat(params.filters.minScore) : -Infinity;
        const max = params.filters.maxScore !== undefined ? parseFloat(params.filters.maxScore) : Infinity;
        if (score < min || score > max) return false;
      }
      
      // Unscored filter
      if (params.filters.unscoredOnly === 'true' || params.filters.unscoredOnly === true) {
        if (item.aestheticScore !== undefined && item.aestheticScore !== null) return false;
      }
      
      // Search filter
      if (params.filters.search) {
        const searchLower = String(params.filters.search).toLowerCase();
        if (!(item.prompt || '').toLowerCase().includes(searchLower)) return false;
      }
      
      return true;
    });
    
    // Stop if we have enough filtered items
    if (filtered.length >= TARGET_COUNT) {
      return { items: filtered, hasMore: filtered.length > params.requestedLimit };
    }
    
    // Stop if batch was smaller than BATCH_SIZE (end of DB)
    if (snapshot.docs.length < BATCH_SIZE) {
      return { items: filtered, hasMore: false };
    }
  }
  
  return { items: allItems, hasMore: false };
}
