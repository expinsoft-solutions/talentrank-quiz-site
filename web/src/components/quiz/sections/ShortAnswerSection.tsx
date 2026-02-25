'use client';

import { SectionWithMixedQuestions } from '../SectionWithMixedQuestions';
import type { SectionQuestion } from '@/lib/assessment';

export interface ShortAnswerSectionProps {
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

export function ShortAnswerSection(props: ShortAnswerSectionProps) {
  return (
    <SectionWithMixedQuestions
      {...props}
      title="Short answer"
      subtitle="Share your thoughts in your own words."
      hasTimer={false}
    />
  );
}
