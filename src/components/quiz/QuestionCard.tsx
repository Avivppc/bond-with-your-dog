import type { QuizOption, QuizQuestion } from "@/lib/quiz/data";

interface QuestionCardProps {
  question: QuizQuestion;
  selectedId?: QuizOption["id"];
  onSelect: (optionId: QuizOption["id"]) => void;
}

export default function QuestionCard({ question, selectedId, onSelect }: QuestionCardProps) {
  return (
    <div>
      <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight leading-tight mb-8">
        {question.question}
      </h2>
      <div className="flex flex-col gap-4">
        {question.options.map((option) => {
          const active = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`text-left px-6 py-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                active
                  ? "border-primary bg-primary-container/10 shadow-lg shadow-primary/10"
                  : "border-transparent bg-surface-container-low hover:bg-surface-container hover:-translate-y-0.5"
              }`}
            >
              <span
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-headline font-bold text-sm ${
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                {option.id}
              </span>
              <span className="font-body text-base md:text-lg text-on-surface leading-snug">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
