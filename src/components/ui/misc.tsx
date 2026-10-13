import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

export function Card({ className, children, as: Tag = "div" }: { className?: string; children: ReactNode; as?: "div" | "section" | "article" | "li" }) {
  return <Tag className={cn("card", className)}>{children}</Tag>;
}

type Tone = "green" | "clay" | "gray" | "red" | "amber" | "moss";
const tones: Record<Tone, string> = {
  green: "bg-forest-50 text-forest-800 ring-1 ring-forest-600/15",
  moss: "bg-moss-100 text-moss-700 ring-1 ring-moss-500/20",
  clay: "bg-clay-50 text-clay-700 ring-1 ring-clay-500/20",
  gray: "bg-sand text-muted ring-1 ring-forest-900/10",
  red: "bg-danger-50 text-danger-700 ring-1 ring-danger-600/15",
  amber: "bg-warning-50 text-warning-700 ring-1 ring-warning-700/15",
};

export function Badge({ tone = "green", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("chip", tones[tone], className)}>{children}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center animate-fade-in">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-forest-50 text-3xl text-forest-700" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: ReactNode; back?: string; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-start gap-3">
      {back && (
        <Link
          href={back}
          className="-ml-2 mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-forest-800 hover:bg-forest-50"
          aria-label="Wróć"
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-[1.65rem] font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Alert({ tone = "info", title, children }: { tone?: "info" | "success" | "error" | "warning"; title?: string; children: ReactNode }) {
  const styles = {
    info: "bg-forest-50 text-forest-900 ring-forest-600/15",
    success: "bg-forest-50 text-forest-900 ring-forest-600/20",
    error: "bg-danger-50 text-danger-700 ring-danger-600/20",
    warning: "bg-warning-50 text-warning-700 ring-warning-700/20",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl px-4 py-3 text-sm ring-1", styles)}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn(title && "mt-0.5")}>{children}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-forest-900/[0.06]", className)} aria-hidden="true" />;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-end justify-between">
      <h2 className="text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 100;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
      <div className="h-full rounded-full bg-moss-300 transition-all duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}
