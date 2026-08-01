import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession, assertRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const UpdateSchema = z.object({
  status: z.enum(["in_use", "in_stock", "under_maintenance", "retired"]).optional(),
  owner: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  const { id } = await params;
  const rows = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ asset: rows[0] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireSession();
    assertRole(session, ["admin", "agent"]);
  } catch {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await db.update(assets).set(parsed.data).where(eq(assets.id, id));

  await writeAudit({
    actorId: session.sub,
    action: "asset.update",
    entityType: "asset",
    entityId: id,
    metadata: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
