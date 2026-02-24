'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import type { CognitiveQuestion } from '@/types';
import { shuffleArray } from '@/lib/array';
import { supabase } from '@/lib/supabase';
import type { CognitiveAnswer, CognitiveSectionResult } from '@/types';

async function submitResponse(
  assessmentId: string,
  clientToken: string,
  questionId: string,
  answerRaw: string,
  answerNumeric: number,
  timeTakenSeconds: number | null
): Promise<void> {
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
      console.error('cognitive submitResponse error', error);
    }
  } catch (e) {
    console.error('cognitive submitResponse error', e);
  }
}

const SECTION_TIME_SECONDS = 360;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface CognitiveSectionProps {
  assessmentId?: string | null;
  clientToken?: string | null;
  questions?: CognitiveQuestion[];
  sectionIndex?: number;
  totalSections?: number;
  timeLimitSeconds?: number;
  onComplete?: (result: CognitiveSectionResult) => void;
}

export function CognitiveSection({
  assessmentId,
  clientToken,
  questions = [],
  sectionIndex,
  totalSections,
  timeLimitSeconds = SECTION_TIME_SECONDS,
  onComplete,
}: CognitiveSectionProps) {
  const [orderedQuestions] = useState(() => shuffleArray(questions));
  const total = orderedQuestions.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<CognitiveAnswer[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(timeLimitSeconds);
  const [timeExpired, setTimeExpired] = useState(false);
  const [sectionStartTime] = useState(() => Date.now());
  const questionStartTimeRef = useRef(Date.now());

  const currentQuestion = orderedQuestions[currentIndex];
  const currentAnswerEntry = answers.find((a) => a.id === currentQuestion?.id);
  const progressPercent = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
  const warningAtOneMinute = secondsRemaining > 0 && secondsRemaining <= 60;

  useEffect(() => {
    if (timeExpired) return;
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
  }, [timeExpired]);

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setInputValue(currentAnswerEntry?.answer?.toString() ?? '');
  }, [currentIndex, currentQuestion?.id, currentAnswerEntry?.answer]);

  const recordTimeAndNavigate = (nextIndex: number) => {
    const timeSpent = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
    if (currentQuestion && inputValue.trim() !== '') {
      const num = Number(inputValue.trim());
      if (!Number.isNaN(num)) {
        setAnswers((prev) => {
          const rest = prev.filter((a) => a.id !== currentQuestion.id);
          return [...rest, { id: currentQuestion.id, answer: num, timeTaken: timeSpent }];
        });
        if (assessmentId && clientToken) {
          submitResponse(assessmentId, clientToken, currentQuestion.id, inputValue.trim(), num, timeSpent);
        }
      }
    }
    setCurrentIndex(nextIndex);
  };

  const goNext = () => {
    if (currentIndex < total - 1) {
      recordTimeAndNavigate(currentIndex + 1);
    } else {
      const timeSpent = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
      let finalAnswers = [...answers];
      if (currentQuestion && inputValue.trim() !== '' && assessmentId && clientToken) {
        const num = Number(inputValue.trim());
        if (!Number.isNaN(num)) {
          finalAnswers = [
            ...answers.filter((a) => a.id !== currentQuestion.id),
            { id: currentQuestion.id, answer: num, timeTaken: timeSpent },
          ];
          submitResponse(assessmentId, clientToken, currentQuestion.id, inputValue.trim(), num, timeSpent);
        }
      }
      const totalTimeUsed = Math.round((Date.now() - sectionStartTime) / 1000);
      onComplete?.({
        answers: finalAnswers,
        timeExpired,
        totalTimeUsed,
      });
    }
  };

  const isLast = currentIndex >= total - 1;
  const currentAnswered =
    inputValue.trim() !== '' && !Number.isNaN(Number(inputValue.trim()));

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 sm:py-8 max-w-2xl mx-auto w-full">
      <div className="w-full mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground mb-2">
          <span>Question {currentIndex + 1} of {total}</span>
          <span className="flex items-center gap-3">
            {sectionIndex != null && totalSections != null && (
              <span>Section {sectionIndex} of {totalSections}</span>
            )}
            <span
              className={
                warningAtOneMinute
                  ? 'font-semibold text-amber-600 dark:text-amber-400'
                  : timeExpired
                    ? 'text-muted-foreground'
                    : ''
              }
            >
              {timeExpired ? 'Time expired' : formatTime(secondsRemaining)} left
            </span>
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        {warningAtOneMinute && !timeExpired && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 font-medium">
            Less than 1 minute remaining
          </p>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-6 sm:mb-8">
              {currentQuestion.question}
            </h2>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Enter your answer"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="max-w-[200px] text-lg h-12"
              autoFocus
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-end gap-3 sm:gap-4 pt-6 sm:pt-8">
        <Button
          type="button"
          onClick={goNext}
          disabled={!currentAnswered}
          className="min-w-0"
        >
          {isLast ? 'Complete' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
