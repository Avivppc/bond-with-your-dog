"use client";

import { PhotoDrop } from "@/components/app/PhotoDrop";
import { Days, Ms, WEEKDAYS, WEEK_ORDER } from "@/components/app/ui";
import { AGE_GROUPS, GOALS, LIMITATIONS, SESSION_LENGTHS } from "@/lib/member/schemas";
import type { Goal } from "@/lib/member/viewer";
import { countWord } from "@/lib/practice/achievements";

/** "Three 10-minute sessions a week". */
const countTitle = (n: number) => countWord(n).replace(/^./, (c) => c.toUpperCase());

export type AgeGroup = "puppy" | "adult" | "senior";
export type Limitation = "joints" | "injury" | "other";

export interface DogDraft {
  id?: string;
  name: string;
  breed: string;
  ageGroup: AgeGroup;
  limitations: Limitation[];
  photoUrl: string | null;
}

export interface FirstLesson {
  courseTitle: string;
  title: string;
  href: string;
  minutes: string | null;
  image: string | null;
  number: number;
}

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function StepWelcome({ firstName, fullName, avatarUrl, onChange }: { firstName: string; fullName: string; avatarUrl: string | null; onChange: (patch: { fullName?: string; avatarUrl?: string | null }) => void }) {
  return (
    <div className="stack-lg">
      <span className="eyebrow">Step 1 of 4</span>
      <h1 className="display" style={{ fontSize: 42 }}>
        Hi {firstName},
        <br />
        I&apos;m <em>Roni</em>.
      </h1>
      <p className="lede">I&apos;ve danced with dogs for twenty years, on stage and in my living room. In the next minute you&apos;ll tell me about your dog, and I&apos;ll set up a plan that fits your week.</p>
      <div className="list">
        {[
          ["pets", "Built around your dog's age and body"],
          ["schedule", "Sessions of 5 to 15 minutes"],
          ["rate_review", "Send me videos, and I reply with notes"],
        ].map(([icon, text]) => (
          <div key={icon} className="list-row">
            <Ms name={icon} color="var(--teal)" />
            <div className="grow">{text}</div>
          </div>
        ))}
      </div>
      <div className="field">
        <label htmlFor="fullName">Your name</label>
        <input id="fullName" className="input" value={fullName} maxLength={120} autoComplete="name" onChange={(e) => onChange({ fullName: e.target.value })} />
      </div>
      <PhotoDrop kind="avatar" value={avatarUrl} onChange={(url) => onChange({ avatarUrl: url })} size={72} label="Add your photo (optional)" />
    </div>
  );
}

export function StepDog({ dog, onChange }: { dog: DogDraft; onChange: (patch: Partial<DogDraft>) => void }) {
  const none = dog.limitations.length === 0;
  return (
    <div className="stack-lg">
      <span className="eyebrow">Step 2 of 4</span>
      <h1 className="h1">Meet your dog</h1>
      <PhotoDrop kind="dog" value={dog.photoUrl} onChange={(url) => onChange({ photoUrl: url })} size={104} label={<>Add a photo so we can<br />put a face to the name</>} />
      <div className="grid-2" style={{ gap: 16 }}>
        <div className="field">
          <label htmlFor="dogName">Dog&apos;s name</label>
          <input id="dogName" className="input" value={dog.name} maxLength={40} required onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="dogBreed">Breed</label>
          <input id="dogBreed" className="input" value={dog.breed} maxLength={80} placeholder="e.g. Border Collie, mixed" onChange={(e) => onChange({ breed: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <span className="label">Age</span>
        <div className="seg" role="radiogroup" aria-label="Age">
          {AGE_GROUPS.map((a) => (
            <button key={a.key} type="button" role="radio" aria-checked={dog.ageGroup === a.key} className={dog.ageGroup === a.key ? "on" : undefined} onClick={() => onChange({ ageGroup: a.key })}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Any physical limitations?</span>
        <div className="row">
          <button type="button" className={`chip ${none ? "on" : ""}`} aria-pressed={none} onClick={() => onChange({ limitations: [] })}>
            None
          </button>
          {LIMITATIONS.map((l) => (
            <button key={l.key} type="button" className={`chip ${dog.limitations.includes(l.key) ? "on" : ""}`} aria-pressed={dog.limitations.includes(l.key)} onClick={() => onChange({ limitations: toggle(dog.limitations, l.key) })}>
              {l.label}
            </button>
          ))}
        </div>
        <span className="faint">We&apos;ll offer gentler versions of moves that load the joints.</span>
      </div>
    </div>
  );
}

export function StepGoals({ goals, minutes, days, onChange }: { goals: Goal[]; minutes: 5 | 10 | 15; days: number[]; onChange: (patch: { goals?: Goal[]; minutes?: 5 | 10 | 15; days?: number[] }) => void }) {
  return (
    <div className="stack-lg">
      <span className="eyebrow">Step 3 of 4</span>
      <h1 className="h1">What would you love to do together?</h1>
      <div className="goal-grid">
        {GOALS.map((g) => (
          <button key={g.key} type="button" className={`goal ${goals.includes(g.key) ? "on" : ""}`} aria-pressed={goals.includes(g.key)} onClick={() => onChange({ goals: toggle(goals, g.key) })}>
            <Ms name={g.icon} />
            {g.label}
          </button>
        ))}
      </div>
      <div className="field">
        <span className="label">Time per session</span>
        <div className="seg" role="radiogroup" aria-label="Time per session">
          {SESSION_LENGTHS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={minutes === m} className={minutes === m ? "on" : undefined} onClick={() => onChange({ minutes: m })}>
              {`${m} min`}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Which days suit you?</span>
        <div className="row">
          {WEEK_ORDER.map((d) => (
            <button key={d} type="button" className={`chip ${days.includes(d) ? "on" : ""}`} aria-pressed={days.includes(d)} onClick={() => onChange({ days: toggle(days, d) })}>
              {WEEKDAYS[d]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StepPlan({ dogName, minutes, days, first }: { dogName: string; minutes: number; days: number[]; first: FirstLesson | null }) {
  const count = days.length;
  return (
    <div className="stack-lg">
      <span className="eyebrow">Step 4 of 4</span>
      <h1 className="h1">Your plan with {dogName}</h1>
      <p className="lede">
        {first ? `You'll start with ${first.courseTitle}. ` : "Pick a chapter and your first lesson will be waiting. "}
        {count > 0 ? `${countTitle(count)} ${minutes}-minute session${count === 1 ? "" : "s"} a week.` : "Pick practice days any time from your plan."}
      </p>
      <div className="card flat tight">
        <Days days={days.map((d) => ({ weekday: d, planned: true, minutes }))} />
      </div>
      {first && (
        <div className="list-row">
          <div className="media" style={{ width: 120, aspectRatio: "16/10", borderRadius: 14, flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- lesson image */}
            <img src={first.image || "/app/img/roni-kneel.jpg"} alt="" />
          </div>
          <div className="grow">
            <span className="eyebrow muted">{first.number === 1 ? "First lesson" : `Lesson ${first.number}`}</span>
            <div className="title">{first.title}</div>
            <div className="faint">
              {[first.minutes, first.courseTitle].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
