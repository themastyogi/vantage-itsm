"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Field, Input } from "@/components/ui";

const DEMO_ACCOUNTS = [
  { role: "admin", email: "admin@demo.itsm" },
  { role: "agent", email: "agent@demo.itsm" },
  { role: "approver", email: "approver@demo.itsm" },
  { role: "requester", email: "requester@demo.itsm" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Passw0rd!123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-2xl font-semibold tracking-tight">Vantage</div>
          <div className="text-xs text-muted font-mono-tag mt-1">ITSM CONSOLE — SIGN IN</div>
        </div>
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Work email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && (
              <div className="text-sm rounded-lg px-3 py-2" style={{ color: "var(--priority-critical)", background: "color-mix(in srgb, var(--priority-critical) 12%, transparent)" }}>
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
        <div className="mt-5 text-xs text-muted">
          <div className="mb-1.5 font-medium">Demo accounts (password: Passw0rd!123)</div>
          <div className="space-y-1 font-mono-tag">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                onClick={() => setEmail(a.email)}
                className="block hover:text-text"
                type="button"
              >
                {a.role.padEnd(10, " ")} {a.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
