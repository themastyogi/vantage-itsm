import { AppShell } from "@/components/AppShell";
import { PageHeader, Card } from "@/components/ui";
import { Badge, TicketId } from "@/components/Badge";
import { db } from "@/lib/db";
import { incidents } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const rows = await db.select().from(incidents).orderBy(desc(incidents.createdAt));

  return (
    <AppShell>
      <PageHeader
        title="Incidents"
        subtitle={`${rows.length} total`}
        action={
          <Link
            href="/incidents/new"
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Report incident
          </Link>
        }
      />
      <div className="p-8">
        <Card>
          <div className="divide-y divide-border">
            {rows.length === 0 && (
              <div className="px-5 py-10 text-sm text-muted text-center">
                No incidents reported yet.
              </div>
            )}
            {rows.map((i) => (
              <Link
                key={i.id}
                href={`/incidents/${i.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-raised/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{i.title}</div>
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
      </div>
    </AppShell>
  );
}
