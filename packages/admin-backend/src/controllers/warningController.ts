import { Response } from "express";
import { adminDb, admin } from "../config/firebaseAdmin";
import { AdminRequest } from "../middleware/authMiddleware";
import { logAuditAction } from "./auditController";

/**
 * Issue a warning to a user
 * POST /users/:uid/warnings
 * Body: { reason: string }
 */
export async function issueWarning(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    const { reason } = req.body;

    if (!uid) return res.status(400).json({ error: "User ID is required" });
    if (!reason) return res.status(400).json({ error: "Reason is required" });

    const warningRef = await adminDb.collection("userWarnings").add({
      uid,
      reason,
      issuedAt: new Date().toISOString(),
      issuedBy: req.adminEmail || "admin",
    });

    await adminDb
      .collection("users")
      .doc(uid)
      .update({
        warningCount: admin.firestore.FieldValue.increment(1),
        lastWarningAt: new Date().toISOString(),
      });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "ISSUE_WARNING",
      targetUid: uid,
      details: { reason, warningId: warningRef.id },
    });

    return res.json({
      success: true,
      message: "Warning issued",
      warningId: warningRef.id,
    });
  } catch (error: any) {
    console.error("Error issuing warning:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to issue warning" });
  }
}

/**
 * Get all warnings for a user
 * GET /users/:uid/warnings
 */
export async function getUserWarnings(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "User ID is required" });

    const snapshot = await adminDb
      .collection("userWarnings")
      .where("uid", "==", uid)
      .orderBy("issuedAt", "desc")
      .get();

    const warnings = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      data: { warnings, total: warnings.length },
    });
  } catch (error: any) {
    console.error("Error fetching warnings:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch warnings" });
  }
}

/**
 * Delete a warning
 * DELETE /users/:uid/warnings/:warningId
 */
export async function deleteWarning(req: AdminRequest, res: Response) {
  try {
    const { uid, warningId } = req.params;
    if (!warningId)
      return res.status(400).json({ error: "Warning ID is required" });

    await adminDb.collection("userWarnings").doc(warningId).delete();

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const currentCount = userDoc.data()?.warningCount || 0;
    if (currentCount > 0) {
      await adminDb
        .collection("users")
        .doc(uid)
        .update({
          warningCount: admin.firestore.FieldValue.increment(-1),
        });
    }

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "DELETE_WARNING",
      targetUid: uid,
      details: { warningId },
    });

    return res.json({ success: true, message: "Warning deleted" });
  } catch (error: any) {
    console.error("Error deleting warning:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to delete warning" });
  }
}
