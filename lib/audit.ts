import { randomUUID } from "crypto";
import { db } from "./db";
import { auditLogs } from "./db/schema";

export async function writeAudit(entry: {
  actorId: string | null;
  action: string; // e.g. "incident.create", "change.approve"
  entityType: string; // "incident" | "change" | "asset" | "user"
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await db.insert(auditLogs).values({
    id: randomUUID(),
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    ipAddress: entry.ipAddress || null,
  });
}
