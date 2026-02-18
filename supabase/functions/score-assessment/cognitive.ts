const COGNITIVE_SECTION_ID = 'cognitive_architecture';

interface ResponseRow { questionId: string; answerNumeric: number | null; }
interface QuestionRow { id: string; sectionId: string; correctAnswer: string | null; }

export function scoreCognitive(
  responses: ResponseRow[],
  questions: QuestionRow[]
): { rawScore: number; correctCount: number; totalQuestions: number; iqPercentile: number } {
  const sectionQuestions = questions.filter((q) => q.sectionId === COGNITIVE_SECTION_ID);
  const totalQuestions = sectionQuestions.length;
  if (totalQuestions === 0) return { rawScore: 0, correctCount: 0, totalQuestions: 0, iqPercentile: 0 };

  const questionMap = new Map(sectionQuestions.map((q) => [q.id, q]));
  let correctCount = 0;
  for (const r of responses) {
    const q = questionMap.get(r.questionId);
    if (!q?.correctAnswer || r.answerNumeric == null) continue;
    const expected = Number(q.correctAnswer);
    if (!Number.isNaN(expected) && r.answerNumeric === expected) correctCount += 1;
  }
  return {
    rawScore: correctCount,
    correctCount,
    totalQuestions,
    iqPercentile: Math.round((correctCount / totalQuestions) * 100),
  };
}
