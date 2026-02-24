import type { DbQuestion, DbSection } from '@/types';
import type { PersonalityQuestion } from '@/data/personalityQuestions';

const SHORT_ANSWER_SECTION_ID = 'short_answer';

export interface LikertSectionStep {
  sectionId: string;
  name: string;
  orderIndex: number;
  type: 'likert';
  questions: PersonalityQuestion[];
}

export interface ShortAnswerSectionStep {
  sectionId: string;
  name: string;
  orderIndex: number;
  type: 'text';
  questions: { id: string; question: string }[];
}

export type SectionStep = LikertSectionStep | ShortAnswerSectionStep;

export interface GetOrderedSectionStepsOptions {
  excludeCognitive?: boolean;
}

export function getOrderedSectionSteps(
  sections: DbSection[],
  questions: DbQuestion[],
  _options: GetOrderedSectionStepsOptions = {}
): SectionStep[] {
  const ordered = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const filtered = ordered.filter((s) => s.enabled !== false);

  return filtered.map((section, index) => {
    const sectionQuestions = questions.filter((q) => q.sectionId === section.id);
    if (section.id === SHORT_ANSWER_SECTION_ID) {
      return {
        sectionId: section.id,
        name: section.name,
        orderIndex: index + 1,
        type: 'text' as const,
        questions: sectionQuestions.map((q) => ({ id: q.id, question: q.text })),
      } satisfies ShortAnswerSectionStep;
    }
    return {
      sectionId: section.id,
      name: section.name,
      orderIndex: index + 1,
      type: 'likert' as const,
      questions: sectionQuestions.map((q) => ({
        id: q.id,
        question: q.text,
        keyed: (q.reverseScored ? 'negative' : 'positive') as 'positive' | 'negative',
        ...(q.type !== 'likert' && q.options && q.options.length > 0 && { options: q.options }),
      })),
    } satisfies LikertSectionStep;
  });
}

export function getFallbackSectionSteps(): SectionStep[] {
  return [];
}
