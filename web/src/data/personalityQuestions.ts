export type PersonalityKeyed = 'positive' | 'negative';

export interface PersonalityQuestion {
  id: string;
  question: string;
  keyed: PersonalityKeyed;
}

export const AGREE_DISAGREE_SCALE = 7;

/** Explicit 7-point Likert labels for hover/tap tooltip (validated psychometric style). */
export const LIKERT_LABELS_7 = [
  'Strongly Agree',
  'Agree',
  'Slightly Agree',
  'Neutral',
  'Slightly Disagree',
  'Disagree',
  'Strongly Disagree',
] as const;

/** Scale anchors: quiet, supportive (muted gray). */
export const AGREE_DISAGREE_LABELS = {
  left: 'Agree',
  right: 'Disagree',
} as const;
