import type { DbQuestion, DbSection } from '@/types';

export const COGNITIVE_SECTION_ID = 'cognitive_architecture';

export type SectionQuestionType = 'text' | 'likert' | 'mcq' | 'binary';

export interface SectionQuestion {
  id: string;
  question: string;
  type: SectionQuestionType;
  options?: string[];
  keyed?: 'positive' | 'negative';
  reverseScored?: boolean;
}

export interface SectionStep {
  sectionId: string;
  name: string;
  orderIndex: number;
  questions: SectionQuestion[];
}

export interface GetOrderedSectionStepsOptions {
  excludeCognitive?: boolean;
}

function normalizeQuestionType(t: string | null | undefined): SectionQuestionType {
  const s = (t ?? '').toLowerCase();
  if (s === 'text' || s === 'likert' || s === 'mcq' || s === 'binary') return s as SectionQuestionType;
  return 'likert';
}

export function getOrderedSectionSteps(
  sections: DbSection[],
  questions: DbQuestion[],
  options: GetOrderedSectionStepsOptions = {}
): SectionStep[] {
  const ordered = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  let filtered = ordered.filter((s) => s.enabled !== false);
  if (options.excludeCognitive) {
    filtered = filtered.filter((s) => s.id !== COGNITIVE_SECTION_ID);
  }

  return filtered.map((section, index) => {
    const sectionQuestions = questions.filter((q) => q.sectionId === section.id);
    const questionsWithType: SectionQuestion[] = sectionQuestions.map((q) => ({
      id: q.id,
      question: q.text,
      type: normalizeQuestionType(q.type),
      ...(q.options && q.options.length > 0 && { options: [...q.options] }),
      keyed: q.reverseScored ? 'negative' : 'positive',
      reverseScored: q.reverseScored ?? false,
    }));
    return {
      sectionId: section.id,
      name: section.name,
      orderIndex: index + 1,
      questions: questionsWithType,
    };
  });
}

export function getFallbackSectionSteps(): SectionStep[] {
  return [];
}
