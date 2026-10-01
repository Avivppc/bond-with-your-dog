import Link from "next/link";
import { ChapterCard } from "@/components/chapters/ChapterCard";
import type { Stage } from "@/components/chapters/stages";
import type { ChapterChoice } from "@/lib/member/chapter-choice";

const CTA = "font-label text-sm font-semibold px-5 py-2.5 rounded-full inline-flex items-center justify-center gap-1.5 w-full";

function ChoiceButton({ stage, choice }: { stage: Stage; choice: ChapterChoice }) {
  if (!choice.href) {
    return (
      <span className={`${CTA} bg-surface-container text-on-surface-variant cursor-default`} aria-disabled="true">
        <span className="material-symbols-outlined text-sm">schedule</span>
        {choice.label}
      </span>
    );
  }
  return (
    <Link href={choice.href} className={`${CTA} ${stage.ctaBg} hover:opacity-90 transition-opacity`}>
      {choice.label}
      <span className="material-symbols-outlined text-sm">arrow_forward</span>
    </Link>
  );
}

/** The chapters a member can still choose, as compact cards in the website's style. */
export function ChapterChoices({ stages, choices }: { stages: readonly Stage[]; choices: ReadonlyMap<string, ChapterChoice> }) {
  return (
    <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${stages.length > 2 ? "xl:grid-cols-3" : ""}`}>
      {stages.map((stage) => {
        const choice = choices.get(stage.courseId);
        if (!choice) return null;
        return <ChapterCard key={stage.courseId} stage={stage} note={choice.note} cta={<ChoiceButton stage={stage} choice={choice} />} />;
      })}
    </div>
  );
}
