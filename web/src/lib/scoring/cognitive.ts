const COGNITIVE_SECTION_ID = 'cognitive_architecture';

export interface CognitiveScoreResult {
  rawScore: number;
  correctCount: number;
  totalQuestions: number;
  iqPercentile: number;
}

interface ResponseRow {
  question_id: string;
  answer_numeric: number | null;
}

interface QuestionRow {
  id: string;
  section_id: string;
  correct_answer: string | null;
}

export function scoreCognitive(
  responses: ResponseRow[],
  questions: QuestionRow[]
): CognitiveScoreResult {
  const sectionQuestions = questions.filter((q) => q.section_id === COGNITIVE_SECTION_ID);
  const totalQuestions = sectionQuestions.length;
  if (totalQuestions === 0) {
    return { rawScore: 0, correctCount: 0, totalQuestions: 0, iqPercentile: 0 };
  }

  const questionMap = new Map(sectionQuestions.map((q) => [q.id, q]));
  let correctCount = 0;

  for (const r of responses) {
    const q = questionMap.get(r.question_id);
    if (!q?.correct_answer || r.answer_numeric == null) continue;

    const expected = Number(q.correct_answer);
    if (!Number.isNaN(expected) && r.answer_numeric === expected) {
      correctCount += 1;
    }
  }

  const rawScore = correctCount;
  const iqPercentile = Math.round((correctCount / totalQuestions) * 100);

  return {
    rawScore,
    correctCount,
    totalQuestions,
    iqPercentile,
  };
}
