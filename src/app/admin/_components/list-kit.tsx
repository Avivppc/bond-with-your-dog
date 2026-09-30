import Link from "next/link";

/** Building blocks for Kajabi-style lists and summary cards (companions to ./ui.tsx). */

export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- avatars come from our public storage bucket
    return <img src={src} alt="" style={style} className="shrink-0 rounded-full border border-[#e7e6e4] object-cover" />;
  }
  return (
    <span
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-[#efeeed] text-[12px] font-semibold uppercase text-[#4b4a48]"
      aria-hidden
    >
      {(name.trim() || "?").charAt(0)}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  icon?: string;
}

/** Small white summary card (Kajabi's right-column cards and Pricing stats). */
export function StatCard({ label, value, hint, href, icon }: StatCardProps) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-[14px] text-[#6c6a69]">
        {icon && (
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            {icon}
          </span>
        )}
        {label}
      </p>
      <p className="mt-1 text-[24px] font-semibold tracking-tight text-[#1a1a19]">{value}</p>
      {hint && <p className="mt-0.5 text-[12px] text-[#9b9997]">{hint}</p>}
    </>
  );
  const box = "block rounded-[12px] border border-[#e7e6e4] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]";
  return href ? (
    <Link href={href} className={`${box} hover:border-[#d9d8d6] hover:bg-[#fafaf9]`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

interface PaginationProps {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
}

export function Pagination({ page, pages, hrefFor }: PaginationProps) {
  if (pages <= 1) return null;
  const btn = "flex h-8 w-8 items-center justify-center rounded-full border border-[#d9d8d6] bg-white hover:bg-[#f3f3f2]";
  return (
    <nav className="flex items-center gap-2" aria-label="Pages">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={btn} aria-label="Previous page">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            chevron_left
          </span>
        </Link>
      ) : null}
      <span className="text-[14px] text-[#6c6a69]">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={btn} aria-label="Next page">
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            chevron_right
          </span>
        </Link>
      ) : null}
    </nav>
  );
}

/** Kajabi's ⋯ options menu; children are links or small forms styled with MENU_ITEM. */
export function OptionsMenu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="relative inline-block text-left">
      <summary
        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-[#6c6a69] hover:bg-[#efeeed]"
        aria-label={label}
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          more_horiz
        </span>
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-52 rounded-[12px] border border-[#e7e6e4] bg-white p-1 shadow-lg">{children}</div>
    </details>
  );
}

export const MENU_ITEM = "block w-full rounded-[8px] px-3 py-2 text-left text-[14px] text-[#1a1a19] hover:bg-[#f3f3f2]";

const DATE_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" };

/** "Oct 1, 2026" (UTC, so server and client agree); "—" when missing. */
export function shortDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString("en-US", DATE_FORMAT) : "—";
}
