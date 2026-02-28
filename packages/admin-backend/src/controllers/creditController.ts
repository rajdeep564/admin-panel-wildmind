import { Response } from "express";
import { adminDb } from "../config/firebaseAdmin";
import { AdminRequest } from "../middleware/authMiddleware";
import { logAuditAction } from "./auditController";

/**
 * Adjust credits for a user (add or subtract)
 * POST /users/:uid/adjust-credits
 * Body: { amount: number, reason: string }
 */
export async function adjustCredits(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    const { amount, reason } = req.body;

    if (!uid) return res.status(400).json({ error: "User ID is required" });
    if (amount === undefined || amount === null)
      return res.status(400).json({ error: "amount is required" });
    if (!reason) return res.status(400).json({ error: "Reason is required" });

    const parsedAmount = parseInt(String(amount), 10);
    if (isNaN(parsedAmount))
      return res.status(400).json({ error: "amount must be a number" });

    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists)
      return res.status(404).json({ error: "User not found" });
    const currentBalance = userDoc.data()?.creditBalance || 0;
    const newBalance = Math.max(0, currentBalance + parsedAmount);

    await adminDb
      .collection("users")
      .doc(uid)
      .update({ creditBalance: newBalance });

    await adminDb.collection("creditHistory").add({
      uid,
      amount: parsedAmount,
      reason,
      previousBalance: currentBalance,
      newBalance,
      adjustedAt: new Date().toISOString(),
      adjustedBy: req.adminEmail || "admin",
    });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: parsedAmount >= 0 ? "ADD_CREDITS" : "DEDUCT_CREDITS",
      targetUid: uid,
      details: {
        amount: parsedAmount,
        reason,
        previousBalance: currentBalance,
        newBalance,
      },
    });

    return res.json({
      success: true,
      message: `Credits ${parsedAmount >= 0 ? "added" : "deducted"} successfully`,
      data: {
        previousBalance: currentBalance,
        newBalance,
        change: parsedAmount,
      },
    });
  } catch (error: any) {
    console.error("Error adjusting credits:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to adjust credits" });
  }
}

/**
 * Get credit history for a user
 * GET /users/:uid/credit-history
 */
export async function getCreditHistory(req: AdminRequest, res: Response) {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "User ID is required" });

    const snapshot = await adminDb
      .collection("creditHistory")
      .where("uid", "==", uid)
      .orderBy("adjustedAt", "desc")
      .limit(100)
      .get();

    const history = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      data: { history, total: history.length },
    });
  } catch (error: any) {
    console.error("Error fetching credit history:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch credit history" });
  }
}
