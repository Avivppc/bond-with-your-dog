"use client";

import { TIER_LABELS, type Tier } from "@/lib/quiz/data";
import { LIMITS, MAX_LEARN_ITEMS } from "@/lib/quiz/config";
import type { ResultDraft } from "@/lib/quiz/draft";
import { Card } from "../../_components/ui";
import { TextField } from "./fields";

interface ResultEditorProps {
  tier: Tier;
  result: ResultDraft;
  onChange: (patch: Partial<ResultDraft>) => void;
}

/** One chapter's result: shown at the end of the quiz and emailed to the visitor. */
export function ResultEditor({ tier, result, onChange }: ResultEditorProps) {
  return (
    <Card title={`${TIER_LABELS[tier]} result`} description="Shown at the end of the quiz and sent in the results email.">
      <div className="flex flex-col gap-4">
        <TextField
          label="Personal note"
          hint="The first line they read, above the headline."
          value={result.personalization}
          maxLength={LIMITS.personalization}
          rows={2}
          onChange={(personalization) => onChange({ personalization })}
        />
        <TextField label="Headline" value={result.headline} maxLength={LIMITS.headline} onChange={(headline) => onChange({ headline })} />
        <TextField label="Supporting text" value={result.supporting} maxLength={LIMITS.supporting} rows={3} onChange={(supporting) => onChange({ supporting })} />
        <TextField
          label="You'll learn"
          hint={`One per line, up to ${MAX_LEARN_ITEMS}.`}
          value={result.learnText}
          maxLength={MAX_LEARN_ITEMS * (LIMITS.learnItem + 1)}
          rows={5}
          onChange={(learnText) => onChange({ learnText })}
        />
        <TextField
          label="First lesson"
          hint="In the results email."
          value={result.firstLesson}
          maxLength={LIMITS.firstLesson}
          onChange={(firstLesson) => onChange({ firstLesson })}
        />
        <TextField
          label="Welcome gift"
          hint="In the results email."
          value={result.welcomeOffer}
          maxLength={LIMITS.welcomeOffer}
          onChange={(welcomeOffer) => onChange({ welcomeOffer })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Button text"
            value={result.cta.label}
            maxLength={LIMITS.ctaLabel}
            onChange={(label) => onChange({ cta: { ...result.cta, label } })}
          />
          <TextField
            label="Button link"
            hint="A page on this site (/chapter/moves) or a full https:// address."
            value={result.cta.href}
            maxLength={LIMITS.ctaHref}
            placeholder="/chapter/moves"
            onChange={(href) => onChange({ cta: { ...result.cta, href } })}
          />
        </div>
      </div>
    </Card>
  );
}
