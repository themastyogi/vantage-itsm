import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireSession, assertRole } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession();
    assertRole(session, ["admin"]);
  } catch {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }
  const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500);
  return NextResponse.json({ logs: rows });
}
