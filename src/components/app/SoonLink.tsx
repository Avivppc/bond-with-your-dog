import Link from "next/link";
import { isComingSoon } from "@/lib/member/coming-soon";

/** A small "Soon" tag for places that aren't open yet. */
export function SoonPill() {
  return <span className="pill soon">Soon</span>;
}

interface SoonLinkProps {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * For content rows (a dog's moves, milestones): while the section is closed the row simply stops
   * being a link — no grey-out and no tag, so a list of them doesn't look disabled.
   */
  quiet?: boolean;
  children: React.ReactNode;
}

/**
 * A Link that turns into a greyed-out, non-clickable element with a "Soon" tag when it points at a
 * section that isn't open to members yet (see src/lib/member/coming-soon.ts).
 */
export function SoonLink({ href, className, style, quiet = false, children }: SoonLinkProps) {
  if (!isComingSoon(href)) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  if (quiet) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <span className={`${className ?? ""} is-soon`.trim()} style={style} aria-disabled="true" title="Coming soon">
      {children}
      <SoonPill />
    </span>
  );
}
