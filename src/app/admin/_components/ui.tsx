import Link from "next/link";

/**
 * Admin UI kit — Kajabi's tokens, measured from the client's Kajabi (docs/member-app/spec.md):
 * Inter 14px · page #f8f8f8 · text #1a1a19 · muted #6c6a69 · primary button #343332 pill, 8px 16px,
 * weight 500, ~38px tall · white cards, 12px radius, hairline borders · green/neutral status pills.
 * Radii are explicit (rounded-[…]) because the site theme redefines rounded-lg/xl.
 */
export const BTN_PRIMARY =
  "inline-flex h-[38px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#343332] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#1a1a19] disabled:opacity-50";
export const BTN_SECONDARY =
  "inline-flex h-[38px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#d9d8d6] bg-white px-4 py-2 text-[14px] font-medium text-[#1a1a19] hover:bg-[#f3f3f2] disabled:opacity-50";
export const BTN_DANGER =
  "inline-flex h-[38px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-red-200 bg-white px-4 py-2 text-[14px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50";
/** Small outline pill (filters, range pickers, "Load more"). */
export const PILL =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#d9d8d6] bg-white px-3 py-1.5 text-[14px] text-[#1a1a19] hover:bg-[#f8f8f8]";
export const INPUT =
  "w-full rounded-[8px] border border-[#d9d8d6] bg-white px-3 py-2 text-[14px] text-[#1a1a19] placeholder:text-[#9b9997] focus:border-[#343332] focus:outline-none focus:ring-2 focus:ring-black/5";
export const LABEL = "text-[14px] font-medium text-[#1a1a19]";
export const MUTED = "text-[#6c6a69]";

/** Table cells shared by every Kajabi-style list. */
export const TABLE = "w-full text-[14px]";
export const THEAD = "border-y border-[#efeeed] text-left text-[#6c6a69]";
export const TH = "px-4 py-3 font-medium first:pl-5 last:pr-5";
export const TD = "px-4 py-3 align-middle first:pl-5 last:pr-5";
export const TROW = "border-b border-[#efeeed] last:border-0 hover:bg-[#fafaf9]";

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
