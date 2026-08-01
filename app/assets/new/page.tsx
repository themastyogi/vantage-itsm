"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Card, Field, Input, Textarea, Select, Button } from "@/components/ui";

export default function NewAssetPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("server");
  const [status, setStatus] = useState("in_use");
  const [owner, setOwner] = useState("");
  const [location, setLocation] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, status, owner, location, serialNumber, notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(JSON.stringify(data.error)); return; }
      router.push(`/assets/${data.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Add an asset" subtitle="Configuration items for the CMDB." />
      <div className="p-8 max-w-xl">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Name">
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="PROD-WEB-03" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="server">Server</option>
                  <option value="workstation">Workstation</option>
                  <option value="network_device">Network device</option>
                  <option value="application">Application</option>
                  <option value="license">License</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="in_use">In use</option>
                  <option value="in_stock">In stock</option>
                  <option value="under_maintenance">Under maintenance</option>
                  <option value="retired">Retired</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Owner">
                <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Team or person" />
              </Field>
              <Field label="Location">
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Datacenter / office" />
              </Field>
            </div>
            <Field label="Serial number (optional)">
              <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </Field>
            <Field label="Notes (optional)">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            {error && <div className="text-sm" style={{ color: "var(--priority-critical)" }}>{error}</div>}
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Add asset"}</Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
