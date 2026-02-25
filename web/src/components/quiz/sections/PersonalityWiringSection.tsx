'use client';

import { SectionWithMixedQuestions } from '../SectionWithMixedQuestions';
import type { SectionQuestion } from '@/lib/assessment';

export interface PersonalityWiringSectionProps {
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

export function PersonalityWiringSection(props: PersonalityWiringSectionProps) {
  return (
    <SectionWithMixedQuestions
      {...props}
      title="Personality Wiring"
      subtitle="These questions map how you naturally think, feel, and act across situations."
      hasTimer={false}
    />
  );
}
