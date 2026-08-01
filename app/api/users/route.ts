import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth";

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
