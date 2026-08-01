import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { changes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { canTransitionChange, type ChangeStatus } from "@/lib/workflow";

const UpdateSchema = z.object({
  status: z.enum(["scheduled", "implemented", "closed", "draft"]),
  scheduledFor: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  const { id } = await params;
  const rows = await db.select().from(changes).where(eq(changes.id, id)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ change: rows[0] });
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

  const rows = await db.select().from(changes).where(eq(changes.id, id)).limit(1);
  const current = rows[0];
  if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const check = canTransitionChange(
    current.status as ChangeStatus,
    parsed.data.status as ChangeStatus,
    session.role
  );
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  await db
    .update(changes)
    .set({
      status: parsed.data.status,
      scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : current.scheduledFor,
      updatedAt: new Date(),
    })
    .where(eq(changes.id, id));

  await writeAudit({
    actorId: session.sub,
    action: "change.update",
    entityType: "change",
    entityId: id,
    metadata: { status: parsed.data.status },
  });

  await notifyUser({
    event: "change.scheduled",
    recipientUserId: current.requesterId,
    subject: `Change "${current.title}" is now ${parsed.data.status}`,
    body: `${session.name} moved your change request to "${parsed.data.status}".`,
  });

  return NextResponse.json({ ok: true });
}
