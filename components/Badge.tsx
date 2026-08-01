const STATUS_COLORS: Record<string, string> = {
  new: "var(--status-new)",
  acknowledged: "var(--status-acknowledged)",
  in_progress: "var(--status-progress)",
  resolved: "var(--status-resolved)",
  closed: "var(--status-closed)",
  draft: "var(--status-closed)",
  pending_approval: "var(--status-progress)",
  approved: "var(--status-resolved)",
  rejected: "var(--priority-critical)",
  scheduled: "var(--status-new)",
  implemented: "var(--status-resolved)",
  low: "var(--priority-low)",
  medium: "var(--priority-medium)",
  high: "var(--priority-high)",
  critical: "var(--priority-critical)",
  in_use: "var(--status-resolved)",
  in_stock: "var(--status-new)",
  under_maintenance: "var(--status-progress)",
  retired: "var(--status-closed)",
};

export function Badge({ value }: { value: string }) {
  const color = STATUS_COLORS[value] || "var(--muted)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium font-mono-tag"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {value.replace(/_/g, " ")}
    </span>
  );
}

/** Monospace ticket-id chip — the console's signature element. */
export function TicketId({ prefix, id }: { prefix: "INC" | "CHG" | "AST"; id: string }) {
  const short = id.replace(/-/g, "").slice(0, 6).toUpperCase();
  return (
    <span className="font-mono-tag text-xs text-muted tracking-wider">
      {prefix}-{short}
    </span>
  );
}
