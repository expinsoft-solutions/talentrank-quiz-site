'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

interface ShortAnswerQuestion {
  id: string;
  question: string;
}

async function submitResponse(
  assessmentId: string,
  clientToken: string,
  questionId: string,
  answerRaw: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('responses')
      .upsert(
        {
          assessment_id: assessmentId,
          client_token: clientToken,
          question_id: questionId,
          answer_raw: answerRaw,
          answer_numeric: null,
          time_taken_seconds: null,
        },
        { onConflict: 'assessment_id,question_id' },
      );
    if (error) {
      console.error('short-answer submitResponse error', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('short-answer submitResponse error', e);
    return false;
  }
}

interface ShortAnswerSectionProps {
  assessmentId: string;
  clientToken?: string | null;
  questions: ShortAnswerQuestion[];
  sectionIndex: number;
  totalSections: number;
  initialQuestionIndex?: number;
  initialValues?: Record<string, string>;
  onComplete: () => void;
  onPrevious?: () => void;
  onProgress?: (sectionIndex: number, questionIndex: number) => void;
  onResponseSaved?: (questionId: string, answerRaw: string) => void;
  isFirstSection?: boolean;
  isLastSection?: boolean;
}

export function ShortAnswerSection({
  assessmentId,
  clientToken,
  questions,
  sectionIndex,
  totalSections,
  initialQuestionIndex = 0,
  initialValues,
  onComplete,
  onPrevious,
  onProgress,
  onResponseSaved,
  isFirstSection = false,
  isLastSection = false,
}: ShortAnswerSectionProps) {
  const total = questions.length;
  const [values, setValues] = useState<Record<string, string>>(() => initialValues ?? {});
  const [submitted, setSubmitted] = useState<Set<string>>(() =>
    new Set(initialValues ? Object.keys(initialValues).filter((id) => (initialValues[id] ?? '').trim().length > 0) : [])
  );
  const [currentIndex, setCurrentIndex] = useState(() => Math.min(initialQuestionIndex, Math.max(0, total - 1)));

  useEffect(() => {
    setValues(initialValues ?? {});
    setSubmitted(
      new Set(initialValues ? Object.keys(initialValues).filter((id) => (initialValues[id] ?? '').trim().length > 0) : [])
    );
    setCurrentIndex(Math.min(initialQuestionIndex, Math.max(0, total - 1)));
  }, [assessmentId, sectionIndex]);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex >= total - 1;
  const answeredCount = Object.keys(values).filter(
    (id) => (values[id] ?? '').trim().length > 0
  ).length;
  const progressPercent = total > 0 ? (answeredCount / total) * 100 : 0;

  const setValue = (questionId: string, value: string) => {
    setValues((prev) => ({ ...prev, [questionId]: value }));
  };

  const flushCurrent = (questionId: string) => {
    const raw = (values[questionId] ?? '').trim();
    if (raw && !submitted.has(questionId) && clientToken) {
      onResponseSaved?.(questionId, raw);
      submitResponse(assessmentId, clientToken, questionId, raw).then(() => {
        setSubmitted((prev) => new Set(prev).add(questionId));
      });
    }
  };

  const handleNext = () => {
    if (currentQuestion) flushCurrent(currentQuestion.id);
    if (isLastQuestion) {
      if (clientToken) {
        questions.forEach((q) => {
          const raw = (values[q.id] ?? '').trim();
          if (raw && !submitted.has(q.id)) {
            submitResponse(assessmentId, clientToken, q.id, raw);
          }
        });
      }
      onComplete();
    } else {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      onProgress?.(sectionIndex, next);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion) flushCurrent(currentQuestion.id);
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      onProgress?.(sectionIndex, prev);
    } else {
      onPrevious?.();
    }
  };

  const handleBlur = (questionId: string) => {
    flushCurrent(questionId);
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">No questions in this section.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col px-3 xs:px-4 sm:px-6 py-0 max-w-2xl mx-auto w-full overflow-x-hidden safe-top safe-bottom">
      <div className="sticky top-0 z-10 w-full -mx-3 xs:-mx-4 sm:-mx-6 px-3 xs:px-4 sm:px-6 pt-3 xs:pt-4 sm:pt-5 pb-3 xs:pb-4 bg-background/95 backdrop-blur-md border-b border-border/80 safe-top">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground mb-3 font-medium tracking-wide">
          <span>
            Question {currentIndex + 1} of {total}
          </span>
          <span>
            Section {sectionIndex} of {totalSections}
          </span>
        </div>
        <Progress value={progressPercent} className="h-4 sm:h-5 rounded-full shadow-inner" />
      </div>

      <div className="flex-1 px-0 py-6 sm:py-8 flex flex-col justify-center">
        {currentQuestion && (
          <label className="block">
            <p className="text-base sm:text-lg font-medium text-foreground mb-3 text-left leading-relaxed">
              {currentQuestion.question}
            </p>
            <Textarea
              value={values[currentQuestion.id] ?? ''}
              onChange={(e) => setValue(currentQuestion.id, e.target.value)}
              onBlur={() => handleBlur(currentQuestion.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleNext();
                }
              }}
              placeholder="Share your thoughts... (Enter to go to next)"
              className="min-h-[100px] xs:min-h-[120px] text-sm xs:text-base resize-none rounded-lg border-2 border-input bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors placeholder:text-muted-foreground/70 w-full min-w-0"
            />
          </label>
        )}
      </div>

      <div className="pt-6 sm:pt-10 mt-4 pb-6 sm:pb-8 safe-bottom flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0 && isFirstSection}
          size="lg"
          className="order-2 sm:order-1 min-w-[100px] xs:min-w-[120px] h-11 xs:h-12 text-sm xs:text-base font-medium touch-manipulation"
        >
          Previous
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          size="lg"
          className="order-1 sm:order-2 w-full sm:w-auto min-w-[120px] xs:min-w-[140px] h-11 xs:h-12 text-sm xs:text-base font-medium shadow-sm hover:shadow transition-shadow touch-manipulation"
        >
          {isLastQuestion ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
