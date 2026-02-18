'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  type PersonalityQuestion,
  LIKERT_SCALE_POINTS,
  getLikertLabelsForQuestion,
} from '@/data/personalityQuestions';
import { shuffleArrayWithSeed } from '@/lib/array';
import { supabase } from '@/lib/supabase';
import type { PersonalityAnswer } from '@/types';

function randomizedAlternating(questions: PersonalityQuestion[], seed: string): PersonalityQuestion[] {
  const positive = shuffleArrayWithSeed(questions.filter((q) => q.keyed === 'positive'), seed + ':pos');
  const negative = shuffleArrayWithSeed(questions.filter((q) => q.keyed === 'negative'), seed + ':neg');
  const result: PersonalityQuestion[] = [];
  const maxLen = Math.max(positive.length, negative.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < positive.length) result.push(positive[i]);
    if (i < negative.length) result.push(negative[i]);
  }
  return result;
}

function getCircleSize(index: number, total: number): string {
  const mid = (total - 1) / 2;
  const distFromMid = Math.abs(index - mid);
  if (distFromMid === 0) {
    return 'w-6 h-6 min-[480px]:w-8 min-[480px]:h-8 sm:w-9 sm:h-9 min-w-[24px] min-h-[24px] sm:min-w-[36px] sm:min-h-[36px]';
  }
  if (distFromMid === 1) {
    return 'w-7 h-7 min-[480px]:w-9 min-[480px]:h-9 sm:w-10 sm:h-10 min-w-[28px] min-h-[28px] sm:min-w-[40px] sm:min-h-[40px]';
  }
  return 'w-7 h-7 min-[480px]:w-9 min-[480px]:h-9 sm:w-11 sm:h-11 min-w-[28px] min-h-[28px] sm:min-w-[44px] sm:min-h-[44px]';
}

function getCircleColor(selected: boolean, hover?: boolean): string {
  const active = selected || hover;
  const base =
    'border border-border/80 bg-background shadow-sm transition-colors duration-200 ease-out';
  const idle =
    'hover:border-muted-foreground/30 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2';
  const activeClass =
    'border-indigo-500 bg-indigo-500/95 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:bg-indigo-600/90';
  return active ? `${base} ${activeClass}` : `${base} ${idle}`;
}

interface LikertSectionProps {
  assessmentId?: string | null;
  clientToken?: string | null;
  questions?: PersonalityQuestion[];
  sectionId?: string;
  sectionIndex?: number;
  totalSections?: number;
  initialQuestionIndex?: number;
  initialAnswers?: PersonalityAnswer[];
  onComplete?: (answers: PersonalityAnswer[]) => void;
  onPrevious?: () => void;
  onProgress?: (sectionIndex: number, questionIndex: number) => void;
  onResponseSaved?: (questionId: string, answerNumeric: number) => void;
  isFirstSection?: boolean;
  isLastSection?: boolean;
}

async function submitResponse(
  assessmentId: string,
  clientToken: string,
  questionId: string,
  answerRaw: string,
  answerNumeric: number,
  timeTakenSeconds: number | null,
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
          answer_numeric: answerNumeric,
          time_taken_seconds: timeTakenSeconds,
        },
        { onConflict: 'assessment_id,question_id' },
      );
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

const SECTION_COPY: Record<string, { title: string; subtitle: string }> = {
  personality_wiring: {
    title: 'Personality Wiring',
    subtitle: 'These questions map how you naturally think, feel, and act across situations.',
  },
  self_sabotage: {
    title: 'Self-Sabotage Patterns',
    subtitle: 'This section looks at habits that might quietly hold you back when things matter.',
  },
  optimal_environment: {
    title: 'Optimal Work Environment',
    subtitle: 'Here we identify the conditions where you do your best, most sustainable work.',
  },
};

export function LikertSection({
  assessmentId,
  clientToken,
  questions = [],
  sectionId,
  sectionIndex = 0,
  totalSections,
  initialQuestionIndex = 0,
  initialAnswers,
  onComplete,
  onPrevious,
  onProgress,
  onResponseSaved,
  isFirstSection = false,
}: LikertSectionProps) {
  const seed = assessmentId ?? '';
  const orderedQuestions = useMemo(
    () => randomizedAlternating(questions, seed),
    [questions, seed],
  );
  const total = orderedQuestions.length;
  const [answers, setAnswers] = useState<PersonalityAnswer[]>(() => initialAnswers ?? []);
  const [hoveredScale, setHoveredScale] = useState<{ questionId: string; value: number } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(() => Math.min(initialQuestionIndex, Math.max(0, total - 1)));
  const [slideDirection, setSlideDirection] = useState<'forward' | 'back'>('forward');
  const sectionKey = sectionId ?? 'personality_wiring';
  const sectionCopy = SECTION_COPY[sectionKey];

  const currentQuestion = orderedQuestions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers.find((a) => a.id === currentQuestion.id)?.answer
    : undefined;
  const answeredCount = answers.length;
  const progressPercent = total > 0 ? (answeredCount / total) * 100 : 0;

  useEffect(() => {
    setAnswers(initialAnswers ?? []);
    setHoveredScale(null);
    setCurrentIndex(Math.min(initialQuestionIndex, Math.max(0, total - 1)));
  }, [assessmentId, sectionId]);

  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setAnswer = (questionId: string, value: number) => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    setAnswers((prev) => {
      const rest = prev.filter((a) => a.id !== questionId);
      return [...rest, { id: questionId, answer: value }];
    });
    onResponseSaved?.(questionId, value);
    if (assessmentId && clientToken) {
      void submitResponse(assessmentId, clientToken, questionId, String(value), value, null);
    }
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      autoAdvanceTimeoutRef.current = null;
      if (currentIndex >= total - 1) {
        onComplete?.([...answers.filter((a) => a.id !== questionId), { id: questionId, answer: value }]);
      } else {
        setSlideDirection('forward');
        const next = currentIndex + 1;
        setCurrentIndex(next);
        onProgress?.(sectionIndex, next);
      }
    }, 350);
  };

  useEffect(() => () => {
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
  }, []);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setSlideDirection('back');
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      onProgress?.(sectionIndex, prev);
    } else {
      onPrevious?.();
    }
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">No questions in this section.</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100} skipDelayDuration={0}>
      <div className="min-h-screen min-h-[100dvh] flex flex-col w-full overflow-x-hidden safe-top safe-bottom bg-gradient-to-br from-indigo-50/70 via-background via-[45%] to-violet-50/50 dark:from-indigo-950/25 dark:via-background dark:via-[45%] dark:to-violet-950/20">
        {/* Progress header — full width */}
        <div className="sticky top-0 z-10 w-full px-4 sm:px-6 pt-4 sm:pt-5 pb-4 safe-top">
          <div className="w-full rounded-2xl border border-indigo-200/60 dark:border-indigo-800/40 bg-white/90 dark:bg-card/95 backdrop-blur-sm px-5 py-4 shadow-md shadow-indigo-200/20 dark:shadow-black/20 border-l-4 border-l-indigo-500">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground font-medium mb-3">
              <span>
                Question {currentIndex + 1} of {total}
              </span>
              {sectionIndex != null && totalSections != null && (
                <span>
                  Section {sectionIndex} of {totalSections}
                </span>
              )}
            </div>
            {sectionCopy && (
              <div className="mb-3">
                <p className="text-sm font-medium text-indigo-900/90 dark:text-foreground leading-snug">
                  {sectionCopy.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  {sectionCopy.subtitle}
                </p>
              </div>
            )}
            <Progress value={progressPercent} className="h-2.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 [&>div]:bg-indigo-500 [&>div]:dark:bg-indigo-400" />
          </div>
        </div>

        {/* Question & scale — strict max-w-3xl, never wider */}
        <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-10 sm:py-14 min-h-0 w-full">
          {currentQuestion && (
            <div className="w-full max-w-3xl min-w-0 shrink-0">
              <Card
                key={currentIndex}
                className={`w-full max-w-full rounded-2xl border-indigo-200/70 dark:border-indigo-800/50 bg-white dark:bg-card shadow-xl shadow-indigo-200/25 dark:shadow-black/20 overflow-hidden animate-in fade-in duration-300 ease-out border-t-4 border-t-indigo-400 dark:border-t-indigo-500 ${
                slideDirection === 'forward' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'
              }`}
            >
              <CardContent className="p-10 sm:p-14 space-y-12">
                <div className="w-full">
                  <p className="text-2xl sm:text-3xl font-semibold text-foreground text-left leading-relaxed">
                    {currentQuestion.question}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 w-full min-w-0 pt-1">
                  <span className="text-xs text-muted-foreground shrink-0 w-12 sm:w-16 text-left leading-relaxed">
                    {getLikertLabelsForQuestion(sectionId, currentQuestion.id)[0]}
                  </span>
                  <div className="flex-1 flex items-center justify-between gap-2 sm:gap-3 min-w-0">
                    {Array.from({ length: LIKERT_SCALE_POINTS }, (_, i) => {
                      const value = i + 1;
                      const selected = currentAnswer === value;
                      const hover = hoveredScale?.questionId === currentQuestion.id && hoveredScale?.value === value;
                      const labels = getLikertLabelsForQuestion(sectionId, currentQuestion.id);
                      return (
                        <Tooltip key={value}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setAnswer(currentQuestion.id, value)}
                              onMouseEnter={() => setHoveredScale({ questionId: currentQuestion.id, value })}
                              onMouseLeave={() => setHoveredScale(null)}
                              className={`
                                rounded-full flex items-center justify-center
                                transition-all duration-200 ease-out
                                active:scale-[1.02] focus:outline-none
                                flex-shrink-0 touch-manipulation
                                ${getCircleSize(i, LIKERT_SCALE_POINTS)}
                                ${getCircleColor(selected, hover)}
                              `}
                              aria-label={labels[i]}
                            >
                              {selected && (
                                <span className="w-1.5 h-1.5 rounded-full ring-2 ring-white/50 bg-white" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs font-normal">
                            {labels[i]}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 w-12 sm:w-20 text-right leading-relaxed">
                    {getLikertLabelsForQuestion(sectionId, currentQuestion.id)[LIKERT_SCALE_POINTS - 1]}
                  </span>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

