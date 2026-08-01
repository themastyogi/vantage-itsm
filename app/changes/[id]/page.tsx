"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, Button, Textarea, Field } from "@/components/ui";
import { Badge, TicketId } from "@/components/Badge";
import { useSession } from "@/lib/useSession";

const NEXT_STATUS: Record<string, string[]> = {
  approved: ["scheduled"],
  scheduled: ["implemented"],
  implemented: ["closed"],
};

export default function ChangeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const [change, setChange] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/changes/${id}`)
      .then((r) => r.json())
      .then((d) => setChange(d.change || null));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/changes/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comment: comment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not record decision."); return; }
      load();
    } finally {
      setBusy(false);
    }
  }

  async function transition(status: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/changes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not update change."); return; }
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!change) {
    return (
      <AppShell>
        <PageHeader title="Change" />
        <div className="p-8 text-sm text-muted">Loading…</div>
      </AppShell>
    );
  }

  const isApprover = user && (user.id === change.approverId || user.role === "admin");
  const canOperate = user && ["agent", "admin"].includes(user.role);
  const nextOptions = NEXT_STATUS[change.status] || [];

  return (
    <AppShell>
      <PageHeader
        title={change.title}
        subtitle={<TicketId prefix="CHG" id={change.id} />}
        action={<Button variant="secondary" onClick={() => router.push("/changes")}>Back to list</Button>}
      />
      <div className="p-8 grid grid-cols-3 gap-6">
        <Card className="col-span-2 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge value={change.riskLevel} />
            <Badge value={change.status} />
          </div>
          <p className="text-sm text-text/90 whitespace-pre-wrap leading-relaxed">{change.description}</p>
          {change.scheduledFor && (
            <p className="text-xs text-muted mt-4">Scheduled for {new Date(change.scheduledFor).toLocaleString()}</p>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <div className="text-xs text-muted font-mono-tag">WORKFLOW</div>

          {change.status === "pending_approval" && isApprover && (
            <div className="space-y-2">
              <Field label="Decision comment (optional)">
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Rationale for the reviewer's record" />
              </Field>
              <div className="flex gap-2">
                <Button disabled={busy} onClick={() => decide("approved")}>Approve</Button>
                <Button variant="danger" disabled={busy} onClick={() => decide("rejected")}>Reject</Button>
              </div>
            </div>
          )}

          {change.status === "pending_approval" && !isApprover && (
            <p className="text-sm text-muted">Awaiting a decision from the assigned approver.</p>
          )}

          {canOperate && nextOptions.length > 0 && (
            <div className="flex flex-col gap-2">
              {nextOptions.map((s) => (
                <Button key={s} variant="secondary" disabled={busy} onClick={() => transition(s)}>
                  Move to {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          )}

          {change.status === "closed" && <p className="text-sm text-muted">This change is closed.</p>}
          {change.status === "rejected" && <p className="text-sm text-muted">This change was rejected.</p>}

          {error && <p className="text-sm" style={{ color: "var(--priority-critical)" }}>{error}</p>}

          <div className="pt-4 border-t border-border text-xs text-muted space-y-1">
            <div>Created {new Date(change.createdAt).toLocaleString()}</div>
            <div>Updated {new Date(change.updatedAt).toLocaleString()}</div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
