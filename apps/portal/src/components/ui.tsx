import { palette } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  tilt = false,
  elevated = false,
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: boolean;
  elevated?: boolean;
}) {
  return (
    <div
      className={cn(
        elevated ? "glass-card-elevated p-6" : "glass-card p-6",
        tilt && "card-3d",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  const color = accent ?? palette.orchidHush;
  return (
    <div className="glass-card card-3d p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--angora-goat)]">{value}</p>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
          style={{ background: `${color}28`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--angora-goat)]">{title}</h1>
        {description ? (
          <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  color,
  variant = "default",
}: {
  children: React.ReactNode;
  color?: string;
  variant?: "default" | "success" | "warning";
}) {
  const resolved =
    color ??
    (variant === "success"
      ? palette.orchidHush
      : variant === "warning"
        ? palette.cinemaScreen
        : palette.endlessSlumber);

  return (
    <span
      className="inline-flex items-center rounded-full border border-white/10 px-2.5 py-0.5 text-xs font-medium"
      style={{ background: `${resolved}24`, color: resolved }}
    >
      {children}
    </span>
  );
}
