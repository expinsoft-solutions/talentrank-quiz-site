'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import type { SectionQuestion } from '@/lib/assessment';
import { COGNITIVE_SECTION_ID } from '@/lib/assessment';
import { QuestionByType, validateTextAnswer } from './QuestionByType';

const COGNITIVE_TIME_LIMIT_SECONDS = 360;
const LIKERT_AUTO_ADVANCE_MS = 350;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface SectionWithMixedQuestionsProps {
  sectionId: string;
  sectionIndex: number;
  totalSections: number;
  questions: SectionQuestion[];
  title?: string;
  subtitle?: string;
  hasTimer?: boolean;
  initialAnswers?: Record<string, string | number>;
  initialQuestionIndex?: number;
  onComplete: () => void;
  onProgress?: (sectionIndex: number, questionIndex: number) => void;
  onResponseSaved?: (questionId: string, answerNumeric?: number, answerRaw?: string) => void;
}

export function SectionWithMixedQuestions({
  sectionId,
  sectionIndex,
  totalSections,
  questions,
  title,
  subtitle,
  hasTimer = false,
  initialAnswers = {},
  initialQuestionIndex = 0,
  onComplete,
  onProgress,
  onResponseSaved,
}: SectionWithMixedQuestionsProps) {
  const total = questions.length;
  const [answers, setAnswers] = useState<Record<string, string | number>>(() => initialAnswers);
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(initialQuestionIndex, Math.max(0, total - 1))
  );
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(COGNITIVE_TIME_LIMIT_SECONDS);
  const [timeExpired, setTimeExpired] = useState(false);
  const expiredHandledRef = useRef(false);
  const likertAutoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSyncRef = useRef(false);

  useEffect(() => {
    expiredHandledRef.current = false;
  }, [sectionId]);

  useEffect(() => () => {
    if (likertAutoAdvanceRef.current) clearTimeout(likertAutoAdvanceRef.current);
  }, []);

  useEffect(() => {
    setAnswers(initialAnswers);
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
    } else {
      setCurrentIndex(Math.min(initialQuestionIndex, Math.max(0, total - 1)));
    }
  }, [sectionId, initialAnswers, initialQuestionIndex, total]);

  useEffect(() => {
    if (!hasTimer) return;
    setSecondsRemaining(COGNITIVE_TIME_LIMIT_SECONDS);
    setTimeExpired(false);
  }, [sectionId, hasTimer]);

  useEffect(() => {
    if (!hasTimer || timeExpired) return;
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
  }, [hasTimer, timeExpired]);

  useEffect(() => {
    if (!hasTimer || !timeExpired || expiredHandledRef.current) return;
    if (sectionId !== COGNITIVE_SECTION_ID) return;
    expiredHandledRef.current = true;
    onComplete();
  }, [hasTimer, timeExpired, sectionId, onComplete]);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex >= total - 1;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = total > 0 ? (answeredCount / total) * 100 : 0;
  const showTimer = hasTimer && sectionId === COGNITIVE_SECTION_ID;
  const warningAtOneMinute = showTimer && secondsRemaining > 0 && secondsRemaining <= 60 && !timeExpired;

  const setAnswer = (questionId: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setAnswerError(null);
  };

  const flushCurrent = (questionId: string) => {
    const val = answers[questionId];
    if (val === undefined) return;
    const q = questions.find((x) => x.id === questionId);
    if (!q) return;
    if (q.type === 'text') {
      const raw = typeof val === 'string' ? val.trim() : '';
      if (raw) onResponseSaved?.(questionId, undefined, raw);
    } else if (q.type === 'mcq' || q.type === 'binary') {
      if (typeof val === 'string') {
        onResponseSaved?.(questionId, undefined, val);
      } else {
        const num = typeof val === 'number' ? val : undefined;
        if (num != null) onResponseSaved?.(questionId, num);
      }
    } else {
      const num = typeof val === 'number' ? val : undefined;
      if (num != null) onResponseSaved?.(questionId, num);
    }
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    const val = answers[currentQuestion.id];
    if (currentQuestion.type === 'text') {
      const raw = typeof val === 'string' ? val : '';
      const err = validateTextAnswer(raw);
      if (err) {
        setAnswerError(err);
        toast.error(err);
        return;
      }
    } else if (
      (currentQuestion.type === 'mcq' || currentQuestion.type === 'binary') &&
      typeof val === 'string'
    ) {
    } else if (val === undefined || val === null || val === '') {
      setAnswerError('Please select an answer.');
      toast.error('Please select an answer.');
      return;
    }
    setAnswerError(null);
    flushCurrent(currentQuestion.id);
    if (isLastQuestion) {
      questions.forEach((q) => {
        if (answers[q.id] !== undefined) flushCurrent(q.id);
      });
      onComplete();
    } else {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      onProgress?.(sectionIndex, next);
    }
  };

  if (total === 0) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">No questions in this section.</p>
      </div>
    );
  }

  const currentVal = currentQuestion ? answers[currentQuestion.id] : undefined;

  const handleChange = (v: string | number) => {
    if (!currentQuestion) return;
    setAnswer(currentQuestion.id, v);
    const isChoiceType =
      currentQuestion.type === 'likert' ||
      currentQuestion.type === 'mcq' ||
      currentQuestion.type === 'binary';
    const numericVal = typeof v === 'number' ? v : undefined;
    if (isChoiceType && numericVal != null) {
      if (likertAutoAdvanceRef.current) clearTimeout(likertAutoAdvanceRef.current);
      const isLast = currentIndex >= total - 1;
      const idx = currentIndex;
      const questionId = currentQuestion.id;
      likertAutoAdvanceRef.current = setTimeout(() => {
        likertAutoAdvanceRef.current = null;
        skipSyncRef.current = true;
        onResponseSaved?.(questionId, numericVal);
        if (isLast) {
          onComplete();
        } else {
          setCurrentIndex((prev) => prev + 1);
          onProgress?.(sectionIndex, idx + 1);
        }
      }, LIKERT_AUTO_ADVANCE_MS);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col w-full overflow-x-hidden safe-top safe-bottom bg-gradient-to-br from-indigo-50/70 via-background via-[45%] to-violet-50/50 dark:from-indigo-950/25 dark:via-background dark:via-[45%] dark:to-violet-950/20">
      <div className="sticky top-0 z-10 w-full px-4 sm:px-6 pt-4 sm:pt-5 pb-4 safe-top">
        <div className="w-full rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 bg-white/90 dark:bg-card/95 backdrop-blur-sm px-5 py-4 shadow-md border-l-4 border-l-indigo-500">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground font-medium mb-3">
            <span>
              Question {currentIndex + 1} of {total}
            </span>
            <span className="flex items-center gap-3">
              <span>
                Section {sectionIndex} of {totalSections}
              </span>
              {showTimer && (
                <span
                  className={
                    warningAtOneMinute
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
          {warningAtOneMinute && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-2 font-medium">
              Less than 1 minute remaining
            </p>
          )}
          {title && (
            <div className="mb-3">
              <p className="text-sm font-medium text-indigo-900/90 dark:text-foreground leading-snug">
                {title}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
          <Progress
            value={progressPercent}
            className="h-2.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 [&>div]:bg-indigo-500 [&>div]:dark:bg-indigo-400"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-10 sm:py-14 min-h-0 w-full">
        <div className="w-full max-w-3xl min-w-0 space-y-6">
          {currentQuestion && (
            <>
              <QuestionByType
                question={currentQuestion}
                sectionId={sectionId}
                value={currentVal}
                onChange={handleChange}
                onBlur={() => flushCurrent(currentQuestion.id)}
                onEnter={handleNext}
                error={answerError}
              />
              {(currentQuestion.type === 'text' ||
                ((currentQuestion.type === 'mcq' ||
                  currentQuestion.type === 'binary') &&
                  typeof currentVal === 'string')) && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={handleNext}
                    size="lg"
                    className="min-w-[120px]"
                  >
                    {isLastQuestion ? 'Finish' : 'Next'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
