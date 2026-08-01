import { AppShell } from "@/components/AppShell";
import { PageHeader, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

const STATUS_COLOR: Record<string, string> = {
  sent: "var(--status-resolved)",
  failed: "var(--priority-critical)",
  skipped: "var(--muted)",
};

export const dynamic = "force-dynamic";

export default async function NotificationsSettingsPage() {
  const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
  const teamsConfigured = Boolean(process.env.TEAMS_WEBHOOK_URL);
  const emailConfigured = Boolean(process.env.SMTP_HOST);

  return (
    <AppShell>
      <PageHeader title="Notifications" subtitle="Delivery channels and recent send history." />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold">Microsoft Teams</h3>
              <span
                className="text-xs font-mono-tag px-2 py-0.5 rounded-full"
                style={{
                  color: teamsConfigured ? "var(--status-resolved)" : "var(--muted)",
                  background: `color-mix(in srgb, ${teamsConfigured ? "var(--status-resolved)" : "var(--muted)"} 15%, transparent)`,
                }}
              >
                {teamsConfigured ? "connected" : "not configured"}
              </span>
            </div>
            <p className="text-sm text-muted">
              Set <code className="font-mono-tag">TEAMS_WEBHOOK_URL</code> to an Incoming Webhook URL
              from a Teams channel connector. Every workflow event posts an adaptive card there.
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold">Email (SMTP)</h3>
              <span
                className="text-xs font-mono-tag px-2 py-0.5 rounded-full"
                style={{
                  color: emailConfigured ? "var(--status-resolved)" : "var(--muted)",
                  background: `color-mix(in srgb, ${emailConfigured ? "var(--status-resolved)" : "var(--muted)"} 15%, transparent)`,
                }}
              >
                {emailConfigured ? "connected" : "not configured"}
              </span>
            </div>
            <p className="text-sm text-muted">
              Set <code className="font-mono-tag">SMTP_HOST</code>, <code className="font-mono-tag">SMTP_USER</code>,{" "}
              <code className="font-mono-tag">SMTP_PASS</code>, and <code className="font-mono-tag">SMTP_FROM</code>.
            </p>
          </Card>
        </div>

        <Card>
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-display font-semibold">Recent deliveries</h2>
          </div>
          <div className="divide-y divide-border">
            {rows.length === 0 && (
              <div className="px-5 py-10 text-sm text-muted text-center">
                No notifications sent yet — trigger one by creating an incident or change.
              </div>
            )}
            {rows.map((n) => (
              <div key={n.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{n.subject}</div>
                  <div className="text-xs text-muted font-mono-tag">
                    {n.channel.toUpperCase()} → {n.recipient} · {n.event}
                  </div>
                </div>
                <span
                  className="text-xs font-mono-tag px-2 py-0.5 rounded-full shrink-0 ml-3"
                  style={{
                    color: STATUS_COLOR[n.status],
                    background: `color-mix(in srgb, ${STATUS_COLOR[n.status]} 15%, transparent)`,
                  }}
                >
                  {n.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
