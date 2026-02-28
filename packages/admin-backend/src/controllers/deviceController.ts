import { Response } from "express";
import { adminDb } from "../config/firebaseAdmin";
import { AdminRequest } from "../middleware/authMiddleware";
import { logAuditAction } from "./auditController";

/**
 * List all blocked devices
 * GET /devices/blocked
 */
export async function listBlockedDevices(req: AdminRequest, res: Response) {
  try {
    const snapshot = await adminDb
      .collection("blockedDevices")
      .orderBy("blockedAt", "desc")
      .get();

    const devices = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      data: { devices, total: devices.length },
    });
  } catch (error: any) {
    console.error("Error listing blocked devices:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to list blocked devices" });
  }
}

/**
 * Block a device
 * POST /devices/block
 * Body: { deviceId, reason, targetUid? }
 */
export async function blockDevice(req: AdminRequest, res: Response) {
  try {
    const { deviceId, reason, targetUid } = req.body;
    if (!deviceId)
      return res.status(400).json({ error: "deviceId is required" });
    if (!reason) return res.status(400).json({ error: "reason is required" });

    // Check if already blocked
    const existing = await adminDb
      .collection("blockedDevices")
      .doc(deviceId)
      .get();
    if (existing.exists) {
      return res.status(409).json({ error: "Device is already blocked" });
    }

    await adminDb
      .collection("blockedDevices")
      .doc(deviceId)
      .set({
        deviceId,
        reason,
        targetUid: targetUid || null,
        blockedAt: new Date().toISOString(),
        blockedBy: req.adminEmail || "admin",
      });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "BLOCK_DEVICE",
      targetUid: targetUid || undefined,
      details: { deviceId, reason },
    });

    return res.json({ success: true, message: "Device blocked successfully" });
  } catch (error: any) {
    console.error("Error blocking device:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to block device" });
  }
}

/**
 * Unblock a device
 * DELETE /devices/unblock/:deviceId
 */
export async function unblockDevice(req: AdminRequest, res: Response) {
  try {
    const { deviceId } = req.params;
    if (!deviceId)
      return res.status(400).json({ error: "deviceId is required" });

    await adminDb.collection("blockedDevices").doc(deviceId).delete();

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "UNBLOCK_DEVICE",
      details: { deviceId },
    });

    return res.json({
      success: true,
      message: "Device unblocked successfully",
    });
  } catch (error: any) {
    console.error("Error unblocking device:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to unblock device" });
  }
}

/**
 * Get all known devices for a specific user (from loginHistory)
 * GET /users/:uid/devices
 */
export async function getUserDevices(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "User ID is required" });

    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists)
      return res.status(404).json({ error: "User not found" });

    const data = userDoc.data() || {};
    const loginHistory: any[] = data.loginHistory || [];
    const deviceInfo = data.deviceInfo || null;

    // Collect unique devices from loginHistory
    const deviceMap = new Map<string, any>();
    loginHistory.forEach((entry: any) => {
      if (entry.deviceId) {
        if (!deviceMap.has(entry.deviceId)) {
          deviceMap.set(entry.deviceId, {
            deviceId: entry.deviceId,
            browser: entry.browser,
            os: entry.os,
            device: entry.device,
            lastSeen: entry.timestamp,
            ip: entry.ip,
          });
        }
      }
    });

    const devices = Array.from(deviceMap.values());
    if (deviceInfo && devices.length === 0) {
      devices.push({ deviceId: data.deviceId || "unknown", ...deviceInfo });
    }

    return res.json({ success: true, data: { devices, loginHistory } });
  } catch (error: any) {
    console.error("Error fetching user devices:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch user devices" });
  }
}
