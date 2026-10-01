import { memberViewer } from "@/lib/member/viewer";
import { isComingSoon } from "@/lib/member/coming-soon";
import { ComingSoon, TeamPreviewNote } from "@/components/app/ComingSoon";

/** Moves Library: members see "Coming soon" while it isn't open; the team keeps the real page. */
export default async function MovesLayout({ children }: { children: React.ReactNode }) {
  if (!isComingSoon("/moves")) return children;
  const viewer = await memberViewer();
  if (!viewer?.isStaff) {
    return (
      <ComingSoon icon="auto_stories" section="Moves Library">
        Every move with its cue, steps and a short clip, linked to its lesson. Roni is adding them now.
      </ComingSoon>
    );
  }
  return (
    <>
      <TeamPreviewNote section="the Moves Library" />
      {children}
    </>
  );
}
