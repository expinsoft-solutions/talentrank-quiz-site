import { scorePersonality, type LikertScalePoints } from './personality.ts';
import { scoreCognitive } from './cognitive.ts';
import { scoreSubscales } from './subscales.ts';

interface Response {
  questionId: string;
  answerIndex: number | null;
  timeTakenInSeconds: number | null;
}
interface Question {
  id: string;
  section_id: string;
  type: string | null;
  dimension: string | null;
  reverseScored: boolean | null;
  weight: number | null;
  options: string | null;
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
  responses: Response[],
  questions: Question[],
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
