export type PersonalityKeyed = 'positive' | 'negative';

export interface PersonalityQuestion {
  id: string;
  question: string;
  keyed: PersonalityKeyed;
  options?: readonly string[];
}

export const LIKERT_SCALE_POINTS = 5;

export const LIKERT_LABELS_BY_SECTION: Record<string, readonly [string, string, string, string, string]> = {
  personality_wiring: ['Very Inaccurate', 'Moderately Inaccurate', 'Neutral', 'Moderately Accurate', 'Very Accurate'],
  self_sabotage: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'],
  optimal_environment: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
};

const OPTIMAL_ENVIRONMENT_QUESTION_LABELS: Record<string, readonly [string, string, string, string, string]> = {
  E3: ['Complete Autonomy', 'Some Autonomy', 'Balanced', 'Some Guidance', 'Detailed Guidance'],
  E8: ['Mostly Solo', 'Lean Solo', 'Balanced', 'Lean Team', 'Mostly Team'],
  E11: ['Fully Remote', 'Mostly Remote', 'Hybrid', 'Mostly In-Person', 'Fully In-Person'],
  E12: ['Quiet/Focused', 'Mostly Quiet', 'Balanced', 'Mostly Buzzing', 'Buzzing/Social'],
};

const DEFAULT_SECTION_ID = 'personality_wiring';

export function getLikertLabels(sectionId: string | undefined): readonly string[] {
  const id = sectionId && sectionId in LIKERT_LABELS_BY_SECTION ? sectionId : DEFAULT_SECTION_ID;
  return LIKERT_LABELS_BY_SECTION[id] ?? LIKERT_LABELS_BY_SECTION[DEFAULT_SECTION_ID];
}

export function getLikertLabelsForQuestion(sectionId: string | undefined, questionId: string): readonly string[] {
  if (questionId in OPTIMAL_ENVIRONMENT_QUESTION_LABELS) {
    return OPTIMAL_ENVIRONMENT_QUESTION_LABELS[questionId];
  }
  return getLikertLabels(sectionId);
}

export function getLikertAnchors(sectionId: string | undefined): { left: string; right: string } {
  const labels = getLikertLabels(sectionId);
  return { left: labels[0], right: labels[labels.length - 1] };
}

export function getLikertAnchorsForQuestion(sectionId: string | undefined, questionId: string): { left: string; right: string } {
  const labels = getLikertLabelsForQuestion(sectionId, questionId);
  return { left: labels[0], right: labels[labels.length - 1] };
}
