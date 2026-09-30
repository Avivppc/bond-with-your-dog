import Link from "next/link";

/**
 * Admin UI kit — Kajabi-style (neutral, Inter 14px, dark pill buttons, white hairline cards).
 * Visual reference: docs/kajabi-research/sources/ui-reference.md
 */
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-[#343332] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black disabled:opacity-50";
export const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-[#d9d8d6] bg-white px-4 py-2 text-sm font-medium text-[#1a1a19] shadow-sm hover:bg-[#f3f3f2] disabled:opacity-50";
export const BTN_DANGER =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50";
export const INPUT =
  "w-full rounded-[8px] border border-[#d9d8d6] bg-white px-3 py-2 text-sm text-[#1a1a19] placeholder:text-[#9b9997] focus:border-[#343332] focus:outline-none focus:ring-2 focus:ring-black/5";
export const LABEL = "text-sm font-medium text-[#1a1a19]";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-[#6c6a69]">
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden>/</span>}
          {c.href ? (
            <Link href={c.href} className="hover:text-[#1a1a19] hover:underline">
              {c.label}
            </Link>
          ) : (
            <span className="font-medium text-[#1a1a19]">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

interface PageHeaderProps {
  title: string;
  crumbs?: readonly Crumb[];
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, crumbs, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-[#1a1a19]">{title}</h1>
          {description && <p className="mt-1 text-sm text-[#6c6a69]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

interface CardProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Tables and lists that run edge to edge. */
  flush?: boolean;
}

export function Card({ title, description, actions, children, className = "", flush = false }: CardProps) {
  return (
    <section className={`rounded-[12px] border border-[#e7e6e4] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            {title && <h2 className="text-base font-semibold text-[#1a1a19]">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-[#6c6a69]">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={flush ? "mt-4" : "p-5"}>{children}</div>
    </section>
  );
}

const PILL_TONES = {
  published: "bg-[#e3f5e8] text-[#1c6b35]",
  draft: "bg-[#f0efee] text-[#4b4a48]",
  warning: "bg-[#fdf1dc] text-[#8a5a00]",
  danger: "bg-[#fde8e8] text-[#a4262c]",
  info: "bg-[#e6f0fb] text-[#1d4f91]",
} as const;

export type PillTone = keyof typeof PILL_TONES;

export function StatusPill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL_TONES[tone]}`}>
      {tone === "published" && <span aria-hidden>✓</span>}
      {children}
    </span>
  );
}

export interface TabItem {
  key: string;
  label: string;
  href: string;
}

export function Tabs({ items, active }: { items: readonly TabItem[]; active: string }) {
  return (
    <nav className="flex gap-5 overflow-x-auto text-sm" aria-label="Sections">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={`whitespace-nowrap border-b-2 pb-2 font-medium ${
            t.key === active ? "border-[#1a1a19] text-[#1a1a19]" : "border-transparent text-[#6c6a69] hover:text-[#1a1a19]"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Notice({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-[8px] border px-4 py-3 text-sm ${
        tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {children}
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-medium text-[#1a1a19]">{title}</p>
      {children && <div className="mt-2 text-sm text-[#6c6a69]">{children}</div>}
    </div>
  );
}
