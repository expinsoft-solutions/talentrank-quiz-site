'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SectionQuestion } from '@/lib/assessment';
import {
  LIKERT_SCALE_POINTS,
  getLikertLabelsForQuestion,
} from '@/data/personalityQuestions';

const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 2000;

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

export interface QuestionByTypeProps {
  question: SectionQuestion;
  sectionId: string | undefined;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  onBlur?: () => void;
  onEnter?: () => void;
  error?: string | null;
}

export function QuestionByType({
  question,
  sectionId,
  value,
  onChange,
  onBlur,
  onEnter,
  error,
}: QuestionByTypeProps) {
  const [hoveredScale, setHoveredScale] = useState<number | null>(null);

  if (question.type === 'text') {
    const textVal = typeof value === 'string' ? value : '';
    return (
      <label className="block">
        <p className="text-base sm:text-lg font-medium text-foreground mb-3 text-left leading-relaxed">
          {question.question}
        </p>
        <Textarea
          value={textVal}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onEnter?.();
            }
          }}
          placeholder={`Share your thoughts... (min ${MIN_TEXT_LENGTH} characters, Enter for next)`}
          className={`min-h-[100px] xs:min-h-[120px] text-sm xs:text-base resize-none rounded-lg border-2 bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors placeholder:text-muted-foreground/70 w-full min-w-0 ${
            error ? 'border-amber-500 dark:border-amber-500' : 'border-input'
          }`}
        />
        {error && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2" role="alert">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {textVal.trim().length} / {MAX_TEXT_LENGTH} characters
        </p>
      </label>
    );
  }

  if (question.type === 'likert') {
    const numVal = typeof value === 'number' ? value : undefined;
    const labels = getLikertLabelsForQuestion(sectionId, question.id);
    return (
      <TooltipProvider delayDuration={100} skipDelayDuration={0}>
        <Card className="w-full max-w-full rounded-2xl border-indigo-200/70 dark:border-indigo-800/50 bg-white dark:bg-card shadow-xl overflow-hidden border-t-4 border-t-indigo-400 dark:border-t-indigo-500">
          <CardContent className="p-10 sm:p-14 space-y-12">
            <p className="text-2xl sm:text-3xl font-semibold text-foreground text-left leading-relaxed">
              {question.question}
            </p>
            <div className="flex items-center gap-3 sm:gap-4 w-full min-w-0 pt-1">
              <span className="text-xs text-muted-foreground shrink-0 w-12 sm:w-16 text-left leading-relaxed">
                {labels[0]}
              </span>
              <div className="flex-1 flex items-center justify-between gap-2 sm:gap-3 min-w-0">
                {Array.from({ length: LIKERT_SCALE_POINTS }, (_, i) => {
                  const v = i + 1;
                  const selected = numVal === v;
                  const hover = hoveredScale === v;
                  return (
                    <Tooltip key={v}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onChange(v)}
                          onMouseEnter={() => setHoveredScale(v)}
                          onMouseLeave={() => setHoveredScale(null)}
                          className={`rounded-full flex items-center justify-center transition-all duration-200 ease-out active:scale-[1.02] focus:outline-none flex-shrink-0 touch-manipulation ${getCircleSize(
                            i,
                            LIKERT_SCALE_POINTS
                          )} ${getCircleColor(selected, hover)}`}
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
                {labels[LIKERT_SCALE_POINTS - 1]}
              </span>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    );
  }

  if (question.type === 'mcq' && question.options && question.options.length > 0) {
    const numVal = typeof value === 'number' ? value : undefined;
    return (
      <Card className="w-full max-w-full rounded-2xl border-indigo-200/70 dark:border-indigo-800/50 bg-white dark:bg-card shadow-xl overflow-hidden border-t-4 border-t-indigo-400 dark:border-t-indigo-500">
        <CardContent className="p-10 sm:p-14 space-y-8">
          <p className="text-2xl sm:text-3xl font-semibold text-foreground text-left leading-relaxed">
            {question.question}
          </p>
          <div className="flex flex-col gap-3">
            {question.options.map((opt, i) => {
              const v = i + 1;
              const selected = numVal === v;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange(v)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                    selected
                      ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20'
                      : 'border-border hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (question.type === 'binary' && question.options && question.options.length >= 2) {
    const numVal = typeof value === 'number' ? value : undefined;
    const opts = question.options.slice(0, 2);
    return (
      <Card className="w-full max-w-full rounded-2xl border-indigo-200/70 dark:border-indigo-800/50 bg-white dark:bg-card shadow-xl overflow-hidden border-t-4 border-t-indigo-400 dark:border-t-indigo-500">
        <CardContent className="p-10 sm:p-14 space-y-8">
          <p className="text-2xl sm:text-3xl font-semibold text-foreground text-left leading-relaxed">
            {question.question}
          </p>
          <div className="flex flex-wrap gap-4">
            {opts.map((opt, i) => {
              const v = i + 1;
              const selected = numVal === v;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange(v)}
                  className={`flex-1 min-w-[140px] px-6 py-4 rounded-xl border-2 transition-colors font-medium ${
                    selected
                      ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20'
                      : 'border-border hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-full rounded-2xl border-indigo-200/70 dark:border-indigo-800/50 bg-white dark:bg-card shadow-xl overflow-hidden border-t-4 border-t-indigo-400 dark:border-t-indigo-500">
      <CardContent className="p-10 sm:p-14">
        <p className="text-2xl sm:text-3xl font-semibold text-foreground text-left leading-relaxed">
          {question.question}
        </p>
        <p className="text-sm text-muted-foreground mt-2">Unsupported question type.</p>
      </CardContent>
    </Card>
  );
}

export function validateTextAnswer(raw: string): string | null {
  const t = raw.trim();
  if (t.length === 0) return 'Please enter an answer.';
  if (t.length < MIN_TEXT_LENGTH) return `Please write at least ${MIN_TEXT_LENGTH} characters.`;
  if (t.length > MAX_TEXT_LENGTH) return `Please keep your answer under ${MAX_TEXT_LENGTH} characters.`;
  return null;
}
