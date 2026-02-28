import { Response } from "express";
import { adminDb } from "../config/firebaseAdmin";
import { AdminRequest } from "../middleware/authMiddleware";

export interface AuditLogEntry {
  adminEmail: string;
  action: string;
  targetUid?: string;
  details: Record<string, any>;
}

/**
 * Internal helper — log an admin action to the auditLogs collection.
 * Call this from every mutation controller.
 */
export async function logAuditAction(entry: AuditLogEntry): Promise<void> {
  try {
    await adminDb.collection("auditLogs").add({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal — log to console but don't blow up the parent request
    console.error("[AuditLog] Failed to write audit log:", err);
  }
}

/**
 * Get audit logs with optional filters + pagination
 * GET /audit-logs?adminEmail=&targetUid=&limit=50&cursor=
 */
export async function getAuditLogs(req: AdminRequest, res: Response) {
  try {
    const { adminEmail, targetUid, limit = 50, cursor } = req.query;
    const fetchLimit = Math.min(parseInt(limit as string, 10) || 50, 200);

    let query: any = adminDb
      .collection("auditLogs")
      .orderBy("timestamp", "desc");

    if (adminEmail && typeof adminEmail === "string") {
      query = query.where("adminEmail", "==", adminEmail);
    }
    if (targetUid && typeof targetUid === "string") {
      query = query.where("targetUid", "==", targetUid);
    }

    if (cursor) {
      const cursorDoc = await adminDb
        .collection("auditLogs")
        .doc(cursor as string)
        .get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.limit(fetchLimit).get();

    const logs = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const hasMore = logs.length === fetchLimit;
    const nextCursor = hasMore ? logs[logs.length - 1].id : null;

    return res.json({
      success: true,
      data: { logs, nextCursor, hasMore, total: logs.length },
    });
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch audit logs" });
  }
}
