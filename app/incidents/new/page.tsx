"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, Field, Input, Textarea, Select, Button } from "@/components/ui";
import type { ClientUser } from "@/lib/useSession";

export default function NewIncidentPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((d) => setUsers(d.users || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority, assigneeId: assigneeId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(JSON.stringify(data.error));
        return;
      }
      router.push(`/incidents/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  const agents = users.filter((u) => u.role === "agent" || u.role === "admin");

  return (
    <AppShell>
      <PageHeader title="Report an incident" subtitle="Agents and admins are notified via Teams and email." />
      <div className="p-8 max-w-xl">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Title">
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Checkout API returning 500s" />
            </Field>
            <Field label="Description">
              <Textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's happening, when it started, and who's affected."
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Priority">
                <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </Field>
              <Field label="Assign to (optional)">
                <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">Unassigned — notify all agents</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            {error && <div className="text-sm" style={{ color: "var(--priority-critical)" }}>{error}</div>}
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? "Submitting…" : "Report incident"}</Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
