import { AppShell } from "@/components/AppShell";
import { PageHeader, Card } from "@/components/ui";
import { Badge, TicketId } from "@/components/Badge";
import { db } from "@/lib/db";
import { assets } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const rows = await db.select().from(assets).orderBy(desc(assets.createdAt));

  return (
    <AppShell>
      <PageHeader
        title="Assets · CMDB"
        subtitle={`${rows.length} tracked`}
        action={
          <Link
            href="/assets/new"
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Add asset
          </Link>
        }
      />
      <div className="p-8">
        <Card>
          <div className="divide-y divide-border">
            {rows.length === 0 && (
              <div className="px-5 py-10 text-sm text-muted text-center">No assets tracked yet.</div>
            )}
            {rows.map((a) => (
              <Link
                key={a.id}
                href={`/assets/${a.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-raised/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{a.name}</div>
                  <div className="flex items-center gap-2">
                    <TicketId prefix="AST" id={a.id} />
                    <span className="text-xs text-muted">· {a.type.replace("_", " ")}</span>
                  </div>
                </div>
                <Badge value={a.status} />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
