'use client';

import { SectionWithMixedQuestions } from '../SectionWithMixedQuestions';
import type { SectionQuestion } from '@/lib/assessment';

export interface SelfSabotageSectionProps {
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

export function SelfSabotageSection(props: SelfSabotageSectionProps) {
  return (
    <SectionWithMixedQuestions
      {...props}
      title="Self-Sabotage Patterns"
      subtitle="This section looks at habits that might quietly hold you back when things matter."
      hasTimer={false}
    />
  );
}
