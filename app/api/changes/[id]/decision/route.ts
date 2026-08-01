import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { changes, changeApprovals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { canTransitionChange, type ChangeStatus } from "@/lib/workflow";

const DecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = DecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rows = await db.select().from(changes).where(eq(changes.id, id)).limit(1);
  const current = rows[0];
  if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Only the designated approver (or an admin, for break-glass override) may decide.
  if (session.role !== "admin" && session.sub !== current.approverId) {
    await writeAudit({
      actorId: session.sub,
      action: "change.decision_denied",
      entityType: "change",
      entityId: id,
      metadata: { attemptedDecision: parsed.data.decision },
    });
    return NextResponse.json(
      { error: "Only the assigned approver can decide on this change." },
      { status: 403 }
    );
  }

  const targetStatus: ChangeStatus = parsed.data.decision === "approved" ? "approved" : "rejected";
  const check = canTransitionChange(current.status as ChangeStatus, targetStatus, session.role === "admin" ? "approver" : session.role);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  await db.insert(changeApprovals).values({
    id: randomUUID(),
    changeId: id,
    approverId: session.sub,
    decision: parsed.data.decision,
    comment: parsed.data.comment || null,
  });

  await db
    .update(changes)
    .set({ status: targetStatus, updatedAt: new Date() })
    .where(eq(changes.id, id));

  await writeAudit({
    actorId: session.sub,
    action: `change.${parsed.data.decision}`,
    entityType: "change",
    entityId: id,
    metadata: { comment: parsed.data.comment },
  });

  await notifyUser({
    event: parsed.data.decision === "approved" ? "change.approved" : "change.rejected",
    recipientUserId: current.requesterId,
    subject: `Change "${current.title}" was ${parsed.data.decision}`,
    body: `${session.name} ${parsed.data.decision} your change request.${
      parsed.data.comment ? `\n\nComment: ${parsed.data.comment}` : ""
    }`,
  });

  return NextResponse.json({ ok: true });
}
