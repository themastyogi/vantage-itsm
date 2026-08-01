"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, Button, Select, Field } from "@/components/ui";
import { Badge, TicketId } from "@/components/Badge";
import { useSession } from "@/lib/useSession";

const STATUSES = ["in_use", "in_stock", "under_maintenance", "retired"];

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const [asset, setAsset] = useState<any>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/assets/${id}`)
      .then((r) => r.json())
      .then((d) => { setAsset(d.asset || null); setStatus(d.asset?.status || ""); });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveStatus() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not update asset."); return; }
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!asset) {
    return (
      <AppShell>
        <PageHeader title="Asset" />
        <div className="p-8 text-sm text-muted">Loading…</div>
      </AppShell>
    );
  }

  const canOperate = user && ["agent", "admin"].includes(user.role);

  return (
    <AppShell>
      <PageHeader
        title={asset.name}
        subtitle={<TicketId prefix="AST" id={asset.id} />}
        action={<Button variant="secondary" onClick={() => router.push("/assets")}>Back to list</Button>}
      />
      <div className="p-8 grid grid-cols-3 gap-6">
        <Card className="col-span-2 p-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge value={asset.status} />
            <span className="text-xs text-muted">{asset.type.replace("_", " ")}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted mb-0.5">Owner</dt>
              <dd>{asset.owner || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted mb-0.5">Location</dt>
              <dd>{asset.location || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted mb-0.5">Serial number</dt>
              <dd>{asset.serialNumber || "—"}</dd>
            </div>
          </dl>
          {asset.notes && (
            <div>
              <dt className="text-xs text-muted mb-1">Notes</dt>
              <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <div className="text-xs text-muted font-mono-tag">LIFECYCLE</div>
          {canOperate ? (
            <>
              <Field label="Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </Select>
              </Field>
              <Button disabled={busy || status === asset.status} onClick={saveStatus}>
                {busy ? "Saving…" : "Update status"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted">Only agents or admins can update asset status.</p>
          )}
          {error && <p className="text-sm" style={{ color: "var(--priority-critical)" }}>{error}</p>}
        </Card>
      </div>
    </AppShell>
  );
}
