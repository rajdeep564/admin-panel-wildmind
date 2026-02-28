import { Response } from "express";
import { adminDb } from "../config/firebaseAdmin";
import { AdminRequest } from "../middleware/authMiddleware";
import { logAuditAction } from "./auditController";

const GLOBAL_FLAGS_DOC = "global";

const DEFAULT_FLAGS: Record<string, boolean> = {
  imageGeneration: true,
  videoGeneration: true,
  musicGeneration: true,
  artStation: true,
  newUserSignup: true,
  betaFeatures: false,
  maintenanceMode: false,
};

/**
 * Get all global feature flags
 * GET /feature-flags
 */
export async function getGlobalFlags(req: AdminRequest, res: Response) {
  try {
    const doc = await adminDb
      .collection("featureFlags")
      .doc(GLOBAL_FLAGS_DOC)
      .get();
    const flags = doc.exists
      ? { ...DEFAULT_FLAGS, ...doc.data() }
      : DEFAULT_FLAGS;
    return res.json({ success: true, data: { flags } });
  } catch (error: any) {
    console.error("Error fetching global flags:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch feature flags" });
  }
}

/**
 * Set a global feature flag
 * PATCH /feature-flags/:flag
 * Body: { enabled: boolean }
 */
export async function setGlobalFlag(req: AdminRequest, res: Response) {
  try {
    const { flag } = req.params;
    const { enabled } = req.body;

    if (!flag) return res.status(400).json({ error: "flag name is required" });
    if (typeof enabled !== "boolean")
      return res.status(400).json({ error: "enabled must be a boolean" });

    await adminDb
      .collection("featureFlags")
      .doc(GLOBAL_FLAGS_DOC)
      .set(
        { [flag]: enabled, updatedAt: new Date().toISOString() },
        { merge: true },
      );

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "SET_GLOBAL_FLAG",
      details: { flag, enabled },
    });

    return res.json({
      success: true,
      message: `Flag '${flag}' set to ${enabled}`,
    });
  } catch (error: any) {
    console.error("Error setting global flag:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to set feature flag" });
  }
}

/**
 * Get per-user feature flag overrides
 * GET /feature-flags/user/:uid
 */
export async function getUserFlags(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "User ID is required" });

    const doc = await adminDb.collection("featureFlags").doc(uid).get();
    const flags = doc.exists ? doc.data() : {};

    return res.json({ success: true, data: { flags } });
  } catch (error: any) {
    console.error("Error fetching user flags:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch user flags" });
  }
}

/**
 * Set a per-user feature flag override
 * PATCH /feature-flags/user/:uid/:flag
 * Body: { enabled: boolean }
 */
export async function setUserFlag(req: AdminRequest, res: Response) {
  try {
    const { uid, flag } = req.params;
    const { enabled } = req.body;

    if (!uid) return res.status(400).json({ error: "User ID is required" });
    if (!flag) return res.status(400).json({ error: "flag name is required" });
    if (typeof enabled !== "boolean")
      return res.status(400).json({ error: "enabled must be a boolean" });

    await adminDb
      .collection("featureFlags")
      .doc(uid)
      .set(
        { [flag]: enabled, updatedAt: new Date().toISOString() },
        { merge: true },
      );

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "SET_USER_FLAG",
      targetUid: uid,
      details: { flag, enabled },
    });

    return res.json({
      success: true,
      message: `User flag '${flag}' set to ${enabled}`,
    });
  } catch (error: any) {
    console.error("Error setting user flag:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to set user flag" });
  }
}
