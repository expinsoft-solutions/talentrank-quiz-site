'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

interface ShortAnswerQuestion {
  id: string;
  question: string;
}

async function submitResponse(
  assessmentId: string,
  questionId: string,
  answerRaw: string
) {
  await fetch(`/api/assessments/${assessmentId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId,
      answerRaw,
      answerNumeric: null,
      timeTakenSeconds: null,
    }),
  });
}

interface ShortAnswerSectionProps {
  assessmentId: string;
  questions: ShortAnswerQuestion[];
  sectionIndex: number;
  totalSections: number;
  onComplete: () => void;
  onPrevious?: () => void;
  isFirstSection?: boolean;
  isLastSection?: boolean;
}

export function ShortAnswerSection({
  assessmentId,
  questions,
  sectionIndex,
  totalSections,
  onComplete,
  onPrevious,
  isFirstSection = false,
  isLastSection = false,
}: ShortAnswerSectionProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  const answeredCount = Object.keys(values).filter(
    (id) => (values[id] ?? '').trim().length > 0
  ).length;
  const total = questions.length;
  const progressPercent = total > 0 ? (answeredCount / total) * 100 : 0;
  const allAnswered = answeredCount === total;

  const setValue = (questionId: string, value: string) => {
    setValues((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleBlur = (questionId: string) => {
    const raw = (values[questionId] ?? '').trim();
    if (raw && !submitted.has(questionId)) {
      submitResponse(assessmentId, questionId, raw);
      setSubmitted((prev) => new Set(prev).add(questionId));
    }
  };

  const handleComplete = () => {
    questions.forEach((q) => {
      const raw = (values[q.id] ?? '').trim();
      if (raw && !submitted.has(q.id)) {
        submitResponse(assessmentId, q.id, raw);
      }
    });
    onComplete();
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col px-3 xs:px-4 sm:px-6 py-0 max-w-2xl mx-auto w-full overflow-x-hidden safe-top safe-bottom">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-10 w-full -mx-3 xs:-mx-4 sm:-mx-6 px-3 xs:px-4 sm:px-6 pt-3 xs:pt-4 sm:pt-5 pb-3 xs:pb-4 bg-background/95 backdrop-blur-md border-b border-border/80 safe-top">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground mb-3 font-medium tracking-wide">
          <span>
            {answeredCount} of {total} answered
          </span>
          <span>
            Section {sectionIndex} of {totalSections}
          </span>
        </div>
        <Progress value={progressPercent} className="h-4 sm:h-5 rounded-full shadow-inner" />
      </div>

      <div className="flex-1 px-0 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {questions.map((q, qIndex) => (
          <div
            key={q.id}
            className={
              qIndex < questions.length - 1
                ? 'pb-8 sm:pb-10 border-b border-border/60'
                : 'pb-6'
            }
          >
            <label className="block">
              <p className="text-base sm:text-lg font-medium text-foreground mb-3 text-left leading-relaxed">
                {q.question}
              </p>
              <Textarea
                value={values[q.id] ?? ''}
                onChange={(e) => setValue(q.id, e.target.value)}
                onBlur={() => handleBlur(q.id)}
                placeholder="Share your thoughts..."
                className="min-h-[100px] xs:min-h-[120px] text-sm xs:text-base resize-none rounded-lg border-2 border-input bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors placeholder:text-muted-foreground/70 w-full min-w-0"
              />
            </label>
          </div>
        ))}
      </div>

      <div className="pt-6 sm:pt-10 mt-4 pb-6 sm:pb-8 safe-bottom flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={isFirstSection}
          size="lg"
          className="order-2 sm:order-1 min-w-[100px] xs:min-w-[120px] h-11 xs:h-12 text-sm xs:text-base font-medium touch-manipulation"
        >
          Previous
        </Button>
        <Button
          type="button"
          onClick={handleComplete}
          disabled={!allAnswered}
          size="lg"
          className="order-1 sm:order-2 w-full sm:w-auto min-w-[120px] xs:min-w-[140px] h-11 xs:h-12 text-sm xs:text-base font-medium shadow-sm hover:shadow transition-shadow touch-manipulation"
        >
          {isLastSection ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
