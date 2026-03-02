import type { DbSection, DbQuestion } from '@/types/assessment';

function parseSectionsArray(arr: unknown): { sections: DbSection[]; questions: DbQuestion[] } {
  const sections: DbSection[] = [];
  const questions: DbQuestion[] = [];
  if (!Array.isArray(arr)) return { sections, questions };
  for (const row of arr) {
    const s = row as Record<string, unknown>;
    const sectionId = typeof s.id === 'string' ? s.id : String(s.id);
    const enabled = s.enabled === undefined ? true : s.enabled === true;
    sections.push({
      id: sectionId,
      name: typeof s.name === 'string' ? s.name : '',
      orderIndex: typeof s.order_index === 'number' ? s.order_index : 0,
      isTimed: typeof s.isTimed === 'boolean' ? s.isTimed : null,
      timeLimitSeconds: typeof s.time_limit_seconds === 'number' ? s.time_limit_seconds : null,
      purpose: typeof s.purpose === 'string' ? s.purpose : null,
      enabled,
    });
    const qList = Array.isArray(s.questions) ? s.questions : [];
    for (const qRow of qList) {
      const q = qRow as Record<string, unknown>;
      const active = q.active !== false;
      const textVal = q.statement ?? q.text;
      const reverseScoredVal = q.reverseScored ?? q.reverse_scored;
      const qType = typeof q.type === 'string' ? q.type : 'likert';
      const optionsVal =
        qType !== 'likert' && Array.isArray(q.options)
          ? (q.options as unknown[]).map((o) => String(o)).filter(Boolean)
          : null;
      questions.push({
        id: typeof q.id === 'string' ? q.id : String(q.id),
        sectionId,
        text: typeof textVal === 'string' ? textVal : '',
        type: typeof q.type === 'string' ? q.type : 'likert',
        dimension: typeof q.dimension === 'string' ? q.dimension : null,
        reverseScored: typeof reverseScoredVal === 'boolean' ? reverseScoredVal : null,
        weight: typeof q.weight === 'number' ? q.weight : null,
        correctAnswer: typeof q.correct_answer === 'string' ? q.correct_answer : null,
        active,
        options: optionsVal,
      });
    }
  }
  return { sections, questions };
}

export type QuestionnaireVariant = 'free' | 'paid';

export function parseQuestionnaire(
  questionnaire: unknown,
  variant: QuestionnaireVariant = 'free'
): { sections: DbSection[]; questions: DbQuestion[] } {
  if (questionnaire && typeof questionnaire === 'object' && !Array.isArray(questionnaire)) {
    const obj = questionnaire as Record<string, unknown>;
    const part = obj[variant];
    if (part !== undefined) return parseSectionsArray(part);
    if (variant === 'paid') return { sections: [], questions: [] };
  }
  if (Array.isArray(questionnaire) && variant === 'paid') {
    return { sections: [], questions: [] };
  }
  return parseSectionsArray(questionnaire);
}
