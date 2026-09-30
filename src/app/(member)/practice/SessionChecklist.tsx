import { Ms } from "@/components/app/ui";
import { checklistState, type Stage } from "@/lib/practice/session";

/** "Session checklist" card: Warm-up · steps · Cool-down with done / now / later states. */
export function SessionChecklist({ stages, current, completed }: { stages: readonly Stage[]; current: number; completed: ReadonlySet<number> }) {
  return (
    <div className="card tight">
      <span className="eyebrow muted">Session checklist</span>
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Session checklist">
        {stages.map((stage, i) => {
          const state = checklistState(i, current, completed);
          return (
            <li
              key={i}
              className={`check-row ${state === "lock" ? "faint" : ""}`}
              style={state === "next" ? { fontWeight: 600 } : undefined}
              aria-current={i === current ? "step" : undefined}
            >
              <span className={`state-ic ${state}`}>
                {state === "done" && <Ms name="check" />}
                {state === "next" && <Ms name="more_horiz" />}
              </span>
              <span>
                {stage.label}
                <span className="sr-only">{state === "done" ? " (done)" : state === "next" ? " (now)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
