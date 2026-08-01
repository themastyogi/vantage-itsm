"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, Button } from "@/components/ui";
import { Badge, TicketId } from "@/components/Badge";
import { useSession } from "@/lib/useSession";

const NEXT_STATUS: Record<string, string[]> = {
  new: ["acknowledged"],
  acknowledged: ["in_progress"],
  in_progress: ["resolved"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const [incident, setIncident] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/incidents/${id}`)
      .then((r) => r.json())
      .then((d) => setIncident(d.incident || null));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function transition(status: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update incident.");
        return;
      }
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!incident) {
    return (
      <AppShell>
        <PageHeader title="Incident" />
        <div className="p-8 text-sm text-muted">Loading…</div>
      </AppShell>
    );
  }

  const canAct = user && ["agent", "admin"].includes(user.role);
  const nextOptions = NEXT_STATUS[incident.status] || [];

  return (
    <AppShell>
      <PageHeader
        title={incident.title}
        subtitle={<TicketId prefix="INC" id={incident.id} />}
        action={<Button variant="secondary" onClick={() => router.push("/incidents")}>Back to list</Button>}
      />
      <div className="p-8 grid grid-cols-3 gap-6">
        <Card className="col-span-2 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge value={incident.priority} />
            <Badge value={incident.status} />
          </div>
          <p className="text-sm text-text/90 whitespace-pre-wrap leading-relaxed">{incident.description}</p>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <div className="text-xs text-muted font-mono-tag mb-2">WORKFLOW</div>
            {canAct && nextOptions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {nextOptions.map((s) => (
                  <Button key={s} variant={s === "closed" ? "secondary" : "primary"} disabled={busy} onClick={() => transition(s)}>
                    Move to {s.replace("_", " ")}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                {incident.status === "closed" ? "This incident is closed." : "Only agents or admins can change status."}
              </p>
            )}
            {error && <p className="text-sm mt-2" style={{ color: "var(--priority-critical)" }}>{error}</p>}
          </div>
          <div className="pt-4 border-t border-border text-xs text-muted space-y-1">
            <div>Created {new Date(incident.createdAt).toLocaleString()}</div>
            <div>Updated {new Date(incident.updatedAt).toLocaleString()}</div>
            {incident.resolvedAt && <div>Resolved {new Date(incident.resolvedAt).toLocaleString()}</div>}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
