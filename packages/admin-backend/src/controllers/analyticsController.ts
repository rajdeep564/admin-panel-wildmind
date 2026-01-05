import { Request, Response } from 'express';
import { adminDb as db, admin } from '../config/firebaseAdmin';

// Helper to get start of day timestamp
const getStartOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};











// Helper to wait for potentially slow count queries
const getCount = async (collectionName: string, filterField?: string, filterValues?: string[]) => {
    try {
        let query: any = db.collection(collectionName);
        if (filterField && filterValues && filterValues.length > 0) {
            query = query.where(filterField, 'in', filterValues);
        }
        const snapshot = await query.count().get();
        return snapshot.data().count;
    } catch (e) {
        console.warn(`Failed to count ${collectionName}`, e);
        return 0;
    }
};

// Helper for counts with optional date filtering (for time range analytics)
const getCountWithDateFilter = async (
  collectionName: string,
  filterField: string | null,
  filterValues: string[] | null,
  startDate: Date | null
) => {
  try {
    let query: any = db.collection(collectionName);
    
    if (filterField && filterValues && filterValues.length > 0) {
      query = query.where(filterField, 'in', filterValues);
    }
    
    if (startDate) {
      query = query.where('createdAt', '>=', startDate.toISOString());
    }
    
    const snapshot = await query.count().get();
    return snapshot.data().count;
  } catch (e) {
    console.warn(`Failed to count ${collectionName} with date filter`, e);
    return 0;
  }
};

// Helper to get start date from range string
const getStartDateFromRange = (range: string): Date | null => {
  const now = new Date();
  switch (range) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
};

// Define generation type categories based on actual usage across all services
// Analyzed from: replicateService, falService, bflService, runwayService, reimagineService, canvas
const IMAGE_TYPES = [
  // Text-to-image
  'text-to-image',
  
  // Image-to-image and editing
  'image-to-image',
  'image-edit',
  'reimagine',
  'image-outpaint',
  'image-upscale',
  'image-to-svg',
  
  // Frontend UI types that map to image generation
  'logo',
  'logo-generation',
  'sticker-generation',
  'mockup-generation',
  'product-generation',
  'ad-generation',
  'edit-image',
  'text-to-character'
];

const VIDEO_TYPES = [
  // Text-to-video
  'text-to-video',
  
  // Image-to-video
  'image-to-video',
  
  // Video-to-video and editing
  'video-to-video',
  'video-upscale',
  'video-remove-bg',
  'edit-video'
];

const MUSIC_TYPES = [
  'text-to-music',
  'text-to-audio',
  'music-generation',
  'audio',
  'music',
  'sfx',
  'text-to-dialogue',
  'text-to-speech'
];

// Other types that don't fit image/video/music categories
const OTHER_TYPES = [
  'live-chat'
];


export const getAnalyticsStats = async (req: Request, res: Response) => {
  try {
    // 1. Users Stats (Total & New Today) - fetch all users to avoid index issues
    const allUsersSnapshot = await db.collection('users').get();
    const totalUsers = allUsersSnapshot.size;
    
    // Calculate new today using strict string matching (UTC Day)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let newUsersToday = 0;
    allUsersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      let createdDate: Date | null = null;
      let createdDateStr: string | null = null;
      
      if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
          createdDate = new Date(data.createdAt);
          createdDateStr = data.createdAt.split('T')[0];
        } else if (data.createdAt.toDate) {
          createdDate = data.createdAt.toDate();
        } else if (data.createdAt.seconds) {
          createdDate = new Date(data.createdAt.seconds * 1000);
        }
        
        // Fallback
        if (createdDate && !isNaN(createdDate.getTime())) {
           if (!createdDateStr) createdDateStr = createdDate.toISOString().split('T')[0];
        }
      }
      
      // Strict string comparison (UTC Day)
      const isMatch = createdDateStr && createdDateStr === todayStr;
      
      // LOG FIRST 5 USERS and ANY MATCHES or NEAR MISSES for debugging
      if (allUsersSnapshot.size < 500) { // Safety check
          // Log only recently created users to avoid spam
          if (createdDate && createdDate.getTime() > Date.now() - 48 * 60 * 60 * 1000) {
             console.log(`User Debug: ID=${doc.id}, CreatedAtRaw=${JSON.stringify(data.createdAt)}, ParsedStr=${createdDateStr}, TodayStr=${todayStr}, Match=${isMatch}`);
          }
      }

      if (isMatch) {
        newUsersToday++;
      }
    });

    console.log('User Stats (String Match):', { totalUsers, newUsersToday, todayStr });

    // 2. Total Generations - use sum of categorized types for consistency
    console.log('Fetching generation counts...');
    
    // Get breakdown counts
    const [imageGen, videoGen, musicGen] = await Promise.all([
      getCount('generations', 'generationType', IMAGE_TYPES),
      getCount('generations', 'generationType', VIDEO_TYPES),
      getCount('generations', 'generationType', MUSIC_TYPES) 
    ]);
    
    // Total is sum of categorized types (matches breakdown)
    const totalGenerations = imageGen + videoGen + musicGen;
    
    console.log('Generation Counts:', { imageGen, videoGen, musicGen, total: totalGenerations });
    // Users calculation done above
    
    console.log('Analytics stats - newUsersToday:', newUsersToday, 'totalUsers:', totalUsers);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalGenerations, 
        newUsersToday,
        generationBreakdown: {
            image: imageGen,
            video: videoGen,
            music: musicGen
        }
      }
    });

  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({ error: 'Failed to fetch analytics stats' });
  }
};

export const getGenerationsOverTime = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, days } = req.query;
    
    let start: Date;
    let end: Date = new Date(); // Default to now

    // Determine range
    if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
        if ((endDate as string).length === 10) {
            end.setHours(23, 59, 59, 999);
        }
    } else {
        const d = parseInt(days as string) || 7;
        start = new Date();
        start.setDate(start.getDate() - d);
        start = getStartOfDay(start);
    }
    
    const bucketDates: Date[] = [];
    const current = new Date(start); 
    current.setHours(0,0,0,0);
    
    while (current <= end) {
        bucketDates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    
    const chartData = await Promise.all(bucketDates.map(async (date) => {
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        const startIso = dayStart.toISOString();
        const endIso = dayEnd.toISOString();

        const [userCount, genCount] = await Promise.all([
             db.collection('users')
                .where('createdAt', '>=', startIso)
                .where('createdAt', '<', endIso)
                .count().get(),
                
             // Using 'generations' collection (no index required)
             db.collection('generations')
                .where('createdAt', '>=', startIso)
                .where('createdAt', '<', endIso)
                .count().get(),
        ]);

        return {
            date: dayStart.toISOString().split('T')[0], // YYYY-MM-DD
            users: userCount.data().count,
            generations: genCount.data().count
        };
    }));

    res.json({
      success: true,
      data: chartData
    });

  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline data' });
  }
};

export const getTopUsers = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        
        const snapshot = await db.collection('users')
            .orderBy('lastLoginAt', 'desc')
            .limit(limit)
            .get();
            
        const users = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                uid: doc.id,
                ...d,
                lastLoginAt: d.lastLoginAt?.toDate ? d.lastLoginAt.toDate() : d.lastLoginAt,
                totalGenerations: d.totalGenerations || 0
            };
        });
        
        res.json({
            success: true,
            data: users
        });
        
    } catch (error) {
        console.error('Error fetching top users:', error);
        res.status(500).json({ error: 'Failed to fetch top users' });
    }
};

export const getTopGenerators = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Using 'generations' collection (no index required)
        let query = db.collection('generations').select('uid', 'createdAt'); 

        // Apply Date Filters
        if (startDate && endDate) {
            const start = new Date(startDate as string);
            const end = new Date(endDate as string);
            if ((endDate as string).length === 10) {
                end.setHours(23, 59, 59, 999);
            }
            // Convert to ISO strings for consistent querying
            const startIso = start.toISOString();
            const endIso = end.toISOString();
            query = query.where('createdAt', '>=', startIso).where('createdAt', '<=', endIso);
        }

        const snapshot = await query.get();

        const userCounts: Record<string, number> = {};
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            // In items collection group, uid IS properly inside data generally, 
            // or we use parent path.
            // But let's check repo: yes, 'uid' is in data (line 87 genHistoryRepo).
            const uid = data.uid; // || (doc.ref.parent.parent ? doc.ref.parent.parent.id : null);
            
            if (uid) {
                userCounts[uid] = (userCounts[uid] || 0) + 1;
            }
        });

        // Sort by count descending
        const sortedUids = Object.entries(userCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10); // Top 10

        // Fetch user details for these UIDs
        // Note: 'in' query limit is 10, perfect for top 10.
        if (sortedUids.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const topUids = sortedUids.map(([uid]) => uid);
        const usersSnap = await db.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', topUids).get();
        
        const userMap = new Map();
        usersSnap.docs.forEach(doc => {
            userMap.set(doc.id, doc.data());
        });

        const users = sortedUids.map(([uid, count]) => {
            const userData = userMap.get(uid) || {};
            return {
                uid,
                username: userData.username || userData.displayName || 'Unknown',
                email: userData.email,
                totalGenerations: count, // The truthful count
                photoURL: userData.photoURL
            };
        });

        res.json({
            success: true,
            data: users
        });
    } catch (e: any) {
        console.warn('Error calculating top generators:', e.message);
        res.status(500).json({ success: false, error: e.message });
    }
}

export const getUserStats = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const [img, vid, mus] = await Promise.all([
            db.collection('generations').where('uid', '==', userId).where('generationType', 'in', IMAGE_TYPES).count().get(),
            db.collection('generations').where('uid', '==', userId).where('generationType', 'in', VIDEO_TYPES).count().get(),
            db.collection('generations').where('uid', '==', userId).where('generationType', 'in', MUSIC_TYPES).count().get(),
        ]);
        
        res.json({
            success: true,
            data: {
                total: img.data().count + vid.data().count + mus.data().count,
                images: img.data().count,
                videos: vid.data().count,
                music: mus.data().count
            }
        });
    } catch (error) {
         console.error('Error fetching user stats:', error);
         res.status(500).json({ error: 'Failed' });
    }
};

// ============ NEW ENDPOINTS FOR ENHANCED ANALYTICS ============

// Time-filtered generation breakdown
export const getGenerationBreakdown = async (req: Request, res: Response) => {
  try {
    const { range = 'all' } = req.query;
    
    let imageGen, videoGen, musicGen;
    
    // For 'all' time, use simple counts without date filtering to avoid index requirements
    if (range === 'all') {
      [imageGen, videoGen, musicGen] = await Promise.all([
        getCount('generations', 'generationType', IMAGE_TYPES),
        getCount('generations', 'generationType', VIDEO_TYPES),
        getCount('generations', 'generationType', MUSIC_TYPES)
      ]);
    } else {
      // For time ranges, we would need composite indexes
      // For now, return the 'all' time data with a note
      // TODO: Implement time-filtered breakdown with proper indexes
      [imageGen, videoGen, musicGen] = await Promise.all([
        getCount('generations', 'generationType', IMAGE_TYPES),
        getCount('generations', 'generationType', VIDEO_TYPES),
        getCount('generations', 'generationType', MUSIC_TYPES)
      ]);
    }
    
    const total = imageGen + videoGen + musicGen;
    
    res.json({
      success: true,
      data: {
        range: range === 'all' ? 'all' : 'all', // Currently only 'all' works without indexes
        breakdown: {
          image: imageGen,
          video: videoGen,
          music: musicGen
        },
        total
      }
    });
  } catch (error) {
    console.error('Error fetching breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch breakdown' });
  }
};

// Data audit endpoint for verification
export const getDataAudit = async (req: Request, res: Response) => {
  try {
    const [
      generationsTotal,
      usersSnapshot,
      imageCount,
      videoCount,
      musicCount
    ] = await Promise.all([
      db.collection('generations').count().get(),
      db.collection('users').select('totalGenerations').get(),
      db.collection('generations').where('generationType', 'in', IMAGE_TYPES).count().get(),
      db.collection('generations').where('generationType', 'in', VIDEO_TYPES).count().get(),
      db.collection('generations').where('generationType', 'in', MUSIC_TYPES).count().get()
    ]);
    
    const totalFromGenerations = generationsTotal.data().count;
    const totalFromBreakdown = imageCount.data().count + videoCount.data().count + musicCount.data().count;
    
    let userSum = 0;
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      userSum += data.totalGenerations || 0;
    });
    
    res.json({
      success: true,
      data: {
        totalGenerations: totalFromGenerations,
        breakdownSum: totalFromBreakdown,
        userGenerationsSum: userSum,
        isConsistent: totalFromGenerations === totalFromBreakdown,
        discrepancy: totalFromGenerations - totalFromBreakdown,
        details: {
          image: imageCount.data().count,
          video: videoCount.data().count,
          music: musicCount.data().count
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit data:', error);
    res.status(500).json({ error: 'Failed to fetch audit data' });
  }
};

// User growth analytics
export const getUserGrowth = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    // Use UTC date string for today comparison (matches how createdAt is likely stored/compared in usersController)
    const todayStr = now.toISOString().split('T')[0];
    
    // For week/month calculations, we still use timestamps/dates
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Fetch all users - createdAt is stored as ISO string, so we need to filter in memory
    const allUsersSnapshot = await db.collection('users').get();
    const totalUsers = allUsersSnapshot.size;
    
    let newToday = 0;
    let newThisWeek = 0;
    let newThisMonth = 0;
    let activeLastWeek = 0;
    
    allUsersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Handle createdAt - might be string or Timestamp
      let createdDate: Date | null = null;
      let createdDateStr: string | null = null;

      if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
          createdDate = new Date(data.createdAt);
          // Trust the string's date part if it's ISO
          createdDateStr = data.createdAt.split('T')[0];
        } else if (data.createdAt.toDate) {
          createdDate = data.createdAt.toDate();
        } else if (data.createdAt.seconds) {
          createdDate = new Date(data.createdAt.seconds * 1000);
        }

        // Fallback or override if date object exists
        if (createdDate && !isNaN(createdDate.getTime())) {
             if (!createdDateStr) createdDateStr = createdDate.toISOString().split('T')[0];
        }
      }
      
      // Count new users
      if (createdDate && !isNaN(createdDate.getTime())) {
        // Strict string comparison for "Today" (UTC Day match)
        if (createdDateStr === todayStr) {
          newToday++;
        }
        
        if (createdDate >= startOfWeek) {
          newThisWeek++;
        }
        if (createdDate >= startOfMonth) {
          newThisMonth++;
        }
      }
      
      // Handle lastLoginAt for active users
      let lastLoginDate: Date | null = null;
      if (data.lastLoginAt) {
        if (typeof data.lastLoginAt === 'string') {
          lastLoginDate = new Date(data.lastLoginAt);
        } else if (data.lastLoginAt.toDate) {
          lastLoginDate = data.lastLoginAt.toDate();
        } else if (data.lastLoginAt.seconds) {
          lastLoginDate = new Date(data.lastLoginAt.seconds * 1000);
        }
      }
      
      if (lastLoginDate && !isNaN(lastLoginDate.getTime()) && lastLoginDate >= startOfWeek) {
        activeLastWeek++;
      }
    });
    
    console.log('User growth calculated (String Match):', { todayStr, newToday, newThisWeek, newThisMonth, totalUsers });
    
    res.json({
      success: true,
      data: {
        newToday,
        newThisWeek,
        newThisMonth,
        activeLastWeek,
        totalUsers
      }
    });
  } catch (error) {
    console.error('Error fetching user growth:', error);
    res.status(500).json({ error: 'Failed to fetch user growth' });
  }
};

// Model performance metrics
export const getModelStats = async (req: Request, res: Response) => {
  try {
    const { range = 'all' } = req.query;
    const startDate = getStartDateFromRange(range as string);
    
    let query: any = db.collection('generations').select('model', 'status');
    if (startDate) {
      query = query.where('createdAt', '>=', startDate.toISOString());
    }
    
    const snapshot = await query.get();
    const modelCounts: Record<string, { total: number; failed: number }> = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const model = data.model || 'unknown';
      const status = (data.status || '').toString().toLowerCase();
      
      if (!modelCounts[model]) {
        modelCounts[model] = { total: 0, failed: 0 };
      }
      
      modelCounts[model].total++;
      
      // Check for failed status - handle various formats
      if (status === 'failed' || status === 'error' || status === 'cancelled' || status === 'canceled') {
        modelCounts[model].failed++;
      }
    });
    
    console.log('Model stats calculated:', Object.keys(modelCounts).length, 'models');
    
    const modelStats = Object.entries(modelCounts).map(([model, counts]) => ({
      model,
      total: counts.total,
      successful: counts.total - counts.failed,
      failed: counts.failed,
      successRate: counts.total > 0 ? ((counts.total - counts.failed) / counts.total * 100) : 0
    })).sort((a, b) => b.total - a.total);
    
    res.json({
      success: true,
      data: { range, models: modelStats }
    });
  } catch (error) {
    console.error('Error fetching model stats:', error);
    res.status(500).json({ error: 'Failed to fetch model stats' });
  }
};



