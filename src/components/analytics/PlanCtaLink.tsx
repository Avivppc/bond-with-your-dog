import type { ReactNode } from "react";
import TrackedLink from "@/components/analytics/TrackedLink";
import { EVENTS, type PlanCtaProps } from "@/lib/analytics-events";

interface PlanCtaLinkProps extends Omit<PlanCtaProps, "cta_label"> {
  href: string;
  label: string;
  className?: string;
  /** Extra content after the label, e.g. an arrow icon. */
  children?: ReactNode;
}

/** A CTA for one of the three course chapters, reported as `plan_cta_clicked`. */
export default function PlanCtaLink({ href, label, plan, location, className, children }: PlanCtaLinkProps) {
  return (
    <TrackedLink
      href={href}
      event={EVENTS.planCtaClicked}
      props={{ plan, location, cta_label: label }}
      className={className}
    >
      {label}
      {children}
    </TrackedLink>
  );
}
