import { scorePersonality, type LikertScalePoints } from './personality.ts';
import { scoreCognitive } from './cognitive.ts';
import { scoreSubscales } from './subscales.ts';

interface ResponseRow {
  question_id: string;
  answer_numeric: number | null;
  time_taken_seconds: number | null;
}
interface QuestionRow {
  id: string;
  section_id: string;
  type: string | null;
  dimension: string | null;
  reverse_scored: boolean | null;
  weight: number | null;
  correct_answer: string | null;
}

export interface ScoreAssessmentResult {
  mbti: string;
  axisStrengths: Record<string, number>;
  iqPercentile: number;
  neuroticismScore?: number;
  selfSabotageScores?: Record<string, number>;
  optimalEnvScores?: Record<string, number>;
}

export function scoreAssessment(
  responses: ResponseRow[],
  questions: QuestionRow[],
  options: { personalityScalePoints?: LikertScalePoints } = {}
): ScoreAssessmentResult {
  const personality = scorePersonality(responses, questions, {
    scalePoints: options.personalityScalePoints ?? 5,
  });
  const cognitive = scoreCognitive(responses, questions);
  const subscales = scoreSubscales(responses, questions);
  return {
    mbti: personality.mbti || '----',
    axisStrengths: personality.axisStrengths,
    iqPercentile: cognitive.iqPercentile,
    ...(personality.neuroticismScore != null && { neuroticismScore: personality.neuroticismScore }),
    ...(subscales.selfSabotageScores && { selfSabotageScores: subscales.selfSabotageScores }),
    ...(subscales.optimalEnvScores && { optimalEnvScores: subscales.optimalEnvScores }),
  };
}
