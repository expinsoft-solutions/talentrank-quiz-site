'use client';

import { SectionWithMixedQuestions } from '../SectionWithMixedQuestions';
import type { SectionQuestion } from '@/lib/assessment';

export interface CognitiveArchitectureSectionProps {
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

export function CognitiveArchitectureSection(props: CognitiveArchitectureSectionProps) {
  return (
    <SectionWithMixedQuestions
      {...props}
      title="Cognitive Architecture"
      subtitle="Timed section. Answer each question as best you can."
      hasTimer={true}
    />
  );
}
