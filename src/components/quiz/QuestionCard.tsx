import type { QuizOption, QuizQuestion } from "@/lib/quiz/data";

interface QuestionCardProps {
  question: QuizQuestion;
  selectedId?: QuizOption["id"];
  onSelect: (optionId: QuizOption["id"]) => void;
}

export default function QuestionCard({ question, selectedId, onSelect }: QuestionCardProps) {
  return (
    <div>
      <div className="image-reveal-wrapper kinetic-shadow mb-8 aspect-[16/9] w-full">
        <img
          src={question.imageUrl}
          alt={question.imageAlt}
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight leading-tight mb-6">
        {question.question}
      </h2>

      <div className="flex flex-col gap-3">
        {question.options.map((option) => {
          const active = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`text-left px-6 py-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                active
                  ? "border-primary bg-primary-container/10 shadow-lg shadow-primary/10"
                  : "border-transparent bg-surface-container-low hover:bg-surface-container hover:-translate-y-0.5"
              }`}
            >
              <span
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-headline font-bold text-sm ${
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                {option.id}
              </span>
              <span className="font-body text-base text-on-surface leading-snug">
                {option.label}
              </span>
              {active && (
                <span className="ml-auto shrink-0 material-symbols-outlined text-primary fill-icon text-xl">
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
