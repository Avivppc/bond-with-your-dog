import Link from "next/link";
import { ChapterStage } from "@/components/chapters/ChapterStage";
import type { Stage } from "@/components/chapters/stages";
import type { ChapterChoice } from "@/lib/member/chapter-choice";

const CTA = "font-label text-base font-semibold px-8 py-4 rounded-full inline-flex items-center justify-center gap-2 w-full sm:w-auto";

function ChoiceButton({ stage, choice }: { stage: Stage; choice: ChapterChoice }) {
  if (!choice.href) {
    return (
      <span className={`${CTA} bg-surface-container text-on-surface-variant cursor-not-allowed`} aria-disabled="true">
        <span className="material-symbols-outlined text-sm">schedule</span>
        {choice.label}
      </span>
    );
  }
  return (
    <Link href={choice.href} className={`${CTA} ${stage.ctaBg} hover:scale-105 transition-transform`}>
      {choice.label}
      <span className="material-symbols-outlined text-sm">arrow_forward</span>
    </Link>
  );
}

/** The website's chapter sections inside My Courses, with what this member can do with each. */
export function ChapterChoices({ stages, choices }: { stages: readonly Stage[]; choices: ReadonlyMap<string, ChapterChoice> }) {
  return (
    <div className="stack">
      {stages.map((stage) => {
        const choice = choices.get(stage.courseId);
        if (!choice) return null;
        return (
          <ChapterStage
            key={stage.courseId}
            compact
            stage={stage}
            status={choice.note ? <span className="font-label text-sm text-on-surface-variant">{choice.note}</span> : undefined}
            cta={<ChoiceButton stage={stage} choice={choice} />}
          />
        );
      })}
    </div>
  );
}
