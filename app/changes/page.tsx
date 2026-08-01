import { AppShell } from "@/components/AppShell";
import { PageHeader, Card } from "@/components/ui";
import { Badge, TicketId } from "@/components/Badge";
import { db } from "@/lib/db";
import { changes } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ChangesPage() {
  const rows = await db.select().from(changes).orderBy(desc(changes.createdAt));

  return (
    <AppShell>
      <PageHeader
        title="Changes"
        subtitle={`${rows.length} total`}
        action={
          <Link
            href="/changes/new"
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Request change
          </Link>
        }
      />
      <div className="p-8">
        <Card>
          <div className="divide-y divide-border">
            {rows.length === 0 && (
              <div className="px-5 py-10 text-sm text-muted text-center">No change requests yet.</div>
            )}
            {rows.map((c) => (
              <Link
                key={c.id}
                href={`/changes/${c.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-raised/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{c.title}</div>
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
    </AppShell>
  );
}
