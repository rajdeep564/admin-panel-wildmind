import { Router } from 'express';
import { 
  getAnalyticsStats, 
  getGenerationsOverTime, 
  getTopUsers, 
  getTopGenerators, 
  getUserStats,
  getGenerationBreakdown,
  getDataAudit,
  getUserGrowth,
  getModelStats
} from '../controllers/analyticsController';
import { requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to all analytics routes
router.use(requireAdmin);

// Original endpoints
router.get('/stats', getAnalyticsStats);
router.get('/timeline', getGenerationsOverTime);
router.get('/top-users', getTopUsers);
router.get('/top-generators', getTopGenerators);
router.get('/user/:userId', getUserStats);

// New enhanced endpoints
router.get('/breakdown', getGenerationBreakdown); // Time-filtered breakdown
router.get('/audit', getDataAudit); // Data verification
router.get('/growth', getUserGrowth); // User growth metrics
router.get('/models', getModelStats); // Model performance

export default router;
