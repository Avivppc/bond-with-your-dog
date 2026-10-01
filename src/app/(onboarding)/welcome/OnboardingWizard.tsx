"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { finishOnboarding, saveAboutYou, saveChosenCourse, saveDog, savePracticePrefs } from "@/app/(member)/member-actions";
import { Ms } from "@/components/app/ui";
import { unlockLabel, type CourseChoice } from "@/lib/member/course-choice";
import type { Goal } from "@/lib/member/viewer";
import { StepCourse, StepDog, StepGoals, StepPlan, StepWelcome, type DogDraft } from "./steps";

const STEPS = [
  { label: "Welcome", img: "p-steps", quote: "Every dog dances differently. Tell me about yours.", next: "Let's begin" },
  { label: "Your dog", img: "p-hug", quote: "The bond comes first. Every move grows from it.", next: "Continue" },
  { label: "Your goals", img: "p-up", quote: "Dancing is just play with a shape to it.", next: "Continue" },
  { label: "Your course", img: "p-steps", quote: "Foundations first. Everything else is built on it.", next: "Build my plan" },
  { label: "Your plan", img: "p-back", quote: "Ten good minutes beat an hour of trying hard.", next: "Go to my home" },
] as const;

const LAST_STEP = STEPS.length;
const COURSE_STEP = 4;

interface Initial {
  fullName: string;
  avatarUrl: string | null;
  dog: DogDraft | null;
  goals: Goal[];
  sessionMinutes: 5 | 10 | 15;
  practiceDays: number[];
  courseId: string | null;
}

/** Five-step onboarding (design screen "onboarding"). Each step saves before moving on. */
export function OnboardingWizard({ firstName, initial, courses }: { firstName: string; initial: Initial; courses: CourseChoice[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [about, setAbout] = useState({ fullName: initial.fullName, avatarUrl: initial.avatarUrl });
  const [dog, setDog] = useState<DogDraft>(initial.dog ?? { name: "", breed: "", ageGroup: "adult", limitations: [], photoUrl: null });
  const [prefs, setPrefs] = useState({ goals: initial.goals, minutes: initial.sessionMinutes, days: initial.practiceDays });
  const [courseId, setCourseId] = useState(initial.courseId);
  const chosen = courses.find((c) => c.id === courseId) ?? null;
  const s = STEPS[step - 1];

  async function saveStep(): Promise<boolean> {
    const res =
      step === 1
        ? await saveAboutYou({ fullName: about.fullName, avatarUrl: about.avatarUrl })
        : step === 2
          ? await saveDog({ ...dog, breed: dog.breed || undefined, makeActive: true })
          : step === 3
            ? await savePracticePrefs({ goals: prefs.goals, sessionMinutes: prefs.minutes, practiceDays: prefs.days })
            : step === COURSE_STEP && courseId
              ? await saveChosenCourse(courseId)
              : ({ ok: true, data: undefined } as const);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    if (step === 2 && res.data && typeof res.data === "object" && "id" in res.data) {
      const id = res.data.id;
      setDog((d) => ({ ...d, id }));
    }
    return true;
  }

  function next(destination?: string) {
    setError(null);
    start(async () => {
      if (!(await saveStep())) return;
      if (step < LAST_STEP) {
        setStep(step + 1);
        window.scrollTo({ top: 0 });
        return;
      }
      const done = await finishOnboarding();
      if (!done.ok) {
        setError(done.error);
        return;
      }
      router.push(destination ?? "/home?tour=home");
    });
  }

  function finishLater() {
    start(async () => {
      await saveStep();
      const done = await finishOnboarding();
      if (!done.ok) {
        setError(done.error);
        return;
      }
      router.push("/home");
    });
  }

  return (
    <>
      <div className="bare-top">
        {/* eslint-disable-next-line @next/next/no-img-element -- brand logo */}
        <img src="/app/img/logo.png" alt="Bonded" />
        <button type="button" className="faint" onClick={finishLater} disabled={pending}>
          Save and finish later
        </button>
      </div>
      <div className="stepper" aria-label={`Step ${step} of ${LAST_STEP}`}>
        {STEPS.map((st, i) => (
          <div key={st.label} className={i + 1 === step ? "on" : i + 1 < step ? "done" : undefined}>
            <i />
            {st.label}
          </div>
        ))}
      </div>
      <div className="onb">
        <div className="media">
          {/* eslint-disable-next-line @next/next/no-img-element -- Roni with her dogs */}
          <img src={`/app/img/${s.img}.jpg`} alt="" />
          <div className="glass">
            <span className="eyebrow">Roni Sagi</span>
            <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 17, lineHeight: 1.4 }}>&ldquo;{s.quote}&rdquo;</span>
          </div>
        </div>
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          {step === 1 && <StepWelcome firstName={about.fullName.split(" ")[0] || firstName} fullName={about.fullName} avatarUrl={about.avatarUrl} onChange={(p) => setAbout((a) => ({ ...a, ...p }))} />}
          {step === 2 && <StepDog dog={dog} onChange={(p) => setDog((d) => ({ ...d, ...p }))} />}
          {step === 3 && <StepGoals goals={prefs.goals} minutes={prefs.minutes} days={prefs.days} onChange={(p) => setPrefs((x) => ({ ...x, goals: p.goals ?? x.goals, minutes: p.minutes ?? x.minutes, days: p.days ?? x.days }))} />}
          {step === COURSE_STEP && <StepCourse courses={courses} selectedId={courseId} onSelect={setCourseId} />}
          {step === LAST_STEP && <StepPlan dogName={dog.name || "your dog"} minutes={prefs.minutes} days={[...prefs.days].sort()} course={chosen} />}
          {error && (
            <p role="alert" className="tip warm" style={{ margin: 0 }}>
              <Ms name="error" />
              <span>{error}</span>
            </p>
          )}
          <div className="between" style={{ marginTop: "auto" }}>
            {step > 1 ? (
              <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={pending}>
                Back
              </button>
            ) : (
              <span />
            )}
            <div className="row">
              {step === LAST_STEP && chosen?.firstLesson && (
                <button type="button" className="btn btn-ghost" onClick={() => next(chosen.firstLesson!.href)} disabled={pending}>
                  Start Lesson {chosen.firstLesson.number}
                </button>
              )}
              {step === LAST_STEP && chosen && !chosen.owned && chosen.offer && (
                <button type="button" className="btn btn-ghost" onClick={() => next(`/checkout/${chosen.offer!.slug}`)} disabled={pending}>
                  {unlockLabel(chosen.offer)}
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={pending || (step === 2 && !dog.name.trim()) || (step === 1 && !about.fullName.trim()) || (step === COURSE_STEP && courses.length > 0 && !courseId)}>
                {pending ? "Saving…" : s.next}
                <Ms name="arrow_forward" size="sm" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
