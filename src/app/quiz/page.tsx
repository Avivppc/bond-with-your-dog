"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProgressBar from "@/components/quiz/ProgressBar";
import QuestionCard from "@/components/quiz/QuestionCard";
import ResultCard from "@/components/quiz/ResultCard";
import LeadCaptureForm from "@/components/quiz/LeadCaptureForm";
import { QUIZ_QUESTIONS, TIER_RESULTS } from "@/lib/quiz/data";
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
    }, 250);
  }

  const scores = step === "result" ? scoreAnswers(answers) : null;
  const tier = scores ? resolveTier(scores) : null;
  const result = tier ? TIER_RESULTS[tier] : null;

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24 px-6 md:px-8 min-h-screen">
        <div className="max-w-2xl mx-auto">
          {step === "intro" && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-label font-semibold text-sm mb-8">
                Find Your Journey
              </div>
              <h1 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight leading-[1.05] mb-6">
                Discover the BONDED path that fits you and your dog.
              </h1>
              <p className="font-body text-lg text-on-surface-variant max-w-xl mx-auto mb-10 leading-relaxed">
                Six quick questions. No right or wrong answers — just a little
                guidance from Roni on where to start.
              </p>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-base font-semibold px-10 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                Begin the Quiz
              </button>
            </div>
          )}

          {typeof step === "number" && (
            <div>
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
          )}

          {step === "result" && result && scores && tier && (
            <>
              <ResultCard result={result} />
              <LeadCaptureForm tier={tier} scores={scores} answers={answers} />
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
