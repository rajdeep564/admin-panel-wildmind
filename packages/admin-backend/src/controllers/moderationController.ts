import { Response } from "express";
import { adminDb, admin } from "../config/firebaseAdmin";
import { AdminRequest } from "../middleware/authMiddleware";
import { logAuditAction } from "./auditController";

/**
 * Suspend a user account
 * POST /users/:uid/suspend
 * Body: { reason: string, suspendedUntil?: string (ISO date) }
 */
export async function suspendUser(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    const { reason, suspendedUntil } = req.body;

    if (!uid) return res.status(400).json({ error: "User ID is required" });
    if (!reason) return res.status(400).json({ error: "Reason is required" });

    const updateData: any = {
      isSuspended: true,
      suspendReason: reason,
      suspendedAt: new Date().toISOString(),
      suspendedBy: req.adminEmail || "admin",
    };
    if (suspendedUntil) updateData.suspendedUntil = suspendedUntil;

    await adminDb.collection("users").doc(uid).update(updateData);

    // Revoke all tokens so they get logged out immediately
    await admin.auth().revokeRefreshTokens(uid);

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "SUSPEND_USER",
      targetUid: uid,
      details: { reason, suspendedUntil },
    });

    return res.json({ success: true, message: "User suspended successfully" });
  } catch (error: any) {
    console.error("Error suspending user:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to suspend user" });
  }
}

/**
 * Unsuspend a user account
 * POST /users/:uid/unsuspend
 */
export async function unsuspendUser(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "User ID is required" });

    await adminDb.collection("users").doc(uid).update({
      isSuspended: false,
      suspendReason: admin.firestore.FieldValue.delete(),
      suspendedAt: admin.firestore.FieldValue.delete(),
      suspendedBy: admin.firestore.FieldValue.delete(),
      suspendedUntil: admin.firestore.FieldValue.delete(),
    });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "UNSUSPEND_USER",
      targetUid: uid,
      details: {},
    });

    return res.json({
      success: true,
      message: "User unsuspended successfully",
    });
  } catch (error: any) {
    console.error("Error unsuspending user:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to unsuspend user" });
  }
}

/**
 * Ban a user account (permanent)
 * POST /users/:uid/ban
 * Body: { reason: string }
 */
export async function banUser(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    const { reason } = req.body;

    if (!uid) return res.status(400).json({ error: "User ID is required" });
    if (!reason) return res.status(400).json({ error: "Reason is required" });

    await adminDb
      .collection("users")
      .doc(uid)
      .update({
        isBanned: true,
        banReason: reason,
        bannedAt: new Date().toISOString(),
        bannedBy: req.adminEmail || "admin",
      });

    // Disable in Firebase Auth so they cannot regenerate tokens
    await admin.auth().updateUser(uid, { disabled: true });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "BAN_USER",
      targetUid: uid,
      details: { reason },
    });

    return res.json({ success: true, message: "User banned successfully" });
  } catch (error: any) {
    console.error("Error banning user:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to ban user" });
  }
}

/**
 * Unban a user account
 * POST /users/:uid/unban
 */
export async function unbanUser(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "User ID is required" });

    await adminDb.collection("users").doc(uid).update({
      isBanned: false,
      banReason: admin.firestore.FieldValue.delete(),
      bannedAt: admin.firestore.FieldValue.delete(),
      bannedBy: admin.firestore.FieldValue.delete(),
    });

    // Re-enable in Firebase Auth
    await admin.auth().updateUser(uid, { disabled: false });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "UNBAN_USER",
      targetUid: uid,
      details: {},
    });

    return res.json({ success: true, message: "User unbanned successfully" });
  } catch (error: any) {
    console.error("Error unbanning user:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to unban user" });
  }
}

/**
 * Force logout a user (revoke all sessions)
 * POST /users/:uid/force-logout
 */
export async function forceLogout(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "User ID is required" });

    await admin.auth().revokeRefreshTokens(uid);

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "FORCE_LOGOUT",
      targetUid: uid,
      details: {},
    });

    return res.json({
      success: true,
      message: "User sessions revoked successfully",
    });
  } catch (error: any) {
    console.error("Error force logging out user:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to force logout user" });
  }
}

/**
 * Set user role
 * PATCH /users/:uid/role
 * Body: { role: 'user' | 'premium' | 'creator' | 'moderator' | 'admin' }
 */
export async function setUserRole(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    if (!uid) return res.status(400).json({ error: "User ID is required" });

    const validRoles = ["user", "premium", "creator", "moderator", "admin"];
    if (!role || !validRoles.includes(role)) {
      return res
        .status(400)
        .json({
          error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        });
    }

    const previousDoc = await adminDb.collection("users").doc(uid).get();
    const previousRole = previousDoc.data()?.role || "user";

    await adminDb
      .collection("users")
      .doc(uid)
      .update({
        role,
        roleUpdatedAt: new Date().toISOString(),
        roleUpdatedBy: req.adminEmail || "admin",
      });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "SET_ROLE",
      targetUid: uid,
      details: { previousRole, newRole: role },
    });

    return res.json({ success: true, message: `Role updated to ${role}` });
  } catch (error: any) {
    console.error("Error setting user role:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to set user role" });
  }
}

/**
 * Manually verify a user's email
 * POST /users/:uid/verify-email
 */
export async function verifyUserEmail(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "User ID is required" });

    await admin.auth().updateUser(uid, { emailVerified: true });
    await adminDb
      .collection("users")
      .doc(uid)
      .update({
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        emailVerifiedBy: req.adminEmail || "admin",
      });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "VERIFY_EMAIL",
      targetUid: uid,
      details: {},
    });

    return res.json({ success: true, message: "Email verified successfully" });
  } catch (error: any) {
    console.error("Error verifying email:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to verify email" });
  }
}
