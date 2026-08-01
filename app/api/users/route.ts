import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSession, assertRole, hashPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  const rows = await db.select().from(users);
  const safe = rows.map(({ passwordHash, ...rest }) => rest);
  return NextResponse.json({ users: safe });
}

const CreateUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["admin", "agent", "approver", "requester"]),
});

// Admin-only: add a new employee/user.
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
    assertRole(session, ["admin"]);
  } catch {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const id = randomUUID();

  try {
    await db.insert(users).values({
      id,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
    });
  } catch (err) {
    // Unique constraint on email — surface a clean message instead of a raw DB error.
    return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
  }

  await writeAudit({
    actorId: session.sub,
    action: "user.create",
    entityType: "user",
    entityId: id,
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  return NextResponse.json({ id }, { status: 201 });
}
