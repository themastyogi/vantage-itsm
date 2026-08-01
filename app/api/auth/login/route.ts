import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserByEmail, verifyPassword, createSessionCookie } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimit";
import { writeAudit } from "@/lib/audit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password format." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const rlKey = `${ip}:${email}`;
  const rl = checkRateLimit(rlKey);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const user = await getUserByEmail(email);
  // Constant-shape response whether or not the user exists, to avoid user enumeration.
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    await writeAudit({
      actorId: user?.id ?? null,
      action: "auth.login_failed",
      entityType: "user",
      entityId: user?.id ?? email,
      ipAddress: ip,
    });
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  resetRateLimit(rlKey);
  await createSessionCookie({
    sub: user.id,
    email: user.email,
    role: user.role as any,
    name: user.name,
  });

  await writeAudit({
    actorId: user.id,
    action: "auth.login_success",
    entityType: "user",
    entityId: user.id,
    ipAddress: ip,
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
