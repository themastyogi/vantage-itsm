import nodemailer from "nodemailer";
import { randomUUID } from "crypto";
import { db } from "./db";
import { notifications, users } from "./db/schema";
import { eq } from "drizzle-orm";

export type NotificationEvent =
  | "incident.created"
  | "incident.status_changed"
  | "change.pending_approval"
  | "change.approved"
  | "change.rejected"
  | "change.scheduled";

interface NotifyInput {
  event: NotificationEvent;
  recipientUserId: string;
  subject: string;
  body: string; // plain text; converted to a Teams card + HTML email
}

let cachedTransporter: nodemailer.Transporter | null | undefined;

function getTransporter() {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    cachedTransporter = null; // not configured — caller will log a "skipped" notification
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return cachedTransporter;
}

async function logNotification(row: {
  channel: "teams" | "email";
  event: string;
  recipient: string;
  subject: string;
  body: string;
  status: "sent" | "failed" | "skipped";
  error?: string;
}) {
  await db.insert(notifications).values({
    id: randomUUID(),
    ...row,
  });
}

async function sendTeams(subject: string, body: string, recipientLabel: string, event: string) {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) {
    await logNotification({
      channel: "teams",
      event,
      recipient: recipientLabel,
      subject,
      body,
      status: "skipped",
      error: "TEAMS_WEBHOOK_URL not configured",
    });
    return;
  }

  // MS Teams Incoming Webhook — Adaptive Card payload
  const card = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: subject,
    themeColor: "1F2A44",
    title: subject,
    text: body,
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });
    if (!res.ok) throw new Error(`Teams webhook responded ${res.status}`);
    await logNotification({
      channel: "teams",
      event,
      recipient: recipientLabel,
      subject,
      body,
      status: "sent",
    });
  } catch (err) {
    await logNotification({
      channel: "teams",
      event,
      recipient: recipientLabel,
      subject,
      body,
      status: "failed",
      error: err instanceof Error ? err.message : "unknown error",
    });
  }
}

async function sendEmail(subject: string, body: string, recipientEmail: string, event: string) {
  const transporter = getTransporter();
  if (!transporter) {
    await logNotification({
      channel: "email",
      event,
      recipient: recipientEmail,
      subject,
      body,
      status: "skipped",
      error: "SMTP not configured",
    });
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "itsm@yourcompany.example",
      to: recipientEmail,
      subject,
      text: body,
      html: `<p style="font-family:sans-serif">${body.replace(/\n/g, "<br/>")}</p>`,
    });
    await logNotification({
      channel: "email",
      event,
      recipient: recipientEmail,
      subject,
      body,
      status: "sent",
    });
  } catch (err) {
    await logNotification({
      channel: "email",
      event,
      recipient: recipientEmail,
      subject,
      body,
      status: "failed",
      error: err instanceof Error ? err.message : "unknown error",
    });
  }
}

/**
 * Fan-out a workflow event to a user's opted-in channels (Teams + email).
 * This is the single choke point every workflow transition calls, so
 * delivery, opt-out, and audit logging stay consistent everywhere.
 */
export async function notifyUser(input: NotifyInput) {
  const rows = await db.select().from(users).where(eq(users.id, input.recipientUserId)).limit(1);
  const user = rows[0];
  if (!user) return;

  const jobs: Promise<void>[] = [];
  if (user.teamsWebhookOptIn) {
    jobs.push(sendTeams(input.subject, input.body, user.name, input.event));
  }
  if (user.emailOptIn) {
    jobs.push(sendEmail(input.subject, input.body, user.email, input.event));
  }
  await Promise.all(jobs);
}
