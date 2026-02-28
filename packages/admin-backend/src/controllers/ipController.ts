import { Response } from "express";
import { adminDb } from "../config/firebaseAdmin";
import { AdminRequest } from "../middleware/authMiddleware";
import { logAuditAction } from "./auditController";

/**
 * List all blocked IPs
 * GET /ips/blocked
 */
export async function listBlockedIPs(req: AdminRequest, res: Response) {
  try {
    const snapshot = await adminDb
      .collection("blockedIPs")
      .orderBy("blockedAt", "desc")
      .get();

    const ips = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ success: true, data: { ips, total: ips.length } });
  } catch (error: any) {
    console.error("Error listing blocked IPs:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to list blocked IPs" });
  }
}

/**
 * Block an IP address
 * POST /ips/block
 * Body: { ip, reason, targetUid? }
 */
export async function blockIP(req: AdminRequest, res: Response) {
  try {
    const { ip, reason, targetUid } = req.body;
    if (!ip) return res.status(400).json({ error: "ip is required" });
    if (!reason) return res.status(400).json({ error: "reason is required" });

    const docId = ip.replace(/[./:]/g, "_");

    const existing = await adminDb.collection("blockedIPs").doc(docId).get();
    if (existing.exists) {
      return res.status(409).json({ error: "IP is already blocked" });
    }

    await adminDb
      .collection("blockedIPs")
      .doc(docId)
      .set({
        ip,
        reason,
        targetUid: targetUid || null,
        blockedAt: new Date().toISOString(),
        blockedBy: req.adminEmail || "admin",
      });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "BLOCK_IP",
      targetUid: targetUid || undefined,
      details: { ip, reason },
    });

    return res.json({ success: true, message: "IP blocked successfully" });
  } catch (error: any) {
    console.error("Error blocking IP:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to block IP" });
  }
}

/**
 * Unblock an IP address
 * DELETE /ips/unblock/:ip
 */
export async function unblockIP(req: AdminRequest, res: Response) {
  try {
    const { ip } = req.params;
    if (!ip) return res.status(400).json({ error: "ip is required" });

    const docId = ip.replace(/[./:]/g, "_");
    await adminDb.collection("blockedIPs").doc(docId).delete();

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "UNBLOCK_IP",
      details: { ip },
    });

    return res.json({ success: true, message: "IP unblocked successfully" });
  } catch (error: any) {
    console.error("Error unblocking IP:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to unblock IP" });
  }
}

/**
 * Get all distinct IPs used by a user (from loginHistory)
 * GET /users/:uid/ips
 */
export async function getUserIPs(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "User ID is required" });

    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists)
      return res.status(404).json({ error: "User not found" });

    const data = userDoc.data() || {};
    const loginHistory: any[] = data.loginHistory || [];

    const blockedSnapshot = await adminDb.collection("blockedIPs").get();
    const blockedIPs = new Set(
      blockedSnapshot.docs.map((d: any) => d.data().ip),
    );

    const ipMap = new Map<string, any>();
    loginHistory.forEach((entry: any) => {
      if (entry.ip && !ipMap.has(entry.ip)) {
        ipMap.set(entry.ip, {
          ip: entry.ip,
          lastSeen: entry.timestamp,
          deviceId: entry.deviceId || null,
          isBlocked: blockedIPs.has(entry.ip),
        });
      }
    });

    return res.json({
      success: true,
      data: { ips: Array.from(ipMap.values()) },
    });
  } catch (error: any) {
    console.error("Error fetching user IPs:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch user IPs" });
  }
}
