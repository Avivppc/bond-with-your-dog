import Link from "next/link";
import { isComingSoon } from "@/lib/member/coming-soon";

/** A small "Soon" tag for places that aren't open yet. */
export function SoonPill() {
  return <span className="pill soon">Soon</span>;
}

/**
 * A Link that turns into a greyed-out, non-clickable element with a "Soon" tag when it points at a
 * section that isn't open to members yet (see src/lib/member/coming-soon.ts).
 */
export function SoonLink({ href, className, style, children }: { href: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  if (!isComingSoon(href)) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <span className={`${className ?? ""} is-soon`.trim()} style={style} aria-disabled="true" title="Coming soon">
      {children}
      <SoonPill />
    </span>
  );
}
