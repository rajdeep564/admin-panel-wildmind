import { Response } from "express";
import { adminDb } from "../config/firebaseAdmin";
import { AdminRequest } from "../middleware/authMiddleware";
import { logAuditAction } from "./auditController";

const RESEND_API_BASE = process.env.RESEND_API_BASE || "https://api.resend.com";

/**
 * Send email via Resend API (primary) — same pattern as api-gateway-services-wildmind
 * Requires: RESEND_API_KEY and SMTP_FROM in .env
 */
async function sendEmailViaResend(
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.SMTP_FROM;

  if (!resendApiKey) {
    console.warn("[ADMIN MAIL] RESEND_API_KEY not configured");
    return false;
  }
  if (!from) {
    console.warn("[ADMIN MAIL] SMTP_FROM not configured");
    return false;
  }

  try {
    const payload: Record<string, any> = { from, to, subject, text };
    if (html) payload.html = html;

    console.log(`[ADMIN MAIL] Sending email via Resend to ${to}`);

    const resp = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      const result = await resp.json().catch(() => ({}));
      console.log(`[ADMIN MAIL] Resend: email sent to ${to}`, result);
      return true;
    } else {
      const errTxt = await resp.text().catch(() => "");
      console.error(
        `[ADMIN MAIL] Resend failed: ${resp.status} ${resp.statusText}`,
        errTxt,
      );
      return false;
    }
  } catch (e: any) {
    console.error(`[ADMIN MAIL] Resend error: ${e?.message}`);
    return false;
  }
}

/**
 * Send a direct email to a user
 * POST /broadcast/email
 * Body: { uid, subject, body }
 */
export async function sendDirectEmail(req: AdminRequest, res: Response) {
  try {
    const { uid, subject, body } = req.body;

    if (!uid) return res.status(400).json({ error: "uid is required" });
    if (!subject) return res.status(400).json({ error: "subject is required" });
    if (!body) return res.status(400).json({ error: "body is required" });

    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists)
      return res.status(404).json({ error: "User not found" });

    const email = userDoc.data()?.email;
    if (!email)
      return res.status(400).json({ error: "User has no email address" });

    const htmlBody = `<div style="font-family: sans-serif; line-height: 1.6;">${body.replace(/\n/g, "<br>")}</div>`;
    const sent = await sendEmailViaResend(email, subject, body, htmlBody);

    // Log to Firestore regardless of send status
    await adminDb.collection("emailLogs").add({
      uid,
      to: email,
      subject,
      body,
      sentAt: new Date().toISOString(),
      sentBy: req.adminEmail || "admin",
      sent,
    });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "SEND_EMAIL",
      targetUid: uid,
      details: { to: email, subject, sent },
    });

    return res.json({
      success: true,
      message: sent
        ? "Email sent successfully via Resend"
        : "Email logged but not sent — configure RESEND_API_KEY and SMTP_FROM in .env",
      data: { to: email, subject, sent },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to send email" });
  }
}

/**
 * Create a broadcast announcement
 * POST /broadcast/announcement
 * Body: { title, body, targetGroup: 'all' | 'premium' | 'free' | 'creator', expiresAt? }
 */
export async function createAnnouncement(req: AdminRequest, res: Response) {
  try {
    const { title, body, targetGroup = "all", expiresAt } = req.body;

    if (!title) return res.status(400).json({ error: "title is required" });
    if (!body) return res.status(400).json({ error: "body is required" });

    const validGroups = ["all", "premium", "free", "creator"];
    if (!validGroups.includes(targetGroup)) {
      return res
        .status(400)
        .json({
          error: `Invalid targetGroup. Must be one of: ${validGroups.join(", ")}`,
        });
    }

    const announcementRef = await adminDb.collection("announcements").add({
      title,
      body,
      targetGroup,
      expiresAt: expiresAt || null,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: req.adminEmail || "admin",
    });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "CREATE_ANNOUNCEMENT",
      details: { title, targetGroup, id: announcementRef.id },
    });

    return res.json({
      success: true,
      message: "Announcement created",
      data: { id: announcementRef.id },
    });
  } catch (error: any) {
    console.error("Error creating announcement:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to create announcement" });
  }
}

/**
 * Get all announcements
 * GET /broadcast/announcements
 */
export async function getAnnouncements(req: AdminRequest, res: Response) {
  try {
    const snapshot = await adminDb
      .collection("announcements")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const announcements = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ success: true, data: { announcements } });
  } catch (error: any) {
    console.error("Error fetching announcements:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to fetch announcements" });
  }
}

/**
 * Deactivate an announcement
 * PATCH /broadcast/announcements/:id/deactivate
 */
export async function deactivateAnnouncement(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ error: "Announcement ID is required" });

    await adminDb.collection("announcements").doc(id).update({ active: false });

    await logAuditAction({
      adminEmail: req.adminEmail || "admin",
      action: "DEACTIVATE_ANNOUNCEMENT",
      details: { id },
    });

    return res.json({ success: true, message: "Announcement deactivated" });
  } catch (error: any) {
    console.error("Error deactivating announcement:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to deactivate announcement" });
  }
}
