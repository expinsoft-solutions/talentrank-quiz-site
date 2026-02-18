/**
 * Parse questionnaire JSON (from assessments table (questionnaire definition)) into sections and questions
 * in the shape expected by the API and scoring (DbSection[], DbQuestion[]).
 */

export interface QuestionnaireSection {
  id: string;
  name: string;
  order_index: number;
  isTimed?: boolean;
  time_limit_seconds?: number | null;
  purpose?: string | null;
  questions: QuestionnaireQuestion[];
}

export interface QuestionnaireQuestion {
  id: string;
  text?: string;
  statement?: string;
  type: string;
  dimension?: string | null;
  reverse_scored?: boolean;
  reverseScored?: boolean;
  weight?: number | null;
  correct_answer?: string | null;
  active?: boolean;
  options?: string[];
}

export interface DbSection {
  id: string;
  name: string;
  order_index: number;
  isTimed: boolean | null;
  time_limit_seconds: number | null;
  purpose: string | null;
}

export interface DbQuestion {
  id: string;
  section_id: string;
  text: string;
  type: string;
  dimension: string | null;
  reverse_scored: boolean | null;
  weight: number | null;
  correct_answer: string | null;
  active: boolean | null;
  options: string[] | null;
}

export function parseQuestionnaire(questionnaire: unknown): { sections: DbSection[]; questions: DbQuestion[] } {
  const sections: DbSection[] = [];
  const questions: DbQuestion[] = [];
  if (!Array.isArray(questionnaire)) return { sections, questions };
  for (const row of questionnaire) {
    const s = row as Record<string, unknown>;
    const sectionId = typeof s.id === 'string' ? s.id : String(s.id);
    sections.push({
      id: sectionId,
      name: typeof s.name === 'string' ? s.name : '',
      order_index: typeof s.order_index === 'number' ? s.order_index : 0,
      isTimed: typeof s.isTimed === 'boolean' ? s.isTimed : null,
      time_limit_seconds: typeof s.time_limit_seconds === 'number' ? s.time_limit_seconds : null,
      purpose: typeof s.purpose === 'string' ? s.purpose : null,
    });
    const qList = Array.isArray(s.questions) ? s.questions : [];
    for (const qRow of qList) {
      const q = qRow as Record<string, unknown>;
      const active = q.active !== false;
      const textVal = q.statement ?? q.text;
      const reverseScoredVal = q.reverseScored ?? q.reverse_scored;
      const optionsVal = Array.isArray(q.options)
        ? (q.options as unknown[]).map((o) => String(o)).filter(Boolean)
        : null;
      questions.push({
        id: typeof q.id === 'string' ? q.id : String(q.id),
        section_id: sectionId,
        text: typeof textVal === 'string' ? textVal : '',
        type: typeof q.type === 'string' ? q.type : 'likert',
        dimension: typeof q.dimension === 'string' ? q.dimension : null,
        reverse_scored: typeof reverseScoredVal === 'boolean' ? reverseScoredVal : null,
        weight: typeof q.weight === 'number' ? q.weight : null,
        correct_answer: typeof q.correct_answer === 'string' ? q.correct_answer : null,
        active,
        options: optionsVal,
      });
    }
  }
  return { sections, questions };
}
