'use client';

import { SectionWithMixedQuestions } from '../SectionWithMixedQuestions';
import type { SectionQuestion } from '@/lib/assessment';

export interface OptimalEnvironmentSectionProps {
  sectionId: string;
  sectionIndex: number;
  totalSections: number;
  questions: SectionQuestion[];
  initialAnswers?: Record<string, string | number>;
  initialQuestionIndex?: number;
  onComplete: () => void;
  onProgress?: (sectionIndex: number, questionIndex: number) => void;
  onResponseSaved?: (questionId: string, answerNumeric?: number, answerRaw?: string) => void;
}

export function OptimalEnvironmentSection(props: OptimalEnvironmentSectionProps) {
  return (
    <SectionWithMixedQuestions
      {...props}
      title="Optimal Work Environment"
      subtitle="Here we identify the conditions where you do your best, most sustainable work."
      hasTimer={false}
    />
  );
}
