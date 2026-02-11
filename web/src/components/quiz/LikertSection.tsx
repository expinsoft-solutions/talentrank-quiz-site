'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  type PersonalityQuestion,
  LIKERT_SCALE_POINTS,
  getLikertLabelsForQuestion,
  getLikertAnchorsForQuestion,
} from '@/data/personalityQuestions';
import { shuffleArray } from '@/lib/array';
import { supabase } from '@/lib/supabase';
import type { PersonalityAnswer } from '@/types';

function randomizedAlternating(questions: PersonalityQuestion[]): PersonalityQuestion[] {
  const positive = shuffleArray(questions.filter((q) => q.keyed === 'positive'));
  const negative = shuffleArray(questions.filter((q) => q.keyed === 'negative'));
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

function getCircleColor(index: number, total: number, selected: boolean, hover?: boolean): string {
  const mid = (total - 1) / 2;
  const active = selected || hover;
  if (index < mid) {
    return active
      ? 'border-teal-500 bg-teal-500/90 ring-2 ring-teal-500/25 dark:border-teal-400 dark:bg-teal-500/80'
      : 'border-gray-200 bg-transparent hover:border-gray-300 dark:border-gray-600 dark:bg-transparent dark:hover:border-gray-500';
  }
  if (index > mid) {
    return active
      ? 'border-indigo-500 bg-indigo-500/90 ring-2 ring-indigo-500/25 dark:border-indigo-400 dark:bg-indigo-500/80'
      : 'border-gray-200 bg-transparent hover:border-gray-300 dark:border-gray-600 dark:bg-transparent dark:hover:border-gray-500';
  }
  return active
    ? 'border-slate-500 bg-slate-500 ring-2 ring-slate-500/20 dark:border-slate-400 dark:bg-slate-500'
    : 'border-gray-200 bg-transparent hover:border-gray-300 dark:border-gray-600 dark:bg-transparent dark:hover:border-gray-500';
}

function getSelectedDotColor(index: number, total: number): string {
  const mid = (total - 1) / 2;
  if (index === mid) return 'bg-slate-800 dark:bg-slate-200';
  return 'bg-white';
}

interface LikertSectionProps {
  assessmentId?: string | null;
  clientToken?: string | null;
  questions?: PersonalityQuestion[];
  sectionId?: string;
  sectionIndex?: number;
  totalSections?: number;
  onComplete?: (answers: PersonalityAnswer[]) => void;
  onPrevious?: () => void;
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
    if (error) {
      console.error('submitResponse error', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('submitResponse error', e);
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
  sectionIndex,
  totalSections,
  onComplete,
  onPrevious,
  isFirstSection = false,
  isLastSection = false,
}: LikertSectionProps) {
  const orderedQuestions = useMemo(
    () => randomizedAlternating(questions),
    [questions],
  );
  const total = orderedQuestions.length;
  const [answers, setAnswers] = useState<PersonalityAnswer[]>([]);
  const [hoveredScale, setHoveredScale] = useState<{ questionId: string; value: number } | null>(null);
  const sectionKey = sectionId ?? 'personality_wiring';
  const sectionCopy = SECTION_COPY[sectionKey];

  // Reset local state when we move to a new section / question set
  useEffect(() => {
    setAnswers([]);
    setHoveredScale(null);
  }, [assessmentId, sectionId, orderedQuestions]);

  const answeredCount = answers.length;
  const progressPercent = total > 0 ? (answeredCount / total) * 100 : 0;
  const allAnswered = answeredCount === total;

  const setAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => {
      const rest = prev.filter((a) => a.id !== questionId);
      return [...rest, { id: questionId, answer: value }];
    });
    if (assessmentId && clientToken) {
      submitResponse(assessmentId, clientToken, questionId, String(value), value, null).then((ok) => {
        if (!ok) {
          // best-effort; failures are logged in submitResponse
        }
      });
    }
  };

  const handleComplete = () => {
    if (allAnswered) onComplete?.(answers);
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
      <div className="min-h-screen min-h-[100dvh] flex flex-col px-3 xs:px-4 sm:px-6 py-0 max-w-2xl mx-auto w-full overflow-x-hidden safe-top safe-bottom">
        <div className="sticky top-0 z-10 w-full -mx-3 xs:-mx-4 sm:-mx-6 px-3 xs:px-4 sm:px-6 pt-3 xs:pt-4 sm:pt-5 pb-3 xs:pb-4 bg-background/95 backdrop-blur-md border-b border-border/80 safe-top">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground font-medium tracking-wide">
              <span>
                {total - answeredCount} questions left
              </span>
              {sectionIndex != null && totalSections != null && (
                <span>
                  Section {sectionIndex} of {totalSections}
                </span>
              )}
            </div>
            {sectionCopy && (
              <div className="rounded-xl border border-border/70 bg-muted/60 px-3 py-2 sm:px-4 sm:py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] xs:text-xs font-semibold tracking-wide text-foreground/80 uppercase mb-0.5">
                  {sectionCopy.title}
                </p>
                <p className="text-[11px] xs:text-xs text-muted-foreground leading-snug">
                  {sectionCopy.subtitle}
                </p>
              </div>
            )}
            <Progress value={progressPercent} className="h-2.5 sm:h-3 rounded-full shadow-inner" />
          </div>
        </div>

        <div className="flex-1 px-0 py-6 sm:py-8 space-y-0">
          {orderedQuestions.map((q, qIndex) => {
            const selectedValue = answers.find((a) => a.id === q.id)?.answer;
            const prevAnswered =
              qIndex === 0 ||
              answers.some((a) => a.id === orderedQuestions[qIndex - 1].id);
            const locked = !prevAnswered;
            const labels = getLikertLabelsForQuestion(sectionId, q.id);
            const perQuestionAnchors = getLikertAnchorsForQuestion(sectionId, q.id);

            return (
              <div
                key={q.id}
                className={
                  qIndex < orderedQuestions.length - 1
                    ? 'pb-8 sm:pb-10 mb-8 sm:mb-10 border-b border-border/60'
                    : 'pb-6'
                }
              >
                <div
                  className={
                    locked
                      ? 'pointer-events-none opacity-50 select-none transition-opacity duration-200'
                      : 'transition-opacity duration-200'
                  }
                >
                  <div className="max-w-[640px] mb-4">
                    <p className="text-[18px] sm:text-[19px] font-semibold text-foreground text-left leading-relaxed">
                      {q.question}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground shrink-0 w-10 xs:w-14 sm:w-16 text-left">
                      {perQuestionAnchors.left}
                    </span>
                    <div className="flex-1 flex items-center justify-between gap-0.5 xs:gap-1 sm:gap-2 min-w-0 shrink-0">
                      {Array.from({ length: LIKERT_SCALE_POINTS }, (_, i) => {
                        const value = i + 1;
                        const selected = selectedValue === value;
                        const hover = hoveredScale?.questionId === q.id && hoveredScale?.value === value;
                        return (
                          <Tooltip key={value}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setAnswer(q.id, value)}
                                onMouseEnter={() => setHoveredScale({ questionId: q.id, value })}
                                onMouseLeave={() => setHoveredScale(null)}
                                disabled={locked}
                                className={`
                                  rounded-full border flex items-center justify-center
                                  transition-transform transition-colors duration-150 ease-out
                                  active:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/40
                                  flex-shrink-0
                                  ${getCircleSize(i, LIKERT_SCALE_POINTS)}
                                  ${getCircleColor(i, LIKERT_SCALE_POINTS, selected, hover)}
                                `}
                                aria-label={labels[i]}
                              >
                                {selected && (
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ring-2 ring-white/50 ${getSelectedDotColor(i, LIKERT_SCALE_POINTS)}`}
                                  />
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
                    <span className="text-[11px] xs:text-xs text-muted-foreground shrink-0 w-10 xs:w-16 sm:w-20 text-right">
                      {perQuestionAnchors.right}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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
    </TooltipProvider>
  );
}

