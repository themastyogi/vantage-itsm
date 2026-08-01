import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSession, assertRole, hashPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const UpdateSchema = z.object({
  role: z.enum(["admin", "agent", "approver", "requester"]).optional(),
  active: z.boolean().optional(),
  newPassword: z.string().min(8).optional(),
});

// Admin-only: change a user's role, activate/deactivate, or reset their password.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireSession();
    assertRole(session, ["admin"]);
  } catch {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (id === session.sub && parsed.data.active === false) {
    return NextResponse.json({ error: "You can't deactivate your own account." }, { status: 400 });
  }
  if (id === session.sub && parsed.data.role && parsed.data.role !== "admin") {
    return NextResponse.json({ error: "You can't remove your own admin role." }, { status: 400 });
  }

  const updates: { role?: typeof parsed.data.role; active?: boolean; passwordHash?: string } = {};
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.active !== undefined) updates.active = parsed.data.active;
  if (parsed.data.newPassword) updates.passwordHash = await hashPassword(parsed.data.newPassword);

  await db.update(users).set(updates).where(eq(users.id, id));

  await writeAudit({
    actorId: session.sub,
    action: "user.update",
    entityType: "user",
    entityId: id,
    metadata: {
      role: parsed.data.role,
      active: parsed.data.active,
      passwordReset: Boolean(parsed.data.newPassword),
    },
  });

  return NextResponse.json({ ok: true });
}
