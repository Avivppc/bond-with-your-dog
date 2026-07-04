"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProgressBar from "@/components/quiz/ProgressBar";
import QuestionCard from "@/components/quiz/QuestionCard";
import ResultCard from "@/components/quiz/ResultCard";
import LeadCaptureForm from "@/components/quiz/LeadCaptureForm";
import { QUIZ_QUESTIONS, QUIZ_INTRO_IMAGE_URL, TIER_RESULTS } from "@/lib/quiz/data";
import { resolveTier, scoreAnswers, type QuizAnswers } from "@/lib/quiz/scoring";

type Step = "intro" | number | "result";

export default function QuizPage() {
  const [step, setStep] = useState<Step>("intro");
  const [answers, setAnswers] = useState<QuizAnswers>({});

  const totalQuestions = QUIZ_QUESTIONS.length;

  function handleSelect(questionId: number, optionId: "A" | "B" | "C") {
    const nextAnswers = { ...answers, [questionId]: optionId };
    setAnswers(nextAnswers);

    const currentIndex = QUIZ_QUESTIONS.findIndex((q) => q.id === questionId);
    const isLastQuestion = currentIndex === totalQuestions - 1;

    window.setTimeout(() => {
      setStep(isLastQuestion ? "result" : currentIndex + 1);
    }, 280);
  }

  const scores = step === "result" ? scoreAnswers(answers) : null;
  const tier = scores ? resolveTier(scores) : null;
  const result = tier ? TIER_RESULTS[tier] : null;

  return (
    <>
      <Navbar />
      <main className="pb-24 min-h-screen">

        {step === "intro" && (
          <>
            {/* Full-bleed hero image */}
            <div className="relative w-full h-[65vh] min-h-[440px]">
              <img
                src={QUIZ_INTRO_IMAGE_URL}
                alt="Roni embracing her dog in a lavender field at sunset"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
            </div>

            {/* Text below the image */}
            <div className="max-w-2xl mx-auto px-6 md:px-8 -mt-8 relative z-10 text-center pb-8">
              <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-label font-semibold text-sm mb-6">
                Find Your Journey
              </div>
              <h1 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight leading-[1.05] mb-5">
                Discover the BONDED path that fits you and your dog.
              </h1>
              <p className="font-body text-lg text-on-surface-variant max-w-xl mx-auto mb-8 leading-relaxed">
                Six quick questions. No right or wrong answers — just a little guidance from
                Roni on where your journey begins.
              </p>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-base font-semibold px-10 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
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

        {step === "result" && result && scores && tier && (
          <div className="pt-32 px-6 md:px-8">
            <div className="max-w-2xl mx-auto">
              <ResultCard result={result} />
              <LeadCaptureForm tier={tier} scores={scores} answers={answers} />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
