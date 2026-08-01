"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, Field, Input, Textarea, Select, Button } from "@/components/ui";
import type { ClientUser } from "@/lib/useSession";

export default function NewChangePage() {
  const router = useRouter();
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [riskLevel, setRiskLevel] = useState("medium");
  const [approverId, setApproverId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => {
      setUsers(d.users || []);
      const approver = (d.users || []).find((u: ClientUser) => u.role === "approver");
      if (approver) setApproverId(approver.id);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          riskLevel,
          approverId,
          scheduledFor: scheduledFor || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(JSON.stringify(data.error));
        return;
      }
      router.push(`/changes/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  const approvers = users.filter((u) => u.role === "approver" || u.role === "admin");

  return (
    <AppShell>
      <PageHeader title="Request a change" subtitle="Every change routes to an approver before it can be scheduled." />
      <div className="p-8 max-w-xl">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Title">
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Upgrade production DB to v16" />
            </Field>
            <Field label="Description">
              <Textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's changing, rollback plan, and expected impact."
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Risk level">
                <Select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </Field>
              <Field label="Approver">
                <Select required value={approverId} onChange={(e) => setApproverId(e.target.value)}>
                  <option value="">Select an approver</option>
                  {approvers.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Proposed schedule (optional)">
              <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </Field>
            {error && <div className="text-sm" style={{ color: "var(--priority-critical)" }}>{error}</div>}
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? "Submitting…" : "Submit for approval"}</Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
