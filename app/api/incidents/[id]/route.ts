import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { incidents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { canTransitionIncident, type IncidentStatus } from "@/lib/workflow";

const UpdateSchema = z.object({
  status: z.enum(["new", "acknowledged", "in_progress", "resolved", "closed"]).optional(),
  assigneeId: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  const { id } = await params;
  const rows = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ incident: rows[0] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rows = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  const current = rows[0];
  if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updates: Partial<typeof current> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };

  if (parsed.data.status && parsed.data.status !== current.status) {
    const check = canTransitionIncident(
      current.status as IncidentStatus,
      parsed.data.status as IncidentStatus,
      session.role
    );
    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: 403 });
    }
    updates.status = parsed.data.status;
    if (parsed.data.status === "resolved") {
      updates.resolvedAt = new Date();
    }
  }

  if (parsed.data.assigneeId) {
    updates.assigneeId = parsed.data.assigneeId;
  }

  await db.update(incidents).set(updates).where(eq(incidents.id, id));

  await writeAudit({
    actorId: session.sub,
    action: "incident.update",
    entityType: "incident",
    entityId: id,
    metadata: updates,
  });

  if (updates.status) {
    await notifyUser({
      event: "incident.status_changed",
      recipientUserId: current.reporterId,
      subject: `Incident "${current.title}" is now ${updates.status.replace("_", " ")}`,
      body: `${session.name} updated the status of your incident to "${updates.status.replace("_", " ")}".`,
    });
  }

  return NextResponse.json({ ok: true });
}
