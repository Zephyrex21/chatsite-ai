'use client';

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ questions, onSelect, disabled }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <div
      className="flex flex-wrap justify-center gap-2 px-2"
      role="group"
      aria-label="Suggested questions"
    >
      {questions.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(question)}
          className="rounded-full bg-(--clay-surface) px-4 py-2 text-sm text-(--clay-text) shadow-[var(--clay-shadow-out-sm)] transition-shadow hover:shadow-[var(--clay-shadow-out)] disabled:opacity-60"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
