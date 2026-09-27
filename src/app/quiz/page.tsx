"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProgressBar from "@/components/quiz/ProgressBar";
import QuestionCard from "@/components/quiz/QuestionCard";
import ResultCard from "@/components/quiz/ResultCard";
import LeadCaptureForm from "@/components/quiz/LeadCaptureForm";
import { QUIZ_QUESTIONS, QUIZ_INTRO_IMAGE_URL, TIER_RESULTS, type OptionId } from "@/lib/quiz/data";
import { resolveTier, scoreAnswers, type QuizAnswers } from "@/lib/quiz/scoring";

type Step = "intro" | number | "capture" | "result";

const NEXT_QUESTION_DELAY_MS = 280;

export default function QuizPage() {
  const [step, setStep] = useState<Step>("intro");
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [leadOutcome, setLeadOutcome] = useState<"sent" | "skipped" | null>(null);

  const totalQuestions = QUIZ_QUESTIONS.length;

  function handleSelect(questionId: number, optionId: OptionId) {
    const nextAnswers = { ...answers, [questionId]: optionId };
    setAnswers(nextAnswers);

    const currentIndex = QUIZ_QUESTIONS.findIndex((q) => q.id === questionId);
    const isLastQuestion = currentIndex === totalQuestions - 1;

    window.setTimeout(() => {
      setStep(isLastQuestion ? "capture" : currentIndex + 1);
    }, NEXT_QUESTION_DELAY_MS);
  }

  const isFinished = step === "capture" || step === "result";
  const scores = isFinished ? scoreAnswers(answers) : null;
  const tier = isFinished ? resolveTier(answers) : null;
  const result = tier ? TIER_RESULTS[tier] : null;

  return (
    <>
      <Navbar />
      <main className="pb-24 min-h-screen">

        {step === "intro" && (
          <>
            <div className="relative w-full h-[55vh] md:h-[65vh] min-h-[400px]">
              <img
                src={QUIZ_INTRO_IMAGE_URL}
                alt="Roni kneeling in a corridor with two of her dogs watching her"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
            </div>

            <div className="max-w-2xl mx-auto px-6 md:px-8 -mt-8 relative z-10 text-center pb-8">
              <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-label font-semibold text-sm mb-6">
                Find Your Journey
              </div>
              <h1 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight leading-[1.05] mb-5">
                Discover the BONDED path that fits you and your dog.
              </h1>
              <p className="font-body text-lg text-on-surface-variant max-w-xl mx-auto mb-4 leading-relaxed">
                Six quick questions. No right or wrong answers, just a little guidance from
                Roni on where your journey begins.
              </p>
              <p className="font-label text-sm font-semibold text-secondary uppercase tracking-widest mb-8">
                10–15 minutes of training a day is all it takes.
              </p>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-base font-semibold px-10 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform w-full sm:w-auto"
              >
                Begin the Quiz
              </button>
            </div>
          </>
        )}

        {typeof step === "number" && (
          <div className="pt-32 px-6 md:px-8">
            <div className="max-w-2xl mx-auto">
              <ProgressBar current={step + 1} total={totalQuestions} />
              <QuestionCard
                question={QUIZ_QUESTIONS[step]}
                selectedId={answers[QUIZ_QUESTIONS[step].id]}
                onSelect={(optionId) => handleSelect(QUIZ_QUESTIONS[step].id, optionId)}
              />
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="mt-8 font-label text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
                >
                  ← Back
                </button>
              )}
            </div>
          </div>
        )}

        {step === "capture" && scores && tier && (
          <div className="pt-32 px-6 md:px-8">
            <div className="max-w-2xl mx-auto">
              <ProgressBar current={totalQuestions} total={totalQuestions} />
              <LeadCaptureForm
                tier={tier}
                scores={scores}
                answers={answers}
                onDone={(outcome) => {
                  setLeadOutcome(outcome);
                  setStep("result");
                }}
              />
              <button
                type="button"
                onClick={() => setStep(totalQuestions - 1)}
                className="mt-8 font-label text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="pt-32 px-6 md:px-8">
            <div className="max-w-2xl mx-auto">
              <ResultCard result={result} />
              {leadOutcome === "sent" && (
                <p className="mt-10 text-center font-body text-on-surface-variant flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-secondary">mark_email_read</span>
                  Your journey, first lesson and welcome gift are on their way to your inbox.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
