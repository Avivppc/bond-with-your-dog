"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeStep, joinChallenge, rsvp } from "@/app/community/actions";
import { BTN, BTN_GHOST } from "./bits";

export function JoinChallengeButton({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className={BTN}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await joinChallenge(challengeId);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Joining…" : "Join challenge"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}

interface Step {
  id: string;
  title: string;
  body: string | null;
  done: boolean;
}

/** Check off a challenge's steps; the DB awards the points when every step is done. */
export function StepList({ steps, enabled }: { steps: readonly Step[]; enabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState(() => new Set(steps.filter((s) => s.done).map((s) => s.id)));
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={s.id} className="rounded-[12px] border border-[#e7e6e4] bg-white p-4">
          <label className={`flex items-start gap-3 ${enabled ? "cursor-pointer" : ""}`}>
            <input
              type="checkbox"
              checked={done.has(s.id)}
              disabled={!enabled || pending}
              onChange={(e) => {
                const checked = e.target.checked;
                setDone((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(s.id);
                  else next.delete(s.id);
                  return next;
                });
                start(async () => {
                  const res = await completeStep(s.id, checked);
                  if (res.ok) router.refresh();
                });
              }}
              className="mt-1 h-5 w-5 accent-[#0e666a]"
            />
            <span className="min-w-0">
              <span className={`block font-semibold ${done.has(s.id) ? "text-[#6c6a69] line-through" : ""}`}>
                {i + 1}. {s.title}
              </span>
              {s.body && <span className="mt-1 block whitespace-pre-wrap text-sm text-[#6c6a69]">{s.body}</span>}
            </span>
          </label>
        </li>
      ))}
    </ol>
  );
}

export function RsvpButton({ meetupId, going }: { meetupId: string; going: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={going ? BTN_GHOST : BTN}
      onClick={() =>
        start(async () => {
          const res = await rsvp(meetupId, !going);
          if (res.ok) router.refresh();
        })
      }
    >
      {pending ? "…" : going ? "✓ Going — cancel RSVP" : "RSVP — I'm going"}
    </button>
  );
}
