const SCALE_MAX = 5;
const SECTIONS = { self_sabotage: 'self_sabotage', optimal_environment: 'optimal_environment' } as const;

interface ResponseRow { question_id: string; answer_numeric: number | null; }
interface QuestionRow {
  id: string; section_id: string; dimension: string | null;
  reverse_scored: boolean | null; weight: number | null;
}

function scoredValue(raw: number, reverse: boolean): number {
  const clamped = Math.max(1, Math.min(SCALE_MAX, Math.round(raw)));
  return reverse ? SCALE_MAX + 1 - clamped : clamped;
}

function scoreSectionByDimension(
  responses: ResponseRow[],
  questions: QuestionRow[],
  sectionId: string
): Record<string, number> {
  const sectionQuestions = questions.filter((q) => q.section_id === sectionId);
  const questionMap = new Map(sectionQuestions.map((q) => [q.id, q]));
  const dimensionScores: Record<string, { sum: number; count: number }> = {};
  for (const r of responses) {
    const q = questionMap.get(r.question_id);
    if (!q?.dimension || r.answer_numeric == null) continue;
    const dim = q.dimension;
    if (!dimensionScores[dim]) dimensionScores[dim] = { sum: 0, count: 0 };
    const value = scoredValue(r.answer_numeric, q.reverse_scored ?? false);
    dimensionScores[dim].sum += value * (q.weight ?? 1);
    dimensionScores[dim].count += 1;
  }
  const out: Record<string, number> = {};
  for (const [dim, d] of Object.entries(dimensionScores)) {
    if (d.count === 0) continue;
    out[dim] = Math.round((d.sum / (d.count * SCALE_MAX)) * 100);
  }
  return out;
}

export function scoreSubscales(
  responses: ResponseRow[],
  questions: QuestionRow[]
): { selfSabotageScores?: Record<string, number>; optimalEnvScores?: Record<string, number> } {
  const selfSabotageScores = scoreSectionByDimension(responses, questions, SECTIONS.self_sabotage);
  const optimalEnvScores = scoreSectionByDimension(responses, questions, SECTIONS.optimal_environment);
  return {
    ...(Object.keys(selfSabotageScores).length > 0 && { selfSabotageScores }),
    ...(Object.keys(optimalEnvScores).length > 0 && { optimalEnvScores }),
  };
}
