import { Router } from "express";
import { login, logout, verify } from "../controllers/authController";
import {
  getGenerationsForScoring,
  updateAestheticScore,
  bulkUpdateAestheticScore,
  getGenerationById,
  getFilterOptions,
  getArtStationItems,
  removeFromArtStation,
  deleteGeneration,
  updateGeneration,
} from "../controllers/generationsController";
import {
  getUsers,
  getUserById,
  getUserCount,
  getUserGenerations,
} from "../controllers/usersController";
import { requireAdmin } from "../middleware/authMiddleware";
import {
  suspendUser,
  unsuspendUser,
  banUser,
  unbanUser,
  forceLogout,
  setUserRole,
  verifyUserEmail,
} from "../controllers/moderationController";
import {
  listBlockedDevices,
  blockDevice,
  unblockDevice,
  getUserDevices,
} from "../controllers/deviceController";
import {
  listBlockedIPs,
  blockIP,
  unblockIP,
  getUserIPs,
} from "../controllers/ipController";
import { getAuditLogs } from "../controllers/auditController";
import {
  issueWarning,
  getUserWarnings,
  deleteWarning,
} from "../controllers/warningController";
import {
  adjustCredits,
  getCreditHistory,
} from "../controllers/creditController";
import {
  getGlobalFlags,
  setGlobalFlag,
  getUserFlags,
  setUserFlag,
} from "../controllers/featureFlagController";
import {
  sendDirectEmail,
  createAnnouncement,
  getAnnouncements,
  deactivateAnnouncement,
} from "../controllers/broadcastController";

const router = Router();

// ─── Auth ────────────────────────────────────────────────────────────────────
router.post("/auth/login", login);
router.post("/auth/logout", logout);
router.get("/auth/verify", requireAdmin, verify);

// ─── Generations ─────────────────────────────────────────────────────────────
router.get("/generations", requireAdmin, getGenerationsForScoring);
router.get("/generations/filter-options", requireAdmin, getFilterOptions);
router.get("/generations/:generationId", requireAdmin, getGenerationById);
router.put(
  "/generations/:generationId/score",
  requireAdmin,
  updateAestheticScore,
);
router.post("/generations/bulk-score", requireAdmin, bulkUpdateAestheticScore);
router.delete("/generations/:generationId", requireAdmin, deleteGeneration);
router.patch("/generations/:generationId", requireAdmin, updateGeneration);

// ─── ArtStation ───────────────────────────────────────────────────────────────
router.get("/artstation", requireAdmin, getArtStationItems);
router.delete("/artstation/:generationId", requireAdmin, removeFromArtStation);
router.post("/artstation/bulk-remove", requireAdmin, removeFromArtStation);

// ─── User Management ──────────────────────────────────────────────────────────
router.get("/users", requireAdmin, getUsers);
router.get("/users/count", requireAdmin, getUserCount);
router.get("/users/:userId", requireAdmin, getUserById);
router.get("/users/:userId/generations", requireAdmin, getUserGenerations);

// ─── Moderation ───────────────────────────────────────────────────────────────
router.post("/users/:uid/suspend", requireAdmin, suspendUser);
router.post("/users/:uid/unsuspend", requireAdmin, unsuspendUser);
router.post("/users/:uid/ban", requireAdmin, banUser);
router.post("/users/:uid/unban", requireAdmin, unbanUser);
router.post("/users/:uid/force-logout", requireAdmin, forceLogout);
router.patch("/users/:uid/role", requireAdmin, setUserRole);
router.post("/users/:uid/verify-email", requireAdmin, verifyUserEmail);

// ─── Warnings ─────────────────────────────────────────────────────────────────
router.get("/users/:uid/warnings", requireAdmin, getUserWarnings);
router.post("/users/:uid/warnings", requireAdmin, issueWarning);
router.delete("/users/:uid/warnings/:warningId", requireAdmin, deleteWarning);

// ─── Credits ──────────────────────────────────────────────────────────────────
router.post("/users/:uid/adjust-credits", requireAdmin, adjustCredits);
router.get("/users/:uid/credit-history", requireAdmin, getCreditHistory);

// ─── Device History & Blocking ───────────────────────────────────────────────
router.get("/users/:uid/devices", requireAdmin, getUserDevices);
router.get("/users/:uid/ips", requireAdmin, getUserIPs);
router.get("/devices/blocked", requireAdmin, listBlockedDevices);
router.post("/devices/block", requireAdmin, blockDevice);
router.delete("/devices/unblock/:deviceId", requireAdmin, unblockDevice);

// ─── IP Management ────────────────────────────────────────────────────────────
router.get("/ips/blocked", requireAdmin, listBlockedIPs);
router.post("/ips/block", requireAdmin, blockIP);
router.delete("/ips/unblock/:ip", requireAdmin, unblockIP);

// ─── Audit Log ────────────────────────────────────────────────────────────────
router.get("/audit-logs", requireAdmin, getAuditLogs);

// ─── Feature Flags ────────────────────────────────────────────────────────────
router.get("/feature-flags", requireAdmin, getGlobalFlags);
router.patch("/feature-flags/:flag", requireAdmin, setGlobalFlag);
router.get("/feature-flags/user/:uid", requireAdmin, getUserFlags);
router.patch("/feature-flags/user/:uid/:flag", requireAdmin, setUserFlag);

// ─── Broadcast ────────────────────────────────────────────────────────────────
router.post("/broadcast/email", requireAdmin, sendDirectEmail);
router.post("/broadcast/announcement", requireAdmin, createAnnouncement);
router.get("/broadcast/announcements", requireAdmin, getAnnouncements);
router.patch(
  "/broadcast/announcements/:id/deactivate",
  requireAdmin,
  deactivateAnnouncement,
);

export default router;
