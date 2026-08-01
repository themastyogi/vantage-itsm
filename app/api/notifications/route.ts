import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(200);
  return NextResponse.json({ notifications: rows });
}
