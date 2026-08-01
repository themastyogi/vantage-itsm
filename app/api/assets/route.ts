import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireSession, assertRole } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const CreateAssetSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["server", "workstation", "network_device", "application", "license", "other"]),
  status: z.enum(["in_use", "in_stock", "under_maintenance", "retired"]).default("in_use"),
  owner: z.string().optional(),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  const rows = await db.select().from(assets).orderBy(desc(assets.createdAt));
  return NextResponse.json({ assets: rows });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
    assertRole(session, ["admin", "agent"]);
  } catch {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const id = randomUUID();
  await db.insert(assets).values({ id, ...parsed.data });

  await writeAudit({
    actorId: session.sub,
    action: "asset.create",
    entityType: "asset",
    entityId: id,
    metadata: { name: parsed.data.name, type: parsed.data.type },
  });

  return NextResponse.json({ id }, { status: 201 });
}
