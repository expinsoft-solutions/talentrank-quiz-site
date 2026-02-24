'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { COGNITIVE_SECTION_ID } from '@/lib/assessment';

const MIN_ANSWER_LENGTH = 10;
const MAX_ANSWER_LENGTH = 2000;
const COGNITIVE_TIME_LIMIT_SECONDS = 360;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ShortAnswerQuestion {
  id: string;
  question: string;
}

interface ShortAnswerSectionProps {
  assessmentId?: string | null;
  clientToken?: string | null;
  questions: ShortAnswerQuestion[];
  sectionId?: string;
  sectionIndex: number;
  totalSections: number;
  initialQuestionIndex?: number;
  initialValues?: Record<string, string>;
  onComplete: () => void;
  onProgress?: (sectionIndex: number, questionIndex: number) => void;
  onResponseSaved?: (questionId: string, answerRaw: string) => void;
  isFirstSection?: boolean;
  isLastSection?: boolean;
}

export function ShortAnswerSection({
  assessmentId,
  clientToken,
  questions,
  sectionId,
  sectionIndex,
  totalSections,
  initialQuestionIndex = 0,
  initialValues,
  onComplete,
  onProgress,
  onResponseSaved,
  isFirstSection = false,
  isLastSection = false,
}: ShortAnswerSectionProps) {
  const total = questions.length;
  const isCognitive = sectionId === COGNITIVE_SECTION_ID;
  const [values, setValues] = useState<Record<string, string>>(() => initialValues ?? {});
  const [submitted, setSubmitted] = useState<Set<string>>(() =>
    new Set(initialValues ? Object.keys(initialValues).filter((id) => (initialValues[id] ?? '').trim().length > 0) : [])
  );
  const [currentIndex, setCurrentIndex] = useState(() => Math.min(initialQuestionIndex, Math.max(0, total - 1)));
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(COGNITIVE_TIME_LIMIT_SECONDS);
  const [timeExpired, setTimeExpired] = useState(false);

  useEffect(() => {
    setValues(initialValues ?? {});
    setSubmitted(
      new Set(initialValues ? Object.keys(initialValues).filter((id) => (initialValues[id] ?? '').trim().length > 0) : [])
    );
    setCurrentIndex(Math.min(initialQuestionIndex, Math.max(0, total - 1)));
    if (isCognitive) {
      setSecondsRemaining(COGNITIVE_TIME_LIMIT_SECONDS);
      setTimeExpired(false);
    }
  }, [assessmentId, sectionIndex, isCognitive]);

  useEffect(() => {
    if (!isCognitive || timeExpired) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setTimeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isCognitive, timeExpired]);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex >= total - 1;
  const answeredCount = Object.keys(values).filter(
    (id) => (values[id] ?? '').trim().length > 0
  ).length;
  const progressPercent = total > 0 ? (answeredCount / total) * 100 : 0;

  const setValue = (questionId: string, value: string) => {
    setValues((prev) => ({ ...prev, [questionId]: value }));
    setAnswerError(null);
  };

  const flushCurrent = (questionId: string) => {
    const raw = (values[questionId] ?? '').trim();
    if (raw && !submitted.has(questionId)) {
      onResponseSaved?.(questionId, raw);
      setSubmitted((prev) => new Set(prev).add(questionId));
    }
  };

  function validateCurrentAnswer(): boolean {
    if (!currentQuestion) return true;
    const raw = (values[currentQuestion.id] ?? '').trim();
    if (raw.length === 0) {
      setAnswerError('Please enter an answer.');
      toast.error('Answer is required');
      return false;
    }
    if (raw.length < MIN_ANSWER_LENGTH) {
      setAnswerError(`Please write at least ${MIN_ANSWER_LENGTH} characters.`);
      toast.error(`Please write at least ${MIN_ANSWER_LENGTH} characters`);
      return false;
    }
    if (raw.length > MAX_ANSWER_LENGTH) {
      setAnswerError(`Please keep your answer under ${MAX_ANSWER_LENGTH} characters.`);
      toast.error(`Answer must be under ${MAX_ANSWER_LENGTH} characters`);
      return false;
    }
    setAnswerError(null);
    return true;
  }

  const handleNext = () => {
    if (!validateCurrentAnswer()) return;
    if (currentQuestion) flushCurrent(currentQuestion.id);
    if (isLastQuestion) {
      questions.forEach((q) => {
        const raw = (values[q.id] ?? '').trim();
        if (raw && !submitted.has(q.id)) {
          onResponseSaved?.(q.id, raw);
        }
      });
      onComplete();
    } else {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setAnswerError(null);
      onProgress?.(sectionIndex, next);
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
          <span className="flex items-center gap-3">
            <span>
              Section {sectionIndex} of {totalSections}
            </span>
            {isCognitive && (
              <span
                className={
                  secondsRemaining > 0 && secondsRemaining <= 60
                    ? 'font-semibold text-amber-600 dark:text-amber-400'
                    : timeExpired
                      ? 'text-muted-foreground'
                      : ''
                }
              >
                {timeExpired ? 'Time expired' : `${formatTime(secondsRemaining)} left`}
              </span>
            )}
          </span>
        </div>
        {isCognitive && secondsRemaining > 0 && secondsRemaining <= 60 && !timeExpired && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-2 font-medium">
            Less than 1 minute remaining
          </p>
        )}
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
              placeholder={`Share your thoughts... (min ${MIN_ANSWER_LENGTH} characters, Enter to go to next)`}
              className={`min-h-[100px] xs:min-h-[120px] text-sm xs:text-base resize-none rounded-lg border-2 bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors placeholder:text-muted-foreground/70 w-full min-w-0 ${
                answerError ? 'border-amber-500 dark:border-amber-500' : 'border-input'
              }`}
            />
            {answerError && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2" role="alert">
                {answerError}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {(values[currentQuestion.id] ?? '').trim().length} / {MAX_ANSWER_LENGTH} characters
            </p>
          </label>
        )}
      </div>

      <div className="pt-6 sm:pt-10 mt-4 pb-6 sm:pb-8 safe-bottom flex justify-end">
        <Button
          type="button"
          onClick={handleNext}
          size="lg"
          className="w-full sm:w-auto min-w-[120px] xs:min-w-[140px] h-11 xs:h-12 text-sm xs:text-base font-medium shadow-sm hover:shadow transition-shadow touch-manipulation"
        >
          {isLastQuestion ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
