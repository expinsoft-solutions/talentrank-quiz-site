const PERSONALITY_SECTION_ID = 'personality_wiring';
const MBTI_AXES = ['EI', 'SN', 'TF', 'JP'] as const;
type MbtiAxis = (typeof MBTI_AXES)[number];
const FIRST_LETTER: Record<MbtiAxis, [string, string]> = {
  EI: ['E', 'I'], SN: ['N', 'S'], TF: ['F', 'T'], JP: ['J', 'P'],
};
const SCALE_CONFIG: Record<5 | 7, { max: number; mid: number }> = {
  5: { max: 5, mid: 3 },
  7: { max: 7, mid: 4 },
};

export type LikertScalePoints = 5 | 7;

interface ResponseRow {
  questionId: string;
  answerNumeric: number | null;
}
interface QuestionRow {
  id: string;
  sectionId: string;
  dimension: string | null;
  reverseScored: boolean | null;
  weight: number | null;
}

function scoredValue(raw: number, reverse: boolean, scaleMax: number): number {
  const clamped = Math.max(1, Math.min(scaleMax, Math.round(raw)));
  return reverse ? scaleMax + 1 - clamped : clamped;
}

export function scorePersonality(
  responses: ResponseRow[],
  questions: QuestionRow[],
  options: { scalePoints?: LikertScalePoints } = {}
): { mbti: string; axisStrengths: Record<string, number>; neuroticismScore?: number } {
  const scalePoints = options.scalePoints ?? 7;
  const { max: SCALE_MAX, mid: SCALE_MID } = SCALE_CONFIG[scalePoints];
  const questionsBySection = questions.filter((q) => q.sectionId === PERSONALITY_SECTION_ID);
  const questionMap = new Map(questionsBySection.map((q) => [q.id, q]));
  const dimensionScores: Record<string, { sum: number; count: number }> = {};

  for (const r of responses) {
    const q = questionMap.get(r.questionId);
    if (!q?.dimension || r.answerNumeric == null) continue;
    const dim = q.dimension;
    if (!dimensionScores[dim]) dimensionScores[dim] = { sum: 0, count: 0 };
    const weight = q.weight ?? 1;
    const value = scoredValue(r.answerNumeric, q.reverseScored ?? false, SCALE_MAX);
    dimensionScores[dim].sum += value * weight;
    dimensionScores[dim].count += 1;
  }

  let mbti = '';
  const axisStrengths: Record<string, number> = {};
  let neuroticismScore: number | undefined;

  for (const axis of MBTI_AXES) {
    const d = dimensionScores[axis];
    if (!d || d.count === 0) {
      axisStrengths[axis] = 0;
      mbti += FIRST_LETTER[axis][1];
      continue;
    }
    const midpoint = d.count * SCALE_MID;
    const maxRange = d.count * (SCALE_MAX - SCALE_MID);
    const score = d.sum;
    mbti += FIRST_LETTER[axis][score > midpoint ? 0 : 1];
    axisStrengths[axis] = maxRange > 0
      ? Math.min(100, Math.round((Math.abs(score - midpoint) / maxRange) * 100))
      : 0;
  }

  const neuro = dimensionScores['NEURO'];
  if (neuro && neuro.count > 0) {
    neuroticismScore = Math.round((neuro.sum / (neuro.count * SCALE_MAX)) * 100);
  }
  return { mbti, axisStrengths, neuroticismScore };
}
