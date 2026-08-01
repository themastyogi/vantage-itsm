export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-8 py-6 border-b border-border">
      <div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <div className="text-sm text-muted mt-1">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-surface ${className}`}>{children}</div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "text-[var(--accent-ink)]",
    secondary: "bg-surface-raised text-text border border-border hover:bg-surface",
    danger: "bg-[color-mix(in_srgb,var(--priority-critical)_20%,transparent)] text-[var(--priority-critical)] border border-[color-mix(in_srgb,var(--priority-critical)_40%,transparent)]",
  };
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      style={variant === "primary" ? { background: "var(--accent)" } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)]";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} min-h-[100px]`} {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClass} {...props} />;
}
