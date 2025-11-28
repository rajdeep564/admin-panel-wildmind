import { Router } from 'express';
import { login, logout, verify } from '../controllers/authController';
import { 
  getGenerationsForScoring, 
  updateAestheticScore, 
  bulkUpdateAestheticScore,
  getGenerationById, 
  getFilterOptions,
  getArtStationItems,
  removeFromArtStation,
} from '../controllers/generationsController';
import { requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Auth routes
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/verify', requireAdmin, verify);

// Generation routes (protected)
router.get('/generations', requireAdmin, getGenerationsForScoring);
router.get('/generations/filter-options', requireAdmin, getFilterOptions);
router.get('/generations/:generationId', requireAdmin, getGenerationById);
router.put('/generations/:generationId/score', requireAdmin, updateAestheticScore);
router.post('/generations/bulk-score', requireAdmin, bulkUpdateAestheticScore);

// ArtStation Management routes (protected)
router.get('/artstation', requireAdmin, getArtStationItems);
router.delete('/artstation/:generationId', requireAdmin, removeFromArtStation);
router.post('/artstation/bulk-remove', requireAdmin, removeFromArtStation);

export default router;

