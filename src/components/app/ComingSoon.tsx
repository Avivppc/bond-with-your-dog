import Link from "next/link";
import { StateCard } from "./ui";

/** What members see on a section that isn't open yet (src/lib/member/coming-soon.ts). */
export function ComingSoon({ icon, section, children }: { icon: string; section: string; children: React.ReactNode }) {
  return (
    <StateCard
      icon={icon}
      tone="teal"
      eyebrow={section}
      title="Coming soon"
      action={
        <Link className="btn btn-primary btn-sm" href="/my-courses">
          Go to My Courses
        </Link>
      }
    >
      {children}
    </StateCard>
  );
}

/** A note for the team, who still see the real page while members get "Coming soon". */
export function TeamPreviewNote({ section }: { section: string }) {
  return (
    <p className="pill soon" style={{ height: "auto", padding: "6px 12px", textTransform: "none", letterSpacing: 0, fontSize: 12.5 }}>
      Team preview: members see &ldquo;Coming soon&rdquo; on {section} for now.
    </p>
  );
}
