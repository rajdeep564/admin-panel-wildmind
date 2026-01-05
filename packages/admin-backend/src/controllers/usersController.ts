import { Response } from 'express';
import { adminDb, admin } from '../config/firebaseAdmin';
import { AdminRequest } from '../middleware/authMiddleware';

/**
 * Get all users sorted by lastLoginAt descending (newer logged in users first)
 * GET /users
 */
export async function getUsers(req: AdminRequest, res: Response) {
  try {
    const {
      limit = 50,
      cursor,
      search,
      email,
      isActive,
      filterType = 'all', // 'all', 'newer', 'older', 'alphabetical', 'date', 'maxGenerations'
      filterDate, // ISO date string for date filter
      maxGenerations, // Maximum number of generations for maxGenerations filter
    } = req.query;

    const requestedLimit = parseInt(limit as string, 10);
    // Remove limit to fetch all users - we'll paginate in memory if needed
    const fetchLimit = 10000; // Very high limit to fetch all users

    // Build base query based on filter type
    let query: any;
    let countQuery: any; // Separate query for counting
    let snapshot: any;
    const filterTypeStr = String(filterType).toLowerCase();

    try {
      if (filterTypeStr === 'date' && filterDate) {
        // Filter by specific date (createdAt on that date)
        // NOTE: createdAt is stored as ISO string, not Firestore Timestamp
        // So we need to fetch all users and filter in memory by date
        const filterDateStr = filterDate as string;
        
        // Parse the date string "YYYY-MM-DD"
        const dateParts = filterDateStr.split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
          const day = parseInt(dateParts[2], 10);
          
          // Create date range for the entire day (in local timezone, then convert to ISO)
          const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
          const endOfDay = new Date(year, month, day, 23, 59, 59, 999);
          
          // Get ISO strings for comparison (since createdAt is stored as ISO string)
          const startISO = startOfDay.toISOString();
          const endISO = endOfDay.toISOString();
          
          // Also create date-only strings for comparison (YYYY-MM-DD format)
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          console.log(`[Date Filter] Filtering users created on ${dateStr} (ISO range: ${startISO} to ${endISO})`);

          // Fetch all users - we'll filter by date in memory since createdAt is a string
          query = adminDb.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(fetchLimit);

          // Count query - fetch all, filter in memory
          countQuery = adminDb.collection('users');
        } else {
          throw new Error('Invalid date format. Expected YYYY-MM-DD');
        }
      } else if (filterTypeStr === 'newer') {
        // Newer users - order by createdAt descending
        query = adminDb.collection('users')
          .orderBy('createdAt', 'desc')
          .limit(fetchLimit);
        // Count query - all users (no filter)
        countQuery = adminDb.collection('users');
      } else if (filterTypeStr === 'older') {
        // Older users - order by createdAt ascending
        query = adminDb.collection('users')
          .orderBy('createdAt', 'asc')
          .limit(fetchLimit);
        // Count query - all users (no filter)
        countQuery = adminDb.collection('users');
      } else if (filterTypeStr === 'alphabetical') {
        // Alphabetical by username - we'll fetch and sort in memory
        query = adminDb.collection('users')
          .orderBy('createdAt', 'desc') // Use createdAt as base order, then sort by username in memory
          .limit(fetchLimit);
        // Count query - all users (no filter)
        countQuery = adminDb.collection('users');
      } else {
        // Default: 'all' - order by lastLoginAt descending (newer logged in first)
        try {
          query = adminDb.collection('users')
            .orderBy('lastLoginAt', 'desc')
            .limit(fetchLimit);
        } catch (error: any) {
          // Fallback to createdAt if lastLoginAt index doesn't exist
          console.warn('Failed to order by lastLoginAt, falling back to createdAt:', error.message);
          query = adminDb.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(fetchLimit);
        }
        // Count query - all users (no filter)
        countQuery = adminDb.collection('users');
      }

      // Handle pagination cursor
      if (cursor) {
        const cursorDoc = await adminDb.collection('users').doc(cursor as string).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      snapshot = await query.get();
    } catch (error: any) {
      // Fallback to basic query if specific ordering fails
      console.warn('Query failed, using fallback:', error.message);
      query = adminDb.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(fetchLimit);
      countQuery = adminDb.collection('users');

      if (cursor) {
        const cursorDoc = await adminDb.collection('users').doc(cursor as string).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      snapshot = await query.get();
    }

    // Get total count - only on first page (no cursor) to avoid performance issues
    let totalCount = 0;
    if (!cursor && countQuery) {
      try {
        // Get count from database query
        const countSnapshot = await countQuery.get();
        totalCount = countSnapshot.size;
      } catch (countError: any) {
        console.warn('Failed to get total count:', countError.message);
        // Fallback: use snapshot size as estimate
        totalCount = snapshot.size;
      }
    } else if (!cursor) {
      // If no countQuery was set, use snapshot size as estimate
      totalCount = snapshot.size;
    }

    // Normalize user data
    let users = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      const id = doc.id;

      const normalized: any = {
        uid: String(id),
        id: String(id), // Also include id for consistency
        ...data,
      };

      // Normalize timestamps
      if (data.createdAt) {
        if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
          normalized.createdAt = data.createdAt.toDate();
        } else if (data.createdAt.seconds) {
          normalized.createdAt = new Date(data.createdAt.seconds * 1000);
        } else {
          normalized.createdAt = data.createdAt;
        }
      }

      if (data.lastLoginAt) {
        if (data.lastLoginAt.toDate && typeof data.lastLoginAt.toDate === 'function') {
          normalized.lastLoginAt = data.lastLoginAt.toDate();
        } else if (data.lastLoginAt.seconds) {
          normalized.lastLoginAt = new Date(data.lastLoginAt.seconds * 1000);
        } else {
          normalized.lastLoginAt = data.lastLoginAt;
        }
      }

      if (data.updatedAt) {
        if (data.updatedAt.toDate && typeof data.updatedAt.toDate === 'function') {
          normalized.updatedAt = data.updatedAt.toDate();
        } else if (data.updatedAt.seconds) {
          normalized.updatedAt = new Date(data.updatedAt.seconds * 1000);
        } else {
          normalized.updatedAt = data.updatedAt;
        }
      }

      return normalized;
    });

    // In-memory filtering
    // Date filter (must be done first, before other filters)
    if (filterTypeStr === 'date' && filterDate) {
      const filterDateStr = filterDate as string;
      const dateParts = filterDateStr.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const day = parseInt(dateParts[2], 10);
        
        // Create date range for comparison (use local timezone)
        const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month, day, 23, 59, 59, 999);
        
        // Also create UTC range for comparison
        const startOfDayUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endOfDayUTC = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        
        // Extract date string for string comparison (YYYY-MM-DD format)
        const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        users = users.filter((user: any) => {
          if (!user.createdAt) return false;
          
          // Handle different createdAt formats
          let userDate: Date | null = null;
          let userDateStr: string | null = null;
          
          // If it's already a Date object
          if (user.createdAt instanceof Date) {
            userDate = user.createdAt;
            if (userDate && !isNaN(userDate.getTime())) {
              userDateStr = userDate.toISOString().split('T')[0];
            }
          }
          // If it's an ISO string
          else if (typeof user.createdAt === 'string') {
            userDate = new Date(user.createdAt);
            // Extract date part from ISO string (YYYY-MM-DD)
            userDateStr = user.createdAt.split('T')[0];
          }
          // If it's a Firestore Timestamp
          else if (user.createdAt.toDate && typeof user.createdAt.toDate === 'function') {
            userDate = user.createdAt.toDate();
            if (userDate && !isNaN(userDate.getTime())) {
              userDateStr = userDate.toISOString().split('T')[0];
            }
          }
          // If it has seconds property
          else if (user.createdAt.seconds) {
            userDate = new Date(user.createdAt.seconds * 1000);
            if (userDate && !isNaN(userDate.getTime())) {
              userDateStr = userDate.toISOString().split('T')[0];
            }
          }
          
          // First try string comparison (most reliable for ISO strings)
          if (userDateStr && userDateStr === targetDateStr) {
            return true;
          }
          
          // Fallback to date range comparison
          if (userDate && !isNaN(userDate.getTime())) {
            // Check if the date falls within the selected day (try both local and UTC)
            const inLocalRange = userDate >= startOfDay && userDate <= endOfDay;
            const inUTCRange = userDate >= startOfDayUTC && userDate <= endOfDayUTC;
            return inLocalRange || inUTCRange;
          }
          
          return false;
        });
        
        console.log(`[Date Filter] Found ${users.length} users created on ${filterDateStr} (target: ${targetDateStr})`);
      }
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchLower = search.toLowerCase().trim();
      users = users.filter((user: any) => {
        const emailMatch = (user.email || '').toLowerCase().includes(searchLower);
        const usernameMatch = (user.username || '').toLowerCase().includes(searchLower);
        const displayNameMatch = (user.displayName || '').toLowerCase().includes(searchLower);
        return emailMatch || usernameMatch || displayNameMatch;
      });
    }

    if (email && typeof email === 'string') {
      users = users.filter((user: any) => 
        (user.email || '').toLowerCase() === email.toLowerCase()
      );
    }

    if (isActive !== undefined) {
      const active = isActive === 'true' || isActive === true;
      users = users.filter((user: any) => user.isActive === active);
    }

    // Calculate totalGenerations for all users when filterType is 'maxGenerations'
    if (filterTypeStr === 'maxGenerations') {
      try {
        // Fetch all generations and group by createdBy.uid to count per user
        const generationsSnapshot = await adminDb.collection('generations').get();
        
        // Count generations per user
        const generationCounts = new Map<string, number>();
        generationsSnapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          if (data.createdBy && data.createdBy.uid) {
            const uid = String(data.createdBy.uid);
            generationCounts.set(uid, (generationCounts.get(uid) || 0) + 1);
          }
        });

        // Add generation count to ALL users first
        users = users.map((user: any) => {
          const genCount = generationCounts.get(user.uid) || 0;
          return {
            ...user,
            totalGenerations: genCount,
          };
        });

        // CRITICAL: Sort by totalGenerations DESCENDING (MAXIMUM/MOST at top, then lesser)
        // This ensures users with highest total generations appear FIRST
        users.sort((a: any, b: any) => {
          const aCount = Number(a.totalGenerations) || 0;
          const bCount = Number(b.totalGenerations) || 0;
          
          // Primary sort: totalGenerations DESCENDING (highest/maximum first)
          // bCount - aCount means: if bCount > aCount, return positive (b comes first)
          // This puts users with MORE generations at the TOP
          if (bCount > aCount) {
            return 1; // b has more, b comes first
          }
          if (aCount > bCount) {
            return -1; // a has more, a comes first
          }
          
          // Secondary sort: by createdAt descending (newer first) for users with same generation count
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime; // Newer first
        });

        // Filter by maxGenerations if provided (AFTER sorting, so filtered results remain sorted by highest first)
        if (maxGenerations) {
          const maxGenCount = parseInt(String(maxGenerations), 10);
          if (!isNaN(maxGenCount) && maxGenCount >= 0) {
            users = users.filter((user: any) => {
              const genCount = Number(user.totalGenerations) || 0;
              return genCount <= maxGenCount;
            });
            console.log(`[MaxGenerations Filter] Filtered to ${users.length} users with ${maxGenCount} or fewer generations, sorted by HIGHEST FIRST`);
          }
        } else {
          console.log(`[MaxGenerations Filter] Showing all ${users.length} users sorted by total generations (HIGHEST/MAXIMUM FIRST, then lesser)`);
        }
      } catch (genError: any) {
        console.warn('Error calculating totalGenerations:', genError.message);
        // Continue without filtering if there's an error, but still add 0 for totalGenerations and sort
        users = users.map((user: any) => ({
          ...user,
          totalGenerations: 0,
        }));
        // Even on error, sort by totalGenerations (all will be 0, but ensures consistency)
        users.sort((a: any, b: any) => {
          const aCount = Number(a.totalGenerations) || 0;
          const bCount = Number(b.totalGenerations) || 0;
          return bCount - aCount; // Descending
        });
      }
    }

    // Apply sorting based on filter type
    if (filterTypeStr === 'alphabetical') {
      // Sort alphabetically by username
      users.sort((a: any, b: any) => {
        const aUsername = (a.username || a.displayName || a.email || '').toLowerCase();
        const bUsername = (b.username || b.displayName || b.email || '').toLowerCase();
        return aUsername.localeCompare(bUsername);
      });
    } else if (filterTypeStr === 'newer') {
      // Sort by createdAt descending (newer first)
      users.sort((a: any, b: any) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime; // Descending
      });
    } else if (filterTypeStr === 'older') {
      // Sort by createdAt ascending (older first)
      users.sort((a: any, b: any) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime; // Ascending
      });
    } else if (filterTypeStr === 'date') {
      // Already filtered by date in query, sort by createdAt descending
      users.sort((a: any, b: any) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime; // Descending
      });
    } else if (filterTypeStr === 'maxGenerations') {
      // Already sorted above when calculating totalGenerations
      // No need to sort again here - sorting happens immediately after calculation
      // This ensures highest totalGenerations appear first
    } else {
      // Default: 'all' - Sort by lastLoginAt descending (handle nulls - put them at the end)
      users.sort((a: any, b: any) => {
        const aTime = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const bTime = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
        return bTime - aTime; // Descending
      });
    }

    // Calculate total filtered count
    // For date filter, use the filtered array length (since we filter in memory)
    // For other filters, use database count
    let totalFiltered = totalCount;
    
    if (filterTypeStr === 'date' && filterDate) {
      // Date filter is done in memory, so use filtered array length
      totalFiltered = users.length;
    } else if (filterTypeStr === 'maxGenerations' && maxGenerations) {
      // MaxGenerations filter is done in memory, so use filtered array length
      totalFiltered = users.length;
    } else if (search && typeof search === 'string' && search.trim().length > 0) {
      // When search is applied, we need to count filtered results
      if (!cursor && totalCount > 0) {
        try {
          // Fetch all users to count filtered results
          const allUsersQuery = countQuery || adminDb.collection('users');
          const allUsersSnapshot = await allUsersQuery.get();
          
          const searchLower = search.toLowerCase().trim();
          const filteredCount = allUsersSnapshot.docs.filter((doc: any) => {
            const data = doc.data();
            const emailMatch = (data.email || '').toLowerCase().includes(searchLower);
            const usernameMatch = (data.username || '').toLowerCase().includes(searchLower);
            const displayNameMatch = (data.displayName || '').toLowerCase().includes(searchLower);
            return emailMatch || usernameMatch || displayNameMatch;
          }).length;
          
          totalFiltered = filteredCount;
        } catch (searchCountError: any) {
          console.warn('Failed to get search-filtered count:', searchCountError.message);
          // Fallback: use the filtered array length as approximation
          totalFiltered = users.length;
        }
      } else {
        // On subsequent pages, use filtered array length as approximation
        totalFiltered = users.length;
      }
    } else {
      // No search or date filter - use database count
      totalFiltered = totalCount;
    }

    // Don't limit results - return all filtered users
    // The frontend will handle pagination if needed
    const limitedUsers = users; // Return all users, no limit

    // Since we're returning all users, there's no pagination needed
    const hasMore = false; // No more pages since we return all
    const nextCursor = null; // No cursor needed

    return res.json({
      success: true,
      data: {
        users: limitedUsers,
        nextCursor,
        hasMore,
        total: totalFiltered, // Total count after filtering
        displayed: limitedUsers.length, // Number of users displayed in this page
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * Get total user count (for real-time updates)
 * GET /users/count
 */
export async function getUserCount(req: AdminRequest, res: Response) {
  try {
    const snapshot = await adminDb.collection('users').get();
    const totalCount = snapshot.size;

    return res.json({
      success: true,
      data: {
        total: totalCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching user count:', error);
    return res.status(500).json({ error: 'Failed to fetch user count' });
  }
}

/**
 * Get a specific user by UID with all details
 * GET /users/:userId
 */
export async function getUserById(req: AdminRequest, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const data = userDoc.data();
    if (!data) {
      return res.status(404).json({ error: 'User data not found' });
    }

    // Normalize user data
    const normalized: any = {
      uid: String(userDoc.id),
      id: String(userDoc.id),
      ...data,
    };

    // Normalize timestamps
    if (data.createdAt) {
      if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
        normalized.createdAt = data.createdAt.toDate();
      } else if (data.createdAt.seconds) {
        normalized.createdAt = new Date(data.createdAt.seconds * 1000);
      }
    }

    if (data.lastLoginAt) {
      if (data.lastLoginAt.toDate && typeof data.lastLoginAt.toDate === 'function') {
        normalized.lastLoginAt = data.lastLoginAt.toDate();
      } else if (data.lastLoginAt.seconds) {
        normalized.lastLoginAt = new Date(data.lastLoginAt.seconds * 1000);
      }
    }

    if (data.updatedAt) {
      if (data.updatedAt.toDate && typeof data.updatedAt.toDate === 'function') {
        normalized.updatedAt = data.updatedAt.toDate();
      } else if (data.updatedAt.seconds) {
        normalized.updatedAt = new Date(data.updatedAt.seconds * 1000);
      }
    }

    // Get user's generation count if available
    try {
      const generationsSnapshot = await adminDb.collection('generations')
        .where('createdBy.uid', '==', userId)
        .limit(1)
        .get();
      
      // Get total count (this is approximate, Firestore doesn't have count queries without indexes)
      const allGenerations = await adminDb.collection('generations')
        .where('createdBy.uid', '==', userId)
        .get();
      
      normalized.totalGenerations = allGenerations.size;
    } catch (err) {
      console.warn('Could not fetch generation count:', err);
      normalized.totalGenerations = 0;
    }

    return res.json({
      success: true,
      data: {
        user: normalized,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}


/**
 * Get generations for a specific user with pagination
 * GET /users/:userId/generations
 */
export async function getUserGenerations(req: AdminRequest, res: Response) {
  try {
    const { userId } = req.params;
    const { cursor, limit = 20, type, sort = 'newest' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const fetchLimit = parseInt(limit as string, 10) || 20;
    
    let query = adminDb.collection('generations')
      .where('createdBy.uid', '==', userId);

    // Apply type filter if provided
    if (type && typeof type === 'string' && type !== 'all') {
      // Handle simple mapping like 'image' -> 'text-to-image', 'image-generation', etc if needed
      // For now, assuming direct match or broad check could be complex without 'in' query limitations
      // Let's stick to simple ordering for now, usually user wants to see everything
      // If strict type needed:
      // query = query.where('generationType', '==', type); 
      // But let's leave flexible for now unless requested
    }
    
    // Sort
    if (sort === 'oldest') {
      query = query.orderBy('createdAt', 'asc');
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    // Cursor
    if (cursor) {
      const cursorDoc = await adminDb.collection('generations').doc(cursor as string).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.limit(fetchLimit).get();
    
    const generations = snapshot.docs.map(doc => {
      const data = doc.data();
      // Basic normalization
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || null),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || null),
        // Ensure default arrays
        images: Array.isArray(data.images) ? data.images : [],
        videos: Array.isArray(data.videos) ? data.videos : [],
        audios: Array.isArray(data.audios) ? data.audios : [],
      };
    });

    const hasMore = generations.length === fetchLimit;
    const nextCursor = hasMore && generations.length > 0 ? generations[generations.length - 1].id : null;

    return res.json({
      success: true,
      data: {
        generations,
        nextCursor,
        hasMore,
      },
    });

  } catch (error) {
    console.error('Error fetching user generations:', error);
    return res.status(500).json({ error: 'Failed to fetch user generations' });
  }
}
