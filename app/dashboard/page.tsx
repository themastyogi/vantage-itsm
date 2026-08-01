import { AppShell } from "@/components/AppShell";
import { PageHeader, Card } from "@/components/ui";
import { Badge, TicketId } from "@/components/Badge";
import { db } from "@/lib/db";
import { incidents, changes, assets } from "@/lib/db/schema";
import { desc, ne } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [openIncidents, pendingChanges, allAssets, recentIncidents, recentChanges] = await Promise.all([
    db.select().from(incidents).where(ne(incidents.status, "closed")),
    db.select().from(changes).where(ne(changes.status, "closed")),
    db.select().from(assets),
    db.select().from(incidents).orderBy(desc(incidents.createdAt)).limit(5),
    db.select().from(changes).orderBy(desc(changes.createdAt)).limit(5),
  ]);

  const critical = openIncidents.filter((i) => i.priority === "critical").length;
  const awaitingApproval = pendingChanges.filter((c) => c.status === "pending_approval").length;

  const stats = [
    { label: "Open incidents", value: openIncidents.length, sub: `${critical} critical` },
    { label: "Changes in flight", value: pendingChanges.length, sub: `${awaitingApproval} awaiting approval` },
    { label: "Tracked assets", value: allAssets.length, sub: "CMDB" },
  ];

  return (
    <AppShell>
      <PageHeader title="Overview" subtitle="Service health across incidents, changes, and assets." />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="text-xs text-muted font-mono-tag mb-2">{s.label.toUpperCase()}</div>
              <div className="font-display text-3xl font-semibold">{s.value}</div>
              <div className="text-xs text-muted mt-1">{s.sub}</div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-display font-semibold">Recent incidents</h2>
              <Link href="/incidents" className="text-xs text-muted hover:text-text">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {recentIncidents.length === 0 && (
                <div className="px-5 py-8 text-sm text-muted text-center">No incidents yet.</div>
              )}
              {recentIncidents.map((i) => (
                <Link
                  key={i.id}
                  href={`/incidents/${i.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-surface-raised/60"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">{i.title}</div>
                    <TicketId prefix="INC" id={i.id} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge value={i.priority} />
                    <Badge value={i.status} />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-display font-semibold">Recent changes</h2>
              <Link href="/changes" className="text-xs text-muted hover:text-text">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {recentChanges.length === 0 && (
                <div className="px-5 py-8 text-sm text-muted text-center">No changes yet.</div>
              )}
              {recentChanges.map((c) => (
                <Link
                  key={c.id}
                  href={`/changes/${c.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-surface-raised/60"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">{c.title}</div>
                    <TicketId prefix="CHG" id={c.id} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge value={c.riskLevel} />
                    <Badge value={c.status} />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
