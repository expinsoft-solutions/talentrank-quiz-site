import type { DbQuestion, DbSection } from '@/types';
import type { PersonalityQuestion } from '@/data/personalityQuestions';

const PERSONALITY_SECTION_ID = 'personality_wiring';
const COGNITIVE_SECTION_ID = 'cognitive_architecture';
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
  options: GetOrderedSectionStepsOptions = {}
): SectionStep[] {
  const { excludeCognitive = true } = options;
  const ordered = [...sections].sort((a, b) => a.order_index - b.order_index);
  const filtered = excludeCognitive
    ? ordered.filter((s) => s.id !== COGNITIVE_SECTION_ID)
    : ordered;

  return filtered.map((section, index) => {
    const sectionQuestions = questions.filter((q) => q.section_id === section.id);
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
        keyed: (q.reverse_scored ? 'negative' : 'positive') as 'positive' | 'negative',
        ...(q.options && q.options.length > 0 && { options: q.options }),
      })),
    } satisfies LikertSectionStep;
  });
}

export function getFallbackSectionSteps(): SectionStep[] {
  return [];
}
