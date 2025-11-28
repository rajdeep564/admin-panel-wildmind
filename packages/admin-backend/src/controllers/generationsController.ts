import { Response } from 'express';
import { adminDb, admin } from '../config/firebaseAdmin';
import { AdminRequest } from '../middleware/authMiddleware';

export async function getGenerationsForScoring(req: AdminRequest, res: Response) {
  try {
    const {
      limit = 20,
      cursor,
      generationType,
      model,
      createdBy,
      dateStart,
      dateEnd,
      status,
      search,
      minScore,
      maxScore,
    } = req.query;

    // ============================================
    // INDEX-FREE APPROACH: Minimal base query + in-memory filtering
    // ============================================
    // Strategy: Use only equality filters (isPublic, isDeleted) + orderBy
    // This combination doesn't require composite indexes
    // All other filters (generationType, model, dates, scores, etc.) are applied in-memory
    
    const requestedLimit = parseInt(limit as string, 10);
    // Fetch more items than requested to account for in-memory filtering
    // This ensures we can return the requested number of items after filtering
    const fetchLimit = Math.max(requestedLimit * 3, 100); // Fetch 3x or min 100 items
    
    // Build minimal base query - only equality filters that don't need composite indexes
    let query: any = adminDb.collection('generations')
      .where('isPublic', '==', true)
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(fetchLimit);

    // Handle pagination cursor
    if (cursor) {
      const cursorDoc = await adminDb.collection('generations').doc(cursor as string).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    
    // Map documents to generation objects
    let generations = snapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure arrays are arrays
          images: Array.isArray(data.images) ? data.images : [],
          videos: Array.isArray(data.videos) ? data.videos : [],
          audios: Array.isArray(data.audios) ? data.audios : [],
          // Convert timestamps
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        };
      });

    // ============================================
    // IN-MEMORY FILTERING (No indexes required)
    // ============================================
    
    // Filter out deleted items (double-check)
    generations = generations.filter((gen: any) => {
      if (gen.isDeleted === true) return false;
      if (gen.isPublic === false || gen.visibility === 'private') return false;
      
      // Only include items that have at least one image or video
      const hasImages = gen.images && gen.images.length > 0;
      const hasVideos = gen.videos && gen.videos.length > 0;
      return hasImages || hasVideos;
    });

    // Apply generationType filter
    if (generationType) {
      const types = Array.isArray(generationType) 
        ? (generationType as string[]).map(s => String(s).toLowerCase())
        : [String(generationType).toLowerCase()];
      
      generations = generations.filter((gen: any) => {
        const genType = (gen.generationType || '').toLowerCase();
        return types.includes(genType);
      });
    }

    // Apply model filter
    if (model) {
      const modelStr = String(model).toLowerCase();
      generations = generations.filter((gen: any) => {
        const genModel = (gen.model || '').toLowerCase();
        return genModel === modelStr;
      });
    }

    // Apply user filter
    if (createdBy) {
      const uidStr = String(createdBy);
      generations = generations.filter((gen: any) => {
        return gen.createdBy?.uid === uidStr;
      });
    }

    // Apply status filter
    if (status) {
      const statusStr = String(status).toLowerCase();
      generations = generations.filter((gen: any) => {
        const genStatus = (gen.status || '').toLowerCase();
        return genStatus === statusStr;
      });
    }

    // Apply date range filter
    if (dateStart || dateEnd) {
      const startDate = dateStart ? new Date(dateStart as string) : null;
      const endDate = dateEnd ? new Date(dateEnd as string) : null;
      
      generations = generations.filter((gen: any) => {
        const genDate = gen.createdAt ? new Date(gen.createdAt) : null;
        if (!genDate || isNaN(genDate.getTime())) return false;
        
        if (startDate && genDate < startDate) return false;
        if (endDate && genDate > endDate) return false;
        return true;
      });
    }

    // Apply aesthetic score filter
    if (minScore !== undefined || maxScore !== undefined) {
      const min = minScore !== undefined ? parseFloat(minScore as string) : null;
      const max = maxScore !== undefined ? parseFloat(maxScore as string) : null;
      
      generations = generations.filter((gen: any) => {
        const score = typeof gen.aestheticScore === 'number' ? gen.aestheticScore : null;
        if (score === null) return false; // Exclude items without scores when filtering by score
        
        if (min !== null && score < min) return false;
        if (max !== null && score > max) return false;
        return true;
      });
    }

    // Apply search filter (prompt search)
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchLower = search.toLowerCase().trim();
      generations = generations.filter((gen: any) => {
        const prompt = (gen.prompt || '').toLowerCase();
        return prompt.includes(searchLower);
      });
    }

    // Limit results to requested amount
    const limitedGenerations = generations.slice(0, requestedLimit);
    
    // Determine if there are more items
    // If we got fewer items than requested after filtering, we've reached the end
    // OR if we got exactly the fetchLimit from DB, there might be more
    const hasMore = limitedGenerations.length === requestedLimit && 
                   (generations.length > requestedLimit || snapshot.docs.length === fetchLimit);
    
    const nextCursor = limitedGenerations.length > 0 && hasMore
      ? limitedGenerations[limitedGenerations.length - 1].id 
      : null;

    return res.json({
      success: true,
      data: {
        generations: limitedGenerations,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching generations:', error);
    return res.status(500).json({ error: 'Failed to fetch generations' });
  }
}

export async function updateAestheticScore(req: AdminRequest, res: Response) {
  try {
    const { generationId } = req.params;
    const { score } = req.body;

    if (!generationId) {
      return res.status(400).json({ error: 'Generation ID is required' });
    }

    if (score === undefined || score === null) {
      return res.status(400).json({ error: 'Score is required' });
    }

    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      return res.status(400).json({ error: 'Score must be a number between 0 and 10' });
    }

    // Only allow scores 9-10 for ArtStation
    if (scoreNum < 9 || scoreNum > 10) {
      return res.status(400).json({ error: 'ArtStation scores must be between 9 and 10' });
    }

    const generationRef = adminDb.collection('generations').doc(generationId);
    const generationDoc = await generationRef.get();

    if (!generationDoc.exists) {
      return res.status(404).json({ error: 'Generation not found' });
    }

    const generationData = generationDoc.data();
    if (!generationData) {
      return res.status(404).json({ error: 'Generation data not found' });
    }

    // Get old score for audit log
    const oldScore = generationData.aestheticScore !== undefined && generationData.aestheticScore !== null
      ? generationData.aestheticScore
      : null;

    // Update document-level aestheticScore (this is what ArtStation reads from)
    const updateData: any = {
      aestheticScore: scoreNum,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      scoreUpdatedBy: req.adminEmail || 'admin',
      scoreUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Also update individual image/video aestheticScore fields to match
    // This ensures consistency with how the system stores scores
    const images = Array.isArray(generationData.images) ? generationData.images : [];
    const videos = Array.isArray(generationData.videos) ? generationData.videos : [];
    
    // Update first image's aestheticScore if images exist
    if (images.length > 0) {
      const updatedImages = images.map((img: any, index: number) => {
        // Update the first image's score, or all images if they don't have scores
        if (index === 0 || !img.aestheticScore) {
          return {
            ...img,
            aestheticScore: scoreNum,
          };
        }
        return img;
      });
      updateData.images = updatedImages;
    }
    
    // Update first video's aestheticScore if videos exist (and no images)
    if (videos.length > 0 && images.length === 0) {
      const updatedVideos = videos.map((vid: any, index: number) => {
        // Update the first video's score, or all videos if they don't have scores
        if (index === 0 || !vid.aestheticScore) {
          return {
            ...vid,
            aestheticScore: scoreNum,
          };
        }
        return vid;
      });
      updateData.videos = updatedVideos;
    }

    // Update the generation document
    await generationRef.update(updateData);

    // Also update in user's generation history if it exists
    if (generationData.createdBy?.uid) {
      const historyRef = adminDb
        .collection('generationHistory')
        .doc(generationData.createdBy.uid)
        .collection('items')
        .doc(generationId);
      
      const historyDoc = await historyRef.get();
      if (historyDoc.exists) {
        const historyUpdateData: any = {
          aestheticScore: scoreNum,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Also update images/videos in history to match
        const historyData = historyDoc.data();
        if (historyData) {
          const historyImages = Array.isArray(historyData.images) ? historyData.images : [];
          const historyVideos = Array.isArray(historyData.videos) ? historyData.videos : [];
          
          if (historyImages.length > 0) {
            const updatedHistoryImages = historyImages.map((img: any, index: number) => {
              if (index === 0 || !img.aestheticScore) {
                return {
                  ...img,
                  aestheticScore: scoreNum,
                };
              }
              return img;
            });
            historyUpdateData.images = updatedHistoryImages;
          }
          
          if (historyVideos.length > 0 && historyImages.length === 0) {
            const updatedHistoryVideos = historyVideos.map((vid: any, index: number) => {
              if (index === 0 || !vid.aestheticScore) {
                return {
                  ...vid,
                  aestheticScore: scoreNum,
                };
              }
              return vid;
            });
            historyUpdateData.videos = updatedHistoryVideos;
          }
        }

        await historyRef.update(historyUpdateData);
      }
    }

    // Log the action
    const auditLogData: any = {
      adminId: req.adminId || 'unknown',
      adminEmail: req.adminEmail || 'unknown',
      action: 'update_aesthetic_score',
      resource: 'generation',
      resourceId: generationId,
      details: {
        newScore: scoreNum,
        oldScore: oldScore,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await adminDb.collection('adminAuditLogs').add(auditLogData);

    return res.json({
      success: true,
      data: {
        generationId,
        aestheticScore: scoreNum,
        message: 'Aesthetic score updated successfully',
      },
    });
  } catch (error) {
    console.error('Error updating aesthetic score:', error);
    return res.status(500).json({ error: 'Failed to update aesthetic score' });
  }
}

export async function getFilterOptions(req: AdminRequest, res: Response) {
  try {
    // Get unique models and users from generations
    // Note: Firestore doesn't support select() in the way we need, so we fetch limited docs
    const snapshot = await adminDb.collection('generations')
      .where('isPublic', '==', true)
      .where('isDeleted', '==', false)
      .limit(500) // Limit to avoid too much data
      .get();

    const models = new Set<string>();
    const usersMap = new Map<string, { uid: string; email?: string; username?: string }>();

    snapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      
      // Collect unique models
      if (data.model && typeof data.model === 'string') {
        models.add(data.model);
      }
      
      // Collect unique users
      if (data.createdBy?.uid) {
        if (!usersMap.has(data.createdBy.uid)) {
          usersMap.set(data.createdBy.uid, {
            uid: data.createdBy.uid,
            email: data.createdBy.email,
            username: data.createdBy.username,
          });
        }
      }
    });

    return res.json({
      success: true,
      data: {
        models: Array.from(models).sort(),
        users: Array.from(usersMap.values()).sort((a, b) => {
          const aName = a.email || a.username || a.uid;
          const bName = b.email || b.username || b.uid;
          return aName.localeCompare(bName);
        }),
      },
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return res.status(500).json({ error: 'Failed to fetch filter options' });
  }
}

export async function getGenerationById(req: AdminRequest, res: Response) {
  try {
    const { generationId } = req.params;

    const generationDoc = await adminDb.collection('generations').doc(generationId).get();

    if (!generationDoc.exists) {
      return res.status(404).json({ error: 'Generation not found' });
    }

    const data = generationDoc.data();
    return res.json({
      success: true,
      data: {
        id: generationDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
        updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching generation:', error);
    return res.status(500).json({ error: 'Failed to fetch generation' });
  }
}

/**
 * Get all ArtStation items (generations with aestheticScore >= 9)
 * This is for the ArtStation Management page
 */
export async function getArtStationItems(req: AdminRequest, res: Response) {
  try {
    const {
      limit = 20,
      cursor,
      generationType,
      model,
      createdBy,
      dateStart,
      dateEnd,
      status,
      search,
    } = req.query;

    const requestedLimit = parseInt(limit as string, 10);
    const fetchLimit = Math.max(requestedLimit * 3, 100);
    
    // Build base query - only ArtStation items (aestheticScore >= 9)
    // Use single orderBy to avoid composite index requirement
    let query: any = adminDb.collection('generations')
      .where('isPublic', '==', true)
      .where('isDeleted', '==', false)
      .where('aestheticScore', '>=', 9.0)
      .orderBy('aestheticScore', 'desc')
      .limit(fetchLimit);

    // Handle pagination cursor
    if (cursor) {
      const cursorDoc = await adminDb.collection('generations').doc(cursor as string).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    
    // Map documents to generation objects
    let generations = snapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          images: Array.isArray(data.images) ? data.images : [],
          videos: Array.isArray(data.videos) ? data.videos : [],
          audios: Array.isArray(data.audios) ? data.audios : [],
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        };
      });

    // In-memory filtering
    generations = generations.filter((gen: any) => {
      if (gen.isDeleted === true) return false;
      if (gen.isPublic === false || gen.visibility === 'private') return false;
      if (gen.aestheticScore < 9) return false; // Only ArtStation items
      
      const hasImages = gen.images && gen.images.length > 0;
      const hasVideos = gen.videos && gen.videos.length > 0;
      return hasImages || hasVideos;
    });

    // Apply filters
    if (generationType) {
      const types = Array.isArray(generationType) 
        ? (generationType as string[]).map(s => String(s).toLowerCase())
        : [String(generationType).toLowerCase()];
      generations = generations.filter((gen: any) => {
        const genType = (gen.generationType || '').toLowerCase();
        return types.includes(genType);
      });
    }

    if (model) {
      const modelStr = String(model).toLowerCase();
      generations = generations.filter((gen: any) => {
        const genModel = (gen.model || '').toLowerCase();
        return genModel === modelStr;
      });
    }

    if (createdBy) {
      const uidStr = String(createdBy);
      generations = generations.filter((gen: any) => {
        return gen.createdBy?.uid === uidStr;
      });
    }

    if (status) {
      const statusStr = String(status).toLowerCase();
      generations = generations.filter((gen: any) => {
        const genStatus = (gen.status || '').toLowerCase();
        return genStatus === statusStr;
      });
    }

    if (dateStart || dateEnd) {
      const startDate = dateStart ? new Date(dateStart as string) : null;
      const endDate = dateEnd ? new Date(dateEnd as string) : null;
      generations = generations.filter((gen: any) => {
        const genDate = gen.createdAt ? new Date(gen.createdAt) : null;
        if (!genDate || isNaN(genDate.getTime())) return false;
        if (startDate && genDate < startDate) return false;
        if (endDate && genDate > endDate) return false;
        return true;
      });
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchLower = search.toLowerCase().trim();
      generations = generations.filter((gen: any) => {
        const prompt = (gen.prompt || '').toLowerCase();
        return prompt.includes(searchLower);
      });
    }

    // Sort by aestheticScore desc, then createdAt desc (in-memory)
    generations.sort((a: any, b: any) => {
      const scoreA = a.aestheticScore || 0;
      const scoreB = b.aestheticScore || 0;
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Descending by score
      }
      // If scores are equal, sort by createdAt
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Descending by date
    });

    const limitedGenerations = generations.slice(0, requestedLimit);
    const hasMore = limitedGenerations.length === requestedLimit && 
                   (generations.length > requestedLimit || snapshot.docs.length === fetchLimit);
    const nextCursor = limitedGenerations.length > 0 && hasMore
      ? limitedGenerations[limitedGenerations.length - 1].id 
      : null;

    return res.json({
      success: true,
      data: {
        generations: limitedGenerations,
        nextCursor,
        hasMore,
        totalCount: generations.length,
      },
    });
  } catch (error) {
    console.error('Error fetching ArtStation items:', error);
    return res.status(500).json({ error: 'Failed to fetch ArtStation items' });
  }
}

/**
 * Remove item from ArtStation (set aestheticScore to null or < 9)
 */
export async function removeFromArtStation(req: AdminRequest, res: Response) {
  try {
    const { generationId } = req.params;
    const { bulk } = req.body; // Array of IDs for bulk remove

    // Check if this is a bulk remove request (POST to /bulk-remove)
    // Bulk requests don't have generationId in params
    if ((!generationId && bulk) || (bulk && Array.isArray(bulk) && bulk.length > 0)) {
      // Bulk remove
      const results = [];
      for (const id of bulk) {
        try {
          const generationRef = adminDb.collection('generations').doc(id);
          const generationDoc = await generationRef.get();

          if (!generationDoc.exists) {
            results.push({ id, success: false, error: 'Not found' });
            continue;
          }

          const generationData = generationDoc.data();
          const oldScore = generationData?.aestheticScore || null;

          // Set aestheticScore to null to remove from ArtStation
          await generationRef.update({
            aestheticScore: admin.firestore.FieldValue.delete(), // Remove the field
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            removedFromArtStationAt: admin.firestore.FieldValue.serverTimestamp(),
            removedFromArtStationBy: req.adminEmail || 'admin',
          });

          // Also update in generation history
          if (generationData?.createdBy?.uid) {
            const historyRef = adminDb
              .collection('generationHistory')
              .doc(generationData.createdBy.uid)
              .collection('items')
              .doc(id);
            
            const historyDoc = await historyRef.get();
            if (historyDoc.exists) {
              await historyRef.update({
                aestheticScore: admin.firestore.FieldValue.delete(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }

          // Log the action
          await adminDb.collection('adminAuditLogs').add({
            adminId: req.adminId || 'unknown',
            adminEmail: req.adminEmail || 'unknown',
            action: 'remove_from_artstation',
            resource: 'generation',
            resourceId: id,
            details: {
              oldScore: oldScore,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          results.push({ id, success: true });
        } catch (error: any) {
          console.error(`Error removing ${id} from ArtStation:`, error);
          results.push({ id, success: false, error: error.message });
        }
      }

      return res.json({
        success: true,
        data: {
          results,
          total: bulk.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      });
    } else {
      // Single remove
      if (!generationId) {
        return res.status(400).json({ error: 'Generation ID is required' });
      }

      const generationRef = adminDb.collection('generations').doc(generationId);
      const generationDoc = await generationRef.get();

      if (!generationDoc.exists) {
        return res.status(404).json({ error: 'Generation not found' });
      }

      const generationData = generationDoc.data();
      if (!generationData) {
        return res.status(404).json({ error: 'Generation data not found' });
      }

      const oldScore = generationData.aestheticScore || null;

      // Remove aestheticScore to remove from ArtStation
      await generationRef.update({
        aestheticScore: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        removedFromArtStationAt: admin.firestore.FieldValue.serverTimestamp(),
        removedFromArtStationBy: req.adminEmail || 'admin',
      });

      // Also update in generation history
      if (generationData.createdBy?.uid) {
        const historyRef = adminDb
          .collection('generationHistory')
          .doc(generationData.createdBy.uid)
          .collection('items')
          .doc(generationId);
        
        const historyDoc = await historyRef.get();
        if (historyDoc.exists) {
          await historyRef.update({
            aestheticScore: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Log the action
      await adminDb.collection('adminAuditLogs').add({
        adminId: req.adminId || 'unknown',
        adminEmail: req.adminEmail || 'unknown',
        action: 'remove_from_artstation',
        resource: 'generation',
        resourceId: generationId,
        details: {
          oldScore: oldScore,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({
        success: true,
        data: {
          generationId,
          message: 'Item removed from ArtStation successfully',
        },
      });
    }
  } catch (error) {
    console.error('Error removing from ArtStation:', error);
    return res.status(500).json({ error: 'Failed to remove from ArtStation' });
  }
}

