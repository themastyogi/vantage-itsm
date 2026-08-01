import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { incidents, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";

const CreateIncidentSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assetId: z.string().optional(),
  assigneeId: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    void session;
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const rows = await db.select().from(incidents).orderBy(desc(incidents.createdAt));
  return NextResponse.json({ incidents: rows });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const id = randomUUID();
  const now = new Date();
  await db.insert(incidents).values({
    id,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    status: "new",
    assetId: parsed.data.assetId || null,
    reporterId: session.sub,
    assigneeId: parsed.data.assigneeId || null,
    createdAt: now,
    updatedAt: now,
  });

  await writeAudit({
    actorId: session.sub,
    action: "incident.create",
    entityType: "incident",
    entityId: id,
    metadata: { title: parsed.data.title, priority: parsed.data.priority },
  });

  // Notify assignee (or all agents if unassigned) via Teams + email
  if (parsed.data.assigneeId) {
    await notifyUser({
      event: "incident.created",
      recipientUserId: parsed.data.assigneeId,
      subject: `[${parsed.data.priority.toUpperCase()}] New incident assigned: ${parsed.data.title}`,
      body: `${session.name} reported a new incident and assigned it to you.\n\n${parsed.data.description}`,
    });
  } else {
    const agents = await db.select().from(users).where(eq(users.role, "agent"));
    await Promise.all(
      agents.map((agent) =>
        notifyUser({
          event: "incident.created",
          recipientUserId: agent.id,
          subject: `[${parsed.data.priority.toUpperCase()}] New unassigned incident: ${parsed.data.title}`,
          body: `${session.name} reported a new incident.\n\n${parsed.data.description}`,
        })
      )
    );
  }

  return NextResponse.json({ id }, { status: 201 });
}
