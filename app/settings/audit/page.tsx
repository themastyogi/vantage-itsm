import { AppShell } from "@/components/AppShell";
import { PageHeader, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/dashboard");
  }

  const [logs, allUsers] = await Promise.all([
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(300),
    db.select().from(users),
  ]);
  const nameById = new Map(allUsers.map((u) => [u.id, u.name]));

  return (
    <AppShell>
      <PageHeader title="Audit log" subtitle="Every state change and authentication event, admin-only." />
      <div className="p-8">
        <Card>
          <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {logs.length === 0 && (
              <div className="px-5 py-10 text-sm text-muted text-center">No activity recorded yet.</div>
            )}
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono-tag text-xs text-muted shrink-0">
                    {new Date(l.createdAt).toLocaleString()}
                  </span>
                  <span className="font-mono-tag text-xs" style={{ color: "var(--accent)" }}>
                    {l.action}
                  </span>
                  <span className="text-muted truncate">
                    {l.entityType}/{l.entityId.slice(0, 8)}
                  </span>
                </div>
                <span className="text-xs text-muted shrink-0 ml-3">
                  {l.actorId ? nameById.get(l.actorId) || l.actorId.slice(0, 8) : "system"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
