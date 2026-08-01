"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Field, Input, Select } from "@/components/ui";
import { PageHeader, Card, Button } from "@/components/ui";
import { useSession } from "@/lib/useSession";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent" | "approver" | "requester";
  active: boolean;
}

const ROLES = ["requester", "agent", "approver", "admin"] as const;

export default function UsersSettingsPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<typeof ROLES[number]>("requester");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setEmployees(d.users || []));
  }, []);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    if (user?.role === "admin") load();
  }, [user, loading, router, load]);

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
        return;
      }
      setName(""); setEmail(""); setPassword(""); setRole("requester");
      setShowForm(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function updateEmployee(id: string, patch: Partial<{ role: string; active: boolean }>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not update user.");
        return;
      }
      load();
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user || user.role !== "admin") {
    return (
      <AppShell>
        <PageHeader title="Users" />
        <div className="p-8 text-sm text-muted">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Users"
        subtitle={`${employees.length} people · add employees, set roles, deactivate access`}
        action={
          <Button onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Add employee"}
          </Button>
        }
      />
      <div className="p-8 space-y-6">
        {showForm && (
          <Card className="p-6 max-w-lg">
            <form onSubmit={addEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full name">
                  <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
                </Field>
                <Field label="Work email">
                  <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@company.com" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Temporary password">
                  <Input required type="text" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                </Field>
                <Field label="Role">
                  <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </Field>
              </div>
              {error && <div className="text-sm" style={{ color: "var(--priority-critical)" }}>{error}</div>}
              <Button type="submit" disabled={busy}>{busy ? "Adding…" : "Add employee"}</Button>
              <p className="text-xs text-muted">
                Share this password with them directly and have them treat it as temporary — there's no self-service reset yet, so an admin can set a new one from this page if needed.
              </p>
            </form>
          </Card>
        )}

        <Card>
          <div className="divide-y divide-border">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm flex items-center gap-2">
                    {emp.name}
                    {!emp.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-mono-tag" style={{ color: "var(--muted)", background: "color-mix(in srgb, var(--muted) 15%, transparent)" }}>
                        inactive
                      </span>
                    )}
                    {emp.id === user.id && <span className="text-xs text-muted">(you)</span>}
                  </div>
                  <div className="text-xs text-muted">{emp.email}</div>
                </div>
                <Select
                  className="w-36"
                  value={emp.role}
                  disabled={busy || (emp.id === user.id)}
                  onChange={(e) => updateEmployee(emp.id, { role: e.target.value })}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
                <Button
                  variant={emp.active ? "danger" : "secondary"}
                  disabled={busy || emp.id === user.id}
                  onClick={() => updateEmployee(emp.id, { active: !emp.active })}
                >
                  {emp.active ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            ))}
          </div>
        </Card>
        {error && !showForm && <p className="text-sm" style={{ color: "var(--priority-critical)" }}>{error}</p>}
      </div>
    </AppShell>
  );
}
