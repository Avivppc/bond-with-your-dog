"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Turnstile, turnstileOn } from "@/components/Turnstile";
import type { UploadedStoryPhoto } from "@/lib/community/upload-story-photo";
import { MIN_STORY_LENGTH, STORY_CHAPTERS } from "@/lib/stories/visitor-story";
import { submitVisitorStory } from "./actions";
import { VisitorPhotos } from "./VisitorPhotos";

const INPUT =
  "w-full px-4 py-3 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 focus:outline-none";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</span>
      {children}
      {hint && <span className="text-sm text-on-surface-variant">{hint}</span>}
    </label>
  );
}

interface FormState {
  name: string;
  email: string;
  dogName: string;
  chapter: string;
  story: string;
  consent: boolean;
}

const EMPTY: FormState = { name: "", email: "", dogName: "", chapter: "", story: "", consent: false };

/** The public "Share your story" form: a few details, the story, up to 3 photos, permission to share. */
export function ShareStoryForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [photos, setPhotos] = useState<UploadedStoryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  if (sentTo) {
    return (
      <div className="rounded-3xl bg-surface-container-lowest px-8 py-12 text-center kinetic-shadow" role="status">
        <span className="material-symbols-outlined text-5xl text-primary" aria-hidden>
          favorite
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold md:text-3xl">Thank you, {sentTo}!</h2>
        <p className="mx-auto mt-3 max-w-md font-body text-on-surface-variant">
          Roni reads every story. If yours is featured, we&apos;ll let you know by email first.
        </p>
        <Link href="/stories" className="mt-8 inline-block font-semibold text-primary underline-offset-4 hover:underline">
          Back to the stories
        </Link>
      </div>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitVisitorStory({
        name: form.name,
        email: form.email,
        dogName: form.dogName,
        chapter: (STORY_CHAPTERS as readonly string[]).includes(form.chapter) ? (form.chapter as (typeof STORY_CHAPTERS)[number]) : null,
        story: form.story,
        consent: form.consent as true,
        mediaPaths: photos.map((p) => p.path),
        captcha,
      });
      if (!res.ok) {
        setError(res.error);
        setCaptchaReset((n) => n + 1); // the token was used up
        return;
      }
      photos.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      setSentTo(form.name.trim().split(/\s+/)[0] ?? "");
    });
  }

  const ready = form.consent && form.story.trim().length >= MIN_STORY_LENGTH && !uploading && (!turnstileOn || captcha);

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-3xl bg-surface-container-lowest px-6 py-8 kinetic-shadow md:px-10 md:py-10">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Your name">
          <input className={INPUT} required maxLength={80} autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Email">
          <input className={INPUT} type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Your dog's name">
          <input className={INPUT} maxLength={40} value={form.dogName} onChange={(e) => set("dogName", e.target.value)} />
        </Field>
        <Field label="Which chapter did you do?">
          <select className={INPUT} value={form.chapter} onChange={(e) => set("chapter", e.target.value)}>
            <option value="">Choose one (optional)</option>
            {STORY_CHAPTERS.map((c) => (
              <option key={c} value={c}>
                Bonded: {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Your story" hint="What changed between you and your dog? A few sentences is perfect.">
        <textarea className={`${INPUT} min-h-40`} required maxLength={5000} value={form.story} onChange={(e) => set("story", e.target.value)} />
      </Field>
      <VisitorPhotos photos={photos} setPhotos={setPhotos} onBusyChange={setUploading} />
      <label className="flex cursor-pointer items-start gap-3 text-left text-sm text-on-surface-variant">
        <input
          type="checkbox"
          required
          checked={form.consent}
          onChange={(e) => set("consent", e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-outline-variant accent-[#8b4b00]"
        />
        <span>Roni may share my story and photos on bonded.dog and Bonded&apos;s social pages.</span>
      </label>
      <Turnstile onToken={setCaptcha} resetKey={captchaReset} className="flex justify-center" />
      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !ready}
        className="self-center bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-base font-semibold px-10 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100"
      >
        {pending ? "Sending…" : "Send my story"}
      </button>
    </form>
  );
}
