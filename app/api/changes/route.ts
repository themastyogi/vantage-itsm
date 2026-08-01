import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { changes } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";

const CreateChangeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
  approverId: z.string().min(1, "An approver is required."),
  assetId: z.string().optional(),
  scheduledFor: z.string().optional(),
});

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  const rows = await db.select().from(changes).orderBy(desc(changes.createdAt));
  return NextResponse.json({ changes: rows });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const id = randomUUID();
  const now = new Date();

  // Requests go straight into the approval queue — no change ships without a
  // recorded decision, matching how the workflow engine gates "approved -> scheduled".
  await db.insert(changes).values({
    id,
    title: parsed.data.title,
    description: parsed.data.description,
    riskLevel: parsed.data.riskLevel,
    status: "pending_approval",
    requesterId: session.sub,
    approverId: parsed.data.approverId,
    assetId: parsed.data.assetId || null,
    scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null,
    createdAt: now,
    updatedAt: now,
  });

  await writeAudit({
    actorId: session.sub,
    action: "change.create",
    entityType: "change",
    entityId: id,
    metadata: { title: parsed.data.title, riskLevel: parsed.data.riskLevel },
  });

  await notifyUser({
    event: "change.pending_approval",
    recipientUserId: parsed.data.approverId,
    subject: `Change approval needed: ${parsed.data.title} (${parsed.data.riskLevel} risk)`,
    body: `${session.name} submitted a change request that needs your approval.\n\n${parsed.data.description}`,
  });

  return NextResponse.json({ id }, { status: 201 });
}
