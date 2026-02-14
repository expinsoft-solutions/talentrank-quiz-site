/**
 * Helpers for displaying assessment results: labels, blurbs, and primary outputs.
 */

const AXIS_TO_LETTER: Record<string, [string, string]> = {
  EI: ['E', 'I'],
  SN: ['N', 'S'],
  TF: ['F', 'T'],
  JP: ['J', 'P'],
};

export function getAxisStrengthLabel(pct: number): 'Slight' | 'Moderate' | 'Strong' | 'Very Strong' {
  if (pct >= 80) return 'Very Strong';
  if (pct >= 70) return 'Strong';
  if (pct >= 60) return 'Moderate';
  return 'Slight';
}

export function getAxisDisplayEntries(
  mbti: string,
  axisStrengths: Record<string, number>
): Array<{ letter: string; pct: number; label: string }> {
  const axes = ['EI', 'SN', 'TF', 'JP'] as const;
  return axes.map((axis) => {
    const [a, b] = AXIS_TO_LETTER[axis];
    const letter = mbti[axes.indexOf(axis)] === a ? a : b;
    const pct = axisStrengths[axis] ?? 0;
    return { letter, pct, label: getAxisStrengthLabel(pct) };
  });
}

const SABOTAGE_DIMENSION_NAMES: Record<string, string> = {
  perfectionism: 'Perfectionism Paralysis',
  impostor: 'Impostor Pattern',
  self_handicapping: 'Self-Handicapping',
  validation_seeking: 'Validation Seeking',
  avoidance: 'Risk/Conflict Avoidance',
};

export function getSabotageProfile(scores: Record<string, number>): Array<{ name: string; scoreOutOf5: string; pct: number }> {
  const entries = Object.entries(scores)
    .map(([dim, pct]) => ({
      name: SABOTAGE_DIMENSION_NAMES[dim] ?? dim,
      scoreOutOf5: ((pct / 100) * 5).toFixed(1),
      pct,
    }))
    .sort((a, b) => b.pct - a.pct);
  return entries.slice(0, 3);
}

const ENV_DIMENSION_NAMES: Record<string, string> = {
  autonomy: 'Autonomy',
  pace: 'Pace',
  social: 'Social',
  risk: 'Risk',
  work_mode: 'Work mode',
};

const ENV_LABELS: Record<string, [string, string, string]> = {
  autonomy: ['Low', 'Mixed', 'High'],
  pace: ['Slow', 'Moderate', 'Fast'],
  social: ['Team-leaning', 'Mixed', 'Solo-leaning'],
  risk: ['Low tolerance', 'Moderate', 'High tolerance'],
  work_mode: ['Remote', 'Hybrid', 'In-person'],
};

function getEnvTier(pct: number): 0 | 1 | 2 {
  if (pct >= 67) return 2;
  if (pct >= 34) return 1;
  return 0;
}

export function getEnvLabel(pct: number): 'Low' | 'Mixed' | 'High' {
  const t = getEnvTier(pct);
  return t === 2 ? 'High' : t === 1 ? 'Mixed' : 'Low';
}

export function getEnvDisplay(scores: Record<string, number>): Array<{ name: string; label: string; pct: number }> {
  return Object.entries(scores).map(([dim, pct]) => {
    const tier = getEnvTier(pct);
    const labels = ENV_LABELS[dim];
    const label = labels ? labels[tier] : (tier === 2 ? 'High' : tier === 1 ? 'Mixed' : 'Low');
    return {
      name: ENV_DIMENSION_NAMES[dim] ?? dim,
      label,
      pct,
    };
  });
}

/** Map percentile (0–100, from cognitive % correct) to tier and estimated IQ range. */
export function getCognitiveTier(percentile: number): string {
  if (percentile >= 95) return 'Top 5%';
  if (percentile >= 85) return 'Top 15%';
  if (percentile >= 70) return 'Top 30%';
  if (percentile >= 50) return 'Top 50%';
  return 'Below median';
}

/** Rough estimated IQ range from percentile (0–100). */
export function getCognitiveRange(percentile: number): string {
  if (percentile >= 95) return '130+';
  if (percentile >= 85) return '115-129';
  if (percentile >= 70) return '100-114';
  if (percentile >= 50) return '85-99';
  return '70-84';
}

/** Short blurb per MBTI type for "Your Type Explained". */
const MBTI_BLURBS: Record<string, string> = {
  INTJ: 'INTJ — The Architect: Strategic, independent, driven by logic and long-term vision. You excel at systems and turning ideas into plans.',
  INTP: 'INTP — The Thinker: Analytical, theory-builder; obsessed with how things work. You love patterns and improving models.',
  ENTJ: 'ENTJ — The Commander: Decisive, natural leader, high standards. You drive results and organize people and resources.',
  ENTP: 'ENTP — The Debater: Quick, innovative, loves ideas and debate. You see possibilities and challenge assumptions.',
  INFJ: 'INFJ — The Advocate: Insightful, values-driven, focused on meaning. You understand people and want to help them grow.',
  INFP: 'INFP — The Mediator: Idealistic, empathetic, creative. You care deeply about values and authenticity.',
  ENFJ: 'ENFJ — The Protagonist: Charismatic, empathetic leader. You inspire others and care about their growth.',
  ENFP: 'ENFP — The Campaigner: Enthusiastic, creative, sees potential in people. You connect ideas and inspire action.',
  ISTJ: 'ISTJ — The Logistician: Reliable, factual, order and duty matter. You deliver consistency and follow through.',
  ISFJ: 'ISFJ — The Defender: Supportive, observant, loyal. You protect and care for people in practical ways.',
  ESTJ: 'ESTJ — The Executive: Direct, organized, upholds structure. You get things done and expect the same from others.',
  ESFJ: 'ESFJ — The Consul: Warm, cooperative, keeps harmony. You care for the group and make sure everyone is included.',
  ISTP: 'ISTP — The Virtuoso: Practical, observant, hands-on problem-solver. You understand how things work and fix them.',
  ISFP: 'ISFP — The Adventurer: Gentle, aesthetic, lives in the moment. You value freedom and authentic experience.',
  ESTP: 'ESTP — The Entrepreneur: Energetic, pragmatic, action-oriented. You thrive on risk and real-world results.',
  ESFP: 'ESFP — The Entertainer: Spontaneous, friendly, loves fun and people. You bring energy and make others feel good.',
};

export function getMbtiBlurb(mbti: string): string {
  const key = mbti.toUpperCase();
  return MBTI_BLURBS[key] ?? `${mbti} — Your type shapes how you learn, communicate, and make decisions.`;
}

/** IQ / cognitive blurb by percentile band. */
export function getCognitiveBlurb(percentile: number): string {
  if (percentile >= 90) return 'You live in rare air. Ideas connect quickly, your insights stand out, and others often feel both intrigued and challenged by how fast you think.';
  if (percentile >= 70) return 'Your cognitive range places you in the top tier. You grasp complex ideas quickly and find connections others miss.';
  if (percentile >= 50) return 'You think clearly and learn well. Your mind is well-suited to structured problems and steady improvement.';
  return 'You approach problems in your own way. Steady effort and the right context help you show your best.';
}

/** Percentile room blurb. */
export function getPercentileRoomBlurb(percentile: number): string {
  if (percentile >= 95) return "In a room of 100 people, you'd be among the very sharpest — few would be ahead of you.";
  if (percentile >= 70) return "In a room of 100 people, you'd be ahead of most. Your reasoning stands out.";
  if (percentile >= 50) return "In a room of 100 people, you'd be in the stronger half. You hold your own.";
  return "In a room of 100 people, you'd be in the middle of the pack. There's room to grow.";
}
