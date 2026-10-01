"use client";

import { useState, type FormEvent } from "react";
import type { Tier } from "@/lib/quiz/data";
import type { TierScores } from "@/lib/quiz/scoring";
import type { QuizAnswers } from "@/lib/quiz/scoring";
import { EVENTS, identifyByEmail, track } from "@/lib/analytics";

interface LeadCaptureFormProps {
  tier: Tier;
  scores: TierScores;
  answers: QuizAnswers;
  /** Called once the lead is saved, or when the visitor chooses to skip. */
  onDone: (outcome: "sent" | "skipped") => void;
}

type Status = "idle" | "submitting" | "error";

const inputClass =
  "px-4 py-3 rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 focus:outline-none";

/**
 * Shown after the last question and before the recommendation.
 * Captures name + email; a quiet skip link keeps it from feeling like a wall.
 */
export default function LeadCaptureForm({ tier, scores, answers, onDone }: LeadCaptureFormProps) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    try {
      const response = await fetch("/api/quiz-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, email, tier, scores, answers }),
      });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      identifyByEmail(email, { name: firstName, quiz_tier: tier });
      track(EVENTS.quizLeadSubmitted, { tier });
      onDone("sent");
    } catch (error) {
      track(EVENTS.quizLeadFailed, {
        tier,
        error: error instanceof Error ? error.message : "unknown",
      });
      setStatus("error");
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-surface-container-lowest kinetic-shadow rounded-3xl px-8 py-10 text-center">
      <p className="font-label text-sm font-semibold text-secondary uppercase tracking-widest mb-4">
        Your result is ready
      </p>
      <h2 className="font-display font-bold text-2xl md:text-3xl mb-3">
        Where should we send your journey?
      </h2>
      <p className="font-body text-on-surface-variant mb-8">
        We&apos;ll show your recommendation right away and email it to you along
        with your first lesson and a welcome gift.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            First Name
          </span>
          <input
            type="text"
            required
            autoComplete="given-name"
            maxLength={60}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </label>
        {status === "error" && (
          <p className="text-sm text-error">
            Something went wrong. Please try again in a moment.
          </p>
        )}
        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-2 bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-base font-semibold px-8 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100"
        >
          {status === "submitting" ? "One moment…" : "Show My Journey"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          track(EVENTS.quizLeadSkipped, { tier });
          onDone("skipped");
        }}
        className="mt-5 text-sm text-on-surface-variant hover:text-primary underline-offset-4 hover:underline"
      >
        Just show my result
      </button>
    </div>
  );
}
