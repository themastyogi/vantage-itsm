import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    await writeAudit({
      actorId: session.sub,
      action: "auth.logout",
      entityType: "user",
      entityId: session.sub,
    });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
