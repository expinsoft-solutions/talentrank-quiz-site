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
  imageUrls?: string[];
  image_urls?: string[];
  optionImageUrls?: (string | null)[];
  option_image_urls?: (string | null)[];
}

export interface DbSection {
  id: string;
  name: string;
  orderIndex: number;
  isTimed: boolean | null;
  timeLimitSeconds: number | null;
  purpose: string | null;
}

export interface DbQuestion {
  id: string;
  sectionId: string;
  text: string;
  type: string;
  dimension: string | null;
  reverseScored: boolean | null;
  weight: number | null;
  correctAnswer: string | null;
  active: boolean | null;
  options: string[] | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  optionImageUrls?: (string | null)[] | null;
}

export type QuestionnaireVariant = 'free' | 'paid';

function parseSectionsArray(arr: unknown): { sections: DbSection[]; questions: DbQuestion[] } {
  const sections: DbSection[] = [];
  const questions: DbQuestion[] = [];
  if (!Array.isArray(arr)) return { sections, questions };
  for (const row of arr) {
    const s = row as Record<string, unknown>;
    const sectionId = typeof s.id === 'string' ? s.id : String(s.id);
    sections.push({
      id: sectionId,
      name: typeof s.name === 'string' ? s.name : '',
      orderIndex: typeof s.order_index === 'number' ? s.order_index : 0,
      isTimed: typeof s.isTimed === 'boolean' ? s.isTimed : null,
      timeLimitSeconds: typeof s.time_limit_seconds === 'number' ? s.time_limit_seconds : null,
      purpose: typeof s.purpose === 'string' ? s.purpose : null,
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
          ? (q.options as unknown[]).map((o) => (o == null ? '' : String(o)))
          : null;
      const imageUrlVal = q.imageUrl ?? q.image_url;
      const imageUrl = typeof imageUrlVal === 'string' && imageUrlVal.trim() ? imageUrlVal.trim() : null;
      const imageUrlsVal = q.imageUrls ?? q.image_urls;
      const imageUrls =
        Array.isArray(imageUrlsVal)
          ? (imageUrlsVal as unknown[]).map((u) => String(u).trim()).filter(Boolean)
          : imageUrl
            ? [imageUrl]
            : null;
      const optionImageUrlsVal = q.optionImageUrls ?? q.option_image_urls;
      const optionImageUrls =
        Array.isArray(optionImageUrlsVal)
          ? (optionImageUrlsVal as unknown[]).map((u) =>
              typeof u === 'string' && u.trim() ? u.trim() : null
            )
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
        imageUrl,
        imageUrls,
        optionImageUrls,
      });
    }
  }
  return { sections, questions };
}

export function parseQuestionnaire(
  questionnaire: unknown,
  variant: QuestionnaireVariant = 'free'
): { sections: DbSection[]; questions: DbQuestion[] } {
  if (questionnaire && typeof questionnaire === 'object' && !Array.isArray(questionnaire)) {
    const obj = questionnaire as Record<string, unknown>;
    const part = obj[variant];
    if (part !== undefined) return parseSectionsArray(part);
  }
  return parseSectionsArray(questionnaire);
}
