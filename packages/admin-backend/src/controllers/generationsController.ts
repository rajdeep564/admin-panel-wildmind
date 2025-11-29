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
    
    // Map documents to generation objects with proper normalization
    // Deduplicate by ID in case of any duplicates from Firestore
    const seenIds = new Set<string>();
    let generations = snapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        const id = doc.id;
        
        // Skip if we've already seen this ID (shouldn't happen, but safety check)
        if (seenIds.has(id)) {
          return null;
        }
        seenIds.add(id);
        
        // Normalize Firebase objects
        const normalized: any = {
          id: String(id), // Ensure ID is always a string
          ...data,
        };
        
        // CRITICAL: Normalize and deduplicate images/videos arrays
        // Images might have duplicates (same image ID with different fields - optimized vs non-optimized)
        // We need to deduplicate by ID first, then by base URL, and prioritize entries with optimized fields
        if (Array.isArray(data.images)) {
          // Helper to get unique identifier for an image
          const getImageKey = (img: any): string => {
            // Priority 1: Use ID if available (most reliable)
            if (img?.id) return `id:${String(img.id)}`;
            // Priority 2: Extract base URL (without format suffix)
            const url = img?.url || img?.avifUrl || img?.thumbnailUrl || img?.thumbUrl || '';
            if (url) {
              // Remove format suffixes like _optimized.avif, .jpeg, etc. to get base URL
              const baseUrl = String(url).replace(/[._](optimized|avif|jpeg|jpg|png|webp|thumb)(\?.*)?$/i, '');
              return `url:${baseUrl}`;
            }
            return '';
          };
          
          // Helper to count optimized fields (more = better)
          const getOptimizedFieldCount = (img: any): number => {
            let count = 0;
            if (img?.avifUrl) count += 3; // Highest priority
            if (img?.thumbnailUrl) count += 2;
            if (img?.thumbUrl) count += 1;
            if (img?.blurDataUrl) count += 1;
            if (img?.optimized === true) count += 1;
            return count;
          };
          
          // Deduplicate: group by key (ID or base URL), keep the one with most optimized fields
          const imageMap = new Map<string, any>();
          for (const img of data.images) {
            if (!img) continue;
            const key = getImageKey(img);
            if (!key) continue; // Skip images without identifier
            
            const existing = imageMap.get(key);
            if (!existing) {
              // First occurrence - add it
              imageMap.set(key, img);
            } else {
              // Already exists - compare and keep the better one
              const existingScore = getOptimizedFieldCount(existing);
              const newScore = getOptimizedFieldCount(img);
              
              // Always prefer the one with more optimized fields
              if (newScore > existingScore) {
                imageMap.set(key, img);
              } else if (newScore === existingScore) {
                // If scores are equal, prefer the one with avifUrl
                if (img.avifUrl && !existing.avifUrl) {
                  imageMap.set(key, img);
                } else if (img.thumbnailUrl && !existing.thumbnailUrl && !existing.avifUrl) {
                  imageMap.set(key, img);
                }
              }
            }
          }
          normalized.images = Array.from(imageMap.values());
        } else {
          normalized.images = [];
        }
        
        // Deduplicate videos similarly
        if (Array.isArray(data.videos)) {
          const videoMap = new Map<string, any>();
          for (const vid of data.videos) {
            if (!vid) continue;
            const identifier = vid.id || vid.url || vid.thumbUrl || vid.thumbnailUrl || '';
            if (!identifier) continue;
            if (!videoMap.has(identifier)) {
              videoMap.set(identifier, vid);
            }
          }
          normalized.videos = Array.from(videoMap.values());
        } else {
          normalized.videos = [];
        }
        
        normalized.audios = Array.isArray(data.audios) ? data.audios : [];
        
        // Convert Firestore Timestamps to Date objects or ISO strings
        if (data.createdAt) {
          if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
            normalized.createdAt = data.createdAt.toDate();
          } else if (data.createdAt.seconds) {
            normalized.createdAt = new Date(data.createdAt.seconds * 1000);
          } else {
            normalized.createdAt = data.createdAt;
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
        
        // Normalize createdBy object
        if (data.createdBy) {
          normalized.createdBy = {
            uid: String(data.createdBy.uid || ''),
            email: data.createdBy.email || undefined,
            username: data.createdBy.username || undefined,
            photoURL: data.createdBy.photoURL || undefined,
          };
        }
        
        return normalized;
      })
      .filter((gen: any) => gen !== null); // Remove any null entries from deduplication

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

    // Final deduplication by ID (in case filtering created duplicates somehow)
    // CRITICAL: This ensures no duplicates are returned even if Firestore returns duplicates
    const finalGenerations: any[] = [];
    const finalSeenIds = new Set<string>();
    
    // If we have a cursor, track it to skip items that come before it in sorted order
    let cursorItem: any = null;
    if (cursor) {
      const cursorGen = generations.find((g: any) => g && String(g.id) === String(cursor));
      if (cursorGen) {
        cursorItem = cursorGen;
      }
    }
    
    for (const gen of generations) {
      if (!gen || !gen.id) continue; // Skip invalid items
      
      const genId = String(gen.id);
      
      // Skip duplicates
      if (finalSeenIds.has(genId)) {
        console.warn(`[getGenerationsForScoring] Duplicate ID detected and skipped: ${genId}`);
        continue;
      }
      
      // If we have a cursor, skip the cursor item itself
      if (cursorItem && genId === String(cursorItem.id)) {
        continue; // Skip the cursor item itself
      }
      
      finalSeenIds.add(genId);
      // Ensure ID is properly set as string
      gen.id = genId;
      finalGenerations.push(gen);
    }
    
    // Limit results to requested amount
    const limitedGenerations = finalGenerations.slice(0, requestedLimit);
    
    // Determine if there are more items
    // If we got fewer items than requested after filtering, we've reached the end
    // OR if we got exactly the fetchLimit from DB, there might be more
    const hasMore = limitedGenerations.length === requestedLimit && 
                   (finalGenerations.length > requestedLimit || snapshot.docs.length === fetchLimit);
    
    // Use the last item's ID as cursor, but ensure it's valid
    const lastItem = limitedGenerations.length > 0 ? limitedGenerations[limitedGenerations.length - 1] : null;
    const nextCursor = lastItem && lastItem.id && hasMore
      ? String(lastItem.id)
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
        
        // Queue mirror update task to ensure changes sync to public mirror immediately
        // This prevents the mirror queue worker from overwriting with stale data
        try {
          await adminDb.collection('mirrorQueue').add({
            op: 'update',
            uid: generationData.createdBy.uid,
            historyId: generationId,
            updates: {
              aestheticScore: scoreNum,
              images: updateData.images || undefined,
              videos: updateData.videos || undefined,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: 0,
            status: 'pending',
          });
          console.log('[AdminPanel] Queued mirror update task for', { generationId, uid: generationData.createdBy.uid });
        } catch (mirrorError: any) {
          // Non-blocking: log error but don't fail the request
          console.warn('[AdminPanel] Failed to queue mirror update task:', mirrorError?.message);
        }
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

/**
 * Bulk update aesthetic scores for multiple generations
 * POST /generations/bulk-score
 * Body: { bulk: string[], score: number }
 */
export async function bulkUpdateAestheticScore(req: AdminRequest, res: Response) {
  try {
    const { bulk, score } = req.body;

    if (!bulk || !Array.isArray(bulk) || bulk.length === 0) {
      return res.status(400).json({ error: 'Bulk array of generation IDs is required' });
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

    interface BulkResult {
      id: string;
      success: boolean;
      error?: string;
    }
    const results: BulkResult[] = [];

    // Process each generation
    for (const generationId of bulk) {
      try {
        const generationRef = adminDb.collection('generations').doc(generationId);
        const generationDoc = await generationRef.get();

        if (!generationDoc.exists) {
          results.push({ id: generationId, success: false, error: 'Not found' });
          continue;
        }

        const generationData = generationDoc.data();
        if (!generationData) {
          results.push({ id: generationId, success: false, error: 'Data not found' });
          continue;
        }

        const oldScore = generationData.aestheticScore !== undefined && generationData.aestheticScore !== null
          ? generationData.aestheticScore
          : null;

        // Update document-level aestheticScore
        const updateData: any = {
          aestheticScore: scoreNum,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          scoreUpdatedBy: req.adminEmail || 'admin',
          scoreUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Also update individual image/video aestheticScore fields
        const images = Array.isArray(generationData.images) ? generationData.images : [];
        const videos = Array.isArray(generationData.videos) ? generationData.videos : [];
        
        if (images.length > 0) {
          const updatedImages = images.map((img: any, index: number) => {
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
        
        if (videos.length > 0 && images.length === 0) {
          const updatedVideos = videos.map((vid: any, index: number) => {
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
            
            // Queue mirror update task to ensure changes sync to public mirror immediately
            try {
              await adminDb.collection('mirrorQueue').add({
                op: 'update',
                uid: generationData.createdBy.uid,
                historyId: generationId,
                updates: {
                  aestheticScore: scoreNum,
                  images: updateData.images || undefined,
                  videos: updateData.videos || undefined,
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                attempts: 0,
                status: 'pending',
              });
            } catch (mirrorError: any) {
              // Non-blocking: log error but don't fail the request
              console.warn(`[AdminPanel] Failed to queue mirror update for ${generationId}:`, mirrorError?.message);
            }
          }
        }

        // Log the action
        await adminDb.collection('adminAuditLogs').add({
          adminId: req.adminId || 'unknown',
          adminEmail: req.adminEmail || 'unknown',
          action: 'bulk_update_aesthetic_score',
          resource: 'generation',
          resourceId: generationId,
          details: {
            newScore: scoreNum,
            oldScore: oldScore,
            bulkOperation: true,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        results.push({ id: generationId, success: true });
      } catch (error: any) {
        console.error(`Error updating score for ${generationId}:`, error);
        results.push({ id: generationId, success: false, error: error.message || 'Update failed' });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return res.json({
      success: true,
      data: {
        results,
        total: bulk.length,
        successful,
        failed,
        score: scoreNum,
      },
    });
  } catch (error) {
    console.error('Error in bulk update aesthetic score:', error);
    return res.status(500).json({ error: 'Failed to bulk update aesthetic scores' });
  }
}

export async function getFilterOptions(req: AdminRequest, res: Response) {
  try {
    // OPTIMIZED: Use projection to only fetch the fields we need (model, createdBy)
    // This significantly reduces the payload size and improves performance
    const snapshot = await adminDb.collection('generations')
      .where('isPublic', '==', true)
      .where('isDeleted', '==', false)
      .select('model', 'createdBy', 'generationType') // Only fetch fields we need
      .limit(1000) // Increased limit since we're using projection (much faster)
      .get();

    const models = new Set<string>();
    const usersMap = new Map<string, { uid: string; email?: string; username?: string }>();
    const generationTypes = new Set<string>();

    snapshot.docs.forEach((doc: any) => {
      const data = doc.data();
      
      // Collect unique models
      if (data.model && typeof data.model === 'string') {
        models.add(data.model);
      }
      
      // Collect unique generation types
      if (data.generationType && typeof data.generationType === 'string') {
        generationTypes.add(data.generationType);
      }
      
      // Collect unique users
      if (data.createdBy?.uid) {
        if (!usersMap.has(data.createdBy.uid)) {
          usersMap.set(data.createdBy.uid, {
            uid: String(data.createdBy.uid),
            email: data.createdBy.email || undefined,
            username: data.createdBy.username || undefined,
          });
        }
      }
    });

    return res.json({
      success: true,
      data: {
        models: Array.from(models).sort(),
        generationTypes: Array.from(generationTypes).sort(),
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
      mode,
    } = req.query;

    const requestedLimit = parseInt(limit as string, 10);
    // Fetch a bit more to handle invalid items (missing type/media)
    const fetchLimit = requestedLimit + 5; 
    
    // Helper function to normalize items
    const normalizeItem = (id: string, data: any) => {
      const normalized: any = {
        id: String(id),
        ...data,
      };
      
      if (Array.isArray(data.images)) {
        normalized.images = data.images;
      } else {
        normalized.images = [];
      }
      
      if (Array.isArray(data.videos)) {
        normalized.videos = data.videos;
      } else {
        normalized.videos = [];
      }
      
      normalized.audios = Array.isArray(data.audios) ? data.audios : [];
      
      if (data.createdAt) {
        if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
          normalized.createdAt = data.createdAt.toDate();
        } else if (data.createdAt.seconds) {
          normalized.createdAt = new Date(data.createdAt.seconds * 1000);
        } else {
          normalized.createdAt = data.createdAt;
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
      
      if (data.createdBy) {
        normalized.createdBy = {
          uid: String(data.createdBy.uid || ''),
          email: data.createdBy.email || undefined,
          username: data.createdBy.username || undefined,
          photoURL: data.createdBy.photoURL || undefined,
        };
      }
      
      return normalized;
    };

    // Base query construction
    let baseQuery = adminDb.collection('generations')
      .where('isPublic', '==', true)
      .where('isDeleted', '==', false);

    // Apply filters
    let targetGenerationTypes: string[] = [];
    if (generationType) {
      targetGenerationTypes = Array.isArray(generationType) 
        ? (generationType as string[]).map(s => String(s))
        : [String(generationType)];
    } else if (mode) {
      const modeStr = String(mode).toLowerCase();
      switch (modeStr) {
        case 'image':
          targetGenerationTypes = ['text-to-image', 'image-generation', 'image', 'text-to-character'];
          break;
        case 'video':
          targetGenerationTypes = ['text-to-video', 'image-to-video', 'video-generation', 'video'];
          break;
        case 'music':
          targetGenerationTypes = ['text-to-music', 'music-generation', 'music'];
          break;
        case 'branding':
          targetGenerationTypes = ['logo', 'logo-generation', 'branding', 'branding-kit', 'sticker-generation'];
          break;
        case 'all':
        default:
          targetGenerationTypes = [];
          break;
      }
    }

    if (targetGenerationTypes.length > 0) {
      if (targetGenerationTypes.length <= 10) {
        baseQuery = baseQuery.where('generationType', 'in', targetGenerationTypes);
      } else {
        baseQuery = baseQuery.where('generationType', 'in', targetGenerationTypes.slice(0, 10));
      }
    }

    if (status) {
      baseQuery = baseQuery.where('status', '==', String(status));
    }

    if (createdBy) {
      baseQuery = baseQuery.where('createdBy.uid', '==', String(createdBy));
    }

    if (dateStart && dateEnd) {
      const start = new Date(dateStart as string);
      const end = new Date(dateEnd as string);
      baseQuery = baseQuery
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(start))
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(end));
    }

    // SINGLE QUERY STRATEGY:
    // To ensure we load ALL images (High Scored, Low Scored, Unscored) without pagination gaps,
    // we use a single query.
    // User Request: "filter this from backend actualy skip them and aso now makee the sort by from most score to less score"
    // Solution: orderBy('aestheticScore', 'desc')
    // 1. This automatically excludes items where aestheticScore is missing/null (Backend Filter).
    // 2. This sorts by score descending (Most to Less).
    let mainQuery = baseQuery
      .orderBy('aestheticScore', 'desc')
      .orderBy('createdAt', 'desc');

    if (cursor) {
      const doc = await adminDb.collection('generations').doc(cursor as string).get();
      if (doc.exists) {
        mainQuery = mainQuery.startAfter(doc);
      }
    }

    // Execute query
    const snapshot = await mainQuery.limit(fetchLimit).get();
    
    // Check if DB has more (simple check since we are using single query)
    const dbHasMore = snapshot.size === fetchLimit;

    let items = snapshot.docs.map(doc => ({
      item: normalizeItem(doc.id, doc.data()),
      rawData: doc.data()
    }));

    // Helper for sorting
    const getScoreUpdatedAtTime = (rawData: any): number => {
      if (!rawData?.scoreUpdatedAt) return 0;
      const ts = rawData.scoreUpdatedAt;
      if (ts.seconds !== undefined) return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000;
      if (typeof ts.toMillis === 'function') return ts.toMillis();
      if (typeof ts === 'string') return new Date(ts).getTime();
      return typeof ts === 'number' ? ts : 0;
    };

    const getCreatedAtTime = (item: any): number => {
      if (item.createdAt instanceof Date) return item.createdAt.getTime();
      if (typeof item.createdAt === 'string') return new Date(item.createdAt).getTime();
      return 0;
    };

    const getAestheticScore = (item: any): number => {
      if (item.aestheticScore === undefined || item.aestheticScore === null) return -1;
      const score = Number(item.aestheticScore);
      return isNaN(score) ? -1 : score;
    };

    const hasAdminScore = (rawData: any): boolean => {
      return rawData?.scoreUpdatedAt !== null && rawData?.scoreUpdatedAt !== undefined;
    };

    // Sort Logic:
    // User Request: "sort by from most score to less score"
    // We match the DB sort: aestheticScore DESC, then createdAt DESC.
    // Note: We keep Admin Scored items logic if it helps, but primarily we follow score.
    // Actually, to ensure pagination works (DB order == Memory order), we must strictly follow score.
    // However, if two items have the same score, we use createdAt.
    items.sort((a, b) => {
      const aScore = getAestheticScore(a.item);
      const bScore = getAestheticScore(b.item);
      
      if (aScore !== bScore) {
        return bScore - aScore; // Higher score first
      }

      // Tie-breaker: createdAt desc
      const aCreated = getCreatedAtTime(a.item);
      const bCreated = getCreatedAtTime(b.item);
      return bCreated - aCreated;
    });

    // Extract items
    let resultItems = items.map(e => e.item);
    
    // In-memory filtering for validity and search
    resultItems = resultItems.filter((item: any) => {
      if (!item.id) return false;
      if (!item.generationType) return false;

      // Explicitly filter out private items
      if (item.isPublic === false) return false;

      // Note: DB query already filters out missing aestheticScore, so we don't strictly need the -1 check here,
      // but keeping it doesn't hurt.
      if (getAestheticScore(item) === -1) return false;
      
      const hasImages = item.images && item.images.length > 0;
      const hasVideos = item.videos && item.videos.length > 0;
      if (!hasImages && !hasVideos) return false;
      
      if (search && typeof search === 'string' && search.trim().length > 0) {
        const searchLower = search.toLowerCase().trim();
        const prompt = (item.prompt || '').toLowerCase();
        return prompt.includes(searchLower);
      }
      
      if (model) {
        const modelStr = String(model).toLowerCase();
        if ((item.model || '').toLowerCase() !== modelStr) return false;
      }
      
      return true;
    });

    // Handle cursor skipping (if in-memory sort changed order)
    if (cursor) {
      const cursorIndex = resultItems.findIndex((item: any) => String(item.id) === String(cursor));
      if (cursorIndex !== -1) {
        resultItems = resultItems.slice(cursorIndex + 1);
      }
    }

    // Limit results
    const limitedGenerations = resultItems.slice(0, requestedLimit);
    
    // Enrich createdBy objects with photoURL if missing (Matching Public Controller Logic)
    const uidsToFetch = new Set<string>();
    limitedGenerations.forEach((item: any) => {
      if (item.createdBy?.uid && !item.createdBy.photoURL) {
        uidsToFetch.add(item.createdBy.uid);
      }
    });

    if (uidsToFetch.size > 0) {
      try {
        // Batch fetch user documents
        const userRefs = Array.from(uidsToFetch).map(uid => adminDb.collection('users').doc(uid));
        if (userRefs.length > 0) {
          const userSnaps = await adminDb.getAll(...userRefs);
          const userMap = new Map<string, string>();
          
          userSnaps.forEach(snap => {
            if (snap.exists) {
              const userData = snap.data();
              if (userData?.photoURL) {
                userMap.set(snap.id, userData.photoURL);
              }
            }
          });
          
          // Apply photoURLs
          limitedGenerations.forEach((item: any) => {
            if (item.createdBy?.uid && !item.createdBy.photoURL) {
              const url = userMap.get(item.createdBy.uid);
              if (url) {
                item.createdBy.photoURL = url;
              }
            }
          });
        }
      } catch (err) {
        console.warn('Failed to enrich user profiles:', err);
        // Continue without enrichment
      }
    }

    // Determine next cursor and hasMore
    let nextCursor: string | null = null;
    let hasMore = false;

    if (limitedGenerations.length > 0) {
      const lastItem = limitedGenerations[limitedGenerations.length - 1];
      
      // hasMore logic:
      // 1. If we have more items in memory than requested limit -> TRUE
      // 2. OR if DB has more items -> TRUE
      const hasMoreInMemory = resultItems.length > requestedLimit;
      hasMore = hasMoreInMemory || dbHasMore;
      
      if (hasMore) {
        nextCursor = lastItem.id;
      }
    }

    return res.json({
      success: true,
      data: {
        generations: limitedGenerations,
        nextCursor,
        hasMore,
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
      interface BulkResult {
        id: string;
        success: boolean;
        error?: string;
      }
      const results: BulkResult[] = [];
      for (const id of bulk) {
        try {
          const generationRef = adminDb.collection('generations').doc(id);
          const generationDoc = await generationRef.get();

          if (!generationDoc.exists) {
            results.push({ id, success: false, error: 'Not found' });
            continue;
          }

          const generationData = generationDoc.data();
          if (!generationData) {
            results.push({ id, success: false, error: 'Generation data not found' });
            continue;
          }

          const oldScore = generationData.aestheticScore || null;

          // Remove from ArtStation by deleting aestheticScore and scoreUpdatedAt
          // This ensures the item won't appear in ArtStation feed (which filters by aestheticScore >= 9)
          const updatePayload: any = {
            aestheticScore: admin.firestore.FieldValue.delete(), // Remove the field
            scoreUpdatedAt: admin.firestore.FieldValue.delete(), // Also remove admin score timestamp
            scoreUpdatedBy: admin.firestore.FieldValue.delete(), // Remove who updated it
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            removedFromArtStationAt: admin.firestore.FieldValue.serverTimestamp(),
            removedFromArtStationBy: req.adminEmail || 'admin',
          };

          // Also remove aestheticScore from images/videos arrays
          const images = Array.isArray(generationData.images) ? generationData.images : [];
          const videos = Array.isArray(generationData.videos) ? generationData.videos : [];
          
          if (images.length > 0) {
            const updatedImages = images.map((img: any) => {
              const { aestheticScore, ...restOfImage } = img; // Remove aestheticScore
              return restOfImage;
            });
            updatePayload.images = updatedImages;
          }
          
          if (videos.length > 0 && images.length === 0) {
            const updatedVideos = videos.map((vid: any) => {
              const { aestheticScore, ...restOfVideo } = vid; // Remove aestheticScore
              return restOfVideo;
            });
            updatePayload.videos = updatedVideos;
          }

          await generationRef.update(updatePayload);

          // Also update in generation history
          if (generationData?.createdBy?.uid) {
            const historyRef = adminDb
              .collection('generationHistory')
              .doc(generationData.createdBy.uid)
              .collection('items')
              .doc(id);
            
            const historyDoc = await historyRef.get();
            if (historyDoc.exists) {
              const historyUpdatePayload: any = {
                aestheticScore: admin.firestore.FieldValue.delete(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              };
              // Also update images/videos in history if they were updated
              if (updatePayload.images) historyUpdatePayload.images = updatePayload.images;
              if (updatePayload.videos) historyUpdatePayload.videos = updatePayload.videos;
              await historyRef.update(historyUpdatePayload);
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

      // Remove from ArtStation by deleting aestheticScore and scoreUpdatedAt
      // This ensures the item won't appear in ArtStation feed (which filters by aestheticScore >= 9)
      const updatePayload: any = {
        aestheticScore: admin.firestore.FieldValue.delete(), // Remove the field
        scoreUpdatedAt: admin.firestore.FieldValue.delete(), // Also remove admin score timestamp
        scoreUpdatedBy: admin.firestore.FieldValue.delete(), // Remove who updated it
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        removedFromArtStationAt: admin.firestore.FieldValue.serverTimestamp(),
        removedFromArtStationBy: req.adminEmail || 'admin',
      };

      // Also remove aestheticScore from images/videos arrays
      const images = Array.isArray(generationData.images) ? generationData.images : [];
      const videos = Array.isArray(generationData.videos) ? generationData.videos : [];
      
      if (images.length > 0) {
        const updatedImages = images.map((img: any) => {
          const { aestheticScore, ...restOfImage } = img; // Remove aestheticScore
          return restOfImage;
        });
        updatePayload.images = updatedImages;
      }
      
      if (videos.length > 0 && images.length === 0) {
        const updatedVideos = videos.map((vid: any) => {
          const { aestheticScore, ...restOfVideo } = vid; // Remove aestheticScore
          return restOfVideo;
        });
        updatePayload.videos = updatedVideos;
      }

      await generationRef.update(updatePayload);

      // Also update in generation history
      if (generationData.createdBy?.uid) {
        const historyRef = adminDb
          .collection('generationHistory')
          .doc(generationData.createdBy.uid)
          .collection('items')
          .doc(generationId);
        
        const historyDoc = await historyRef.get();
        if (historyDoc.exists) {
          const historyUpdatePayload: any = {
            aestheticScore: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          // Also update images/videos in history if they were updated
          if (updatePayload.images) historyUpdatePayload.images = updatePayload.images;
          if (updatePayload.videos) historyUpdatePayload.videos = updatePayload.videos;
          await historyRef.update(historyUpdatePayload);
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

