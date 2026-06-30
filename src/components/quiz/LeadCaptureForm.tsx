"use client";

import { useState, type FormEvent } from "react";
import type { Tier } from "@/lib/quiz/data";
import type { TierScores } from "@/lib/quiz/scoring";
import type { QuizAnswers } from "@/lib/quiz/scoring";

interface LeadCaptureFormProps {
  tier: Tier;
  scores: TierScores;
  answers: QuizAnswers;
}

type Status = "idle" | "submitting" | "success" | "error";

export default function LeadCaptureForm({ tier, scores, answers }: LeadCaptureFormProps) {
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
      if (!response.ok) throw new Error("Request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center bg-secondary-container/30 rounded-3xl px-8 py-10">
        <span className="material-symbols-outlined text-4xl text-secondary mb-3 fill-icon">
          mark_email_read
        </span>
        <h3 className="font-display font-bold text-2xl mb-2">Check your inbox!</h3>
        <p className="font-body text-on-surface-variant">
          Your personalized journey, first lesson, and welcome offer are on their way.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-16 bg-surface-container-lowest kinetic-shadow rounded-3xl px-8 py-10 text-center">
      <h3 className="font-display font-bold text-2xl mb-2">
        Send me my personalized journey.
      </h3>
      <p className="font-body text-on-surface-variant mb-8">
        We&apos;ll email your recommendation, why it fits, and a welcome gift to get started.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            First Name
          </span>
          <input
            type="text"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="px-4 py-3 rounded-lg border border-outline-variant/40 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="px-4 py-3 rounded-lg border border-outline-variant/40 focus:ring-2 focus:ring-primary/30 focus:outline-none"
          />
        </label>
        {status === "error" && (
          <p className="text-sm text-error">
            Something went wrong — please try again in a moment.
          </p>
        )}
        <button
          type="submit"
          disabled={status === "submitting"}
          className="mt-2 bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-base font-semibold px-8 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100"
        >
          {status === "submitting" ? "Sending…" : "Send My Journey"}
        </button>
      </form>
    </div>
  );
}
