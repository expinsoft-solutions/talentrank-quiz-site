/**
 * Parse questionnaire JSON (from assessments table (questionnaire definition)) into sections and questions
 * in the shape expected by the API and scoring (DbSection[], DbQuestion[]).
 */

export interface QuestionnaireSection {
  id: string;
  name: string;
  order_index: number;
  is_timed?: boolean;
  time_limit_seconds?: number | null;
  purpose?: string | null;
  questions: QuestionnaireQuestion[];
}

export interface QuestionnaireQuestion {
  id: string;
  text: string;
  type: string;
  dimension?: string | null;
  reverse_scored?: boolean;
  weight?: number | null;
  correct_answer?: string | null;
  active?: boolean;
}

export interface DbSection {
  id: string;
  name: string;
  order_index: number;
  is_timed: boolean | null;
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
      is_timed: typeof s.is_timed === 'boolean' ? s.is_timed : null,
      time_limit_seconds: typeof s.time_limit_seconds === 'number' ? s.time_limit_seconds : null,
      purpose: typeof s.purpose === 'string' ? s.purpose : null,
    });
    const qList = Array.isArray(s.questions) ? s.questions : [];
    for (const qRow of qList) {
      const q = qRow as Record<string, unknown>;
      const active = q.active !== false;
      questions.push({
        id: typeof q.id === 'string' ? q.id : String(q.id),
        section_id: sectionId,
        text: typeof q.text === 'string' ? q.text : '',
        type: typeof q.type === 'string' ? q.type : 'likert',
        dimension: typeof q.dimension === 'string' ? q.dimension : null,
        reverse_scored: typeof q.reverse_scored === 'boolean' ? q.reverse_scored : null,
        weight: typeof q.weight === 'number' ? q.weight : null,
        correct_answer: typeof q.correct_answer === 'string' ? q.correct_answer : null,
        active,
      });
    }
  }
  return { sections, questions };
}
