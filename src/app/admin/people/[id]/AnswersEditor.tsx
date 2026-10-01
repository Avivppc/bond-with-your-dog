"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GOALS, SESSION_LENGTHS } from "@/lib/member/schemas";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL } from "../../_components/ui";
import { resetMemberOnboarding, saveMemberAnswers, type AnswersResult } from "./answers-actions";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type GoalKey = (typeof GOALS)[number]["key"];
const isGoal = (g: string): g is GoalKey => GOALS.some((x) => x.key === g);

export interface MemberAnswers {
  goals: string[];
  sessionMinutes: number | null;
  practiceDays: number[];
  location: string | null;
  onboardedAt: string | null;
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Contacts → a member: edit their welcome-questions answers, or send them through the questions again. */
export function AnswersEditor({ userId, answers }: { userId: string; answers: MemberAnswers }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [goals, setGoals] = useState<GoalKey[]>(answers.goals.filter(isGoal));
  const [minutes, setMinutes] = useState(answers.sessionMinutes ?? 10);
  const [days, setDays] = useState(answers.practiceDays);
  const [location, setLocation] = useState(answers.location ?? "");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function run(action: () => Promise<AnswersResult>, done: string) {
    setMessage(null);
    start(async () => {
      const res = await action();
      if (!res.ok) return setMessage({ tone: "error", text: res.error });
      setMessage({ tone: "ok", text: done });
      setEditing(false);
      router.refresh();
    });
  }

  const save = () => run(() => saveMemberAnswers(userId, { goals, sessionMinutes: minutes as 5 | 10 | 15, practiceDays: days, location }), "Answers saved.");
  const reset = () => {
    if (!window.confirm("Ask this member to answer the welcome questions again next time they open the app?")) return;
    run(() => resetMemberOnboarding(userId), "They'll see the welcome questions on their next visit.");
  };

  return (
    <div className="mt-3 space-y-3">
      {message && <p className={`text-[13px] ${message.tone === "ok" ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>}
      {!editing ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN_SECONDARY} onClick={() => setEditing(true)}>
            Edit answers
          </button>
          {answers.onboardedAt && (
            <button type="button" className={BTN_SECONDARY} onClick={reset} disabled={pending}>
              Ask the welcome questions again
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-[12px] border border-[#e7e6e4] p-4">
          <fieldset className="space-y-2">
            <legend className={LABEL}>Goals</legend>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <label key={g.key} className="flex items-center gap-1.5 rounded-full border border-[#d9d8d6] px-3 py-1 text-[13px]">
                  <input type="checkbox" checked={goals.includes(g.key)} onChange={() => setGoals((v) => toggle(v, g.key))} />
                  {g.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Session length</span>
              <select className={INPUT} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                {SESSION_LENGTHS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-56 flex-1 flex-col gap-1.5">
              <span className={LABEL}>Location</span>
              <input className={INPUT} value={location} maxLength={120} onChange={(e) => setLocation(e.target.value)} />
            </label>
          </div>
          <fieldset className="space-y-2">
            <legend className={LABEL}>Practice days</legend>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d, i) => (
                <label key={d} className="flex items-center gap-1.5 rounded-full border border-[#d9d8d6] px-3 py-1 text-[13px]">
                  <input type="checkbox" checked={days.includes(i)} onChange={() => setDays((v) => toggle(v, i))} />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button type="button" className={BTN_PRIMARY} onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save answers"}
            </button>
            <button type="button" className={BTN_SECONDARY} onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
