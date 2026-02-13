/**
 * Maps short-answer question text (or keywords) to report placeholder keys.
 * Matches by substring so DB question text can vary slightly.
 */
function matchShortAnswer(
  questionText: string,
  answer: string
): { key: string; value: string } | null {
  const t = questionText.toLowerCase();
  const a = (answer ?? '').trim();
  if (!a) return null;
  if (t.includes('do for work') || t.includes('hardest part') || t.includes('job')) return { key: 'Work Role', value: a };
  if (t.includes('couldn\'t fail') || t.includes('career')) return { key: 'Ambition', value: a };
  if (t.includes('misunderstand')) return { key: 'Misunderstood', value: a };
  if (t.includes('goal you\'ve had') || t.includes('haven\'t achieved') || t.includes('why not')) return { key: 'Insecurity', value: a };
  if (t.includes('making it') || t.includes('what does that look like')) return { key: 'Accomplishment', value: a };
  if (t.includes('frustrated at work')) return { key: 'Frustration', value: a };
  return null;
}

export interface AssessmentData {
  firstName: string;
  mbti: string;
  axisStrengths: Record<string, number>;
  cognitivePercentile: number | null;
  shortAnswers: Array<{ questionText: string; answerRaw: string }>;
}

export function buildAssessmentDataBlock(data: AssessmentData): string {
  const ei = data.axisStrengths['EI'] ?? 0;
  const ns = data.axisStrengths['SN'] ?? 0; // prompt uses "NS"
  const tf = data.axisStrengths['TF'] ?? 0;
  const jp = data.axisStrengths['JP'] ?? 0;

  const map: Record<string, string> = {
    'Work Role': '(Not provided)',
    Ambition: '(Not provided)',
    Misunderstood: '(Not provided)',
    Insecurity: '(Not provided)',
    Accomplishment: '(Not provided)',
  };

  for (const { questionText, answerRaw } of data.shortAnswers) {
    const m = matchShortAnswer(questionText, answerRaw);
    if (m && map[m.key] !== undefined) map[m.key] = m.value;
  }

  const iqLabel = data.cognitivePercentile != null
    ? `Percentile: ${Math.round(Number(data.cognitivePercentile))}`
    : '(Not assessed)';

  return `## ASSESSMENT DATA:
- Name: ${data.firstName || 'There'}
- MBTI: ${data.mbti || '----'} with axis strengths EI ${ei}, NS ${ns}, TF ${tf}, JP ${jp}
- IQ: ${iqLabel}
- Work: ${map['Work Role']}
- Ambition: ${map['Ambition']}
- Misunderstood trait: ${map['Misunderstood']}
- Insecurity: ${map['Insecurity']}
- Success vision: ${map['Accomplishment']}`;
}

const SYSTEM_PROMPT = `You are writing a psychological profile that makes someone feel seen, then makes them unable to look away. Your job is to show this person their edge, then show them exactly how they're wasting it. They should finish reading and feel: "This is the first time anyone has actually understood what I am. And I can't keep doing what I've been doing."

## PSYCHOLOGICAL FRAMEWORK:
FINDING THE EDGE: Analyze their MBTI + IQ combination to identify their genuine cognitive advantage. Be specific. What can they do that most people can't? This should feel like validation they've always wanted but rarely received. Name what makes them rare.

FINDING THE BLUNT: How are they dulling their own edge? Look at the gap between their wiring and their current work role. Look at the contradiction between their ambition and their insecurity. What are the specific behaviors that keep them operating below capacity? Frame this as waste, not failure. "You have X and you're using it for Y" is more painful than "You're failing at Y."

FINDING THE BLOCK: What's the protective mechanism underneath? Not the fear they stated. The deeper one that explains the pattern. This should feel like something they've always suspected but never named.

FINDING THE COST: What has this already cost them? Be specific to their stated ambition and accomplishment vision. Use time, comparison, and concrete images to make it sting.

## QUALITY CONTROL:
- OUTPUT FORMAT: Plain text only. No markdown. No headers. No ##. No bullet symbols. Just paragraphs separated by line breaks. The title should be bold or standalone, followed by flowing prose.
- Every sentence should feel specific to them.
- Show behaviors, not fears.
- Include at least one visceral image from their work life.
- Sentences under 20 words.
- No therapy language. No emdashes. No announcing insights ("Here's the truth...").
- The opening line should make them lean in, not flinch.
- The cost section should make them wince.
- Never directly quote their misunderstood/insecurity responses; reframe them as observable behaviors.
- Transform self-descriptions into third-party observations ("You've noticed..." "Others see..." "In meetings, you tend to...").
- The hidden insecurity should EXPLAIN their stated fears, not repeat them.
- Did you name a fear or describe a behavior? Always behavior.
- Never announce insights with phrases like "Here's what you're actually afraid of:" — just state it directly.
- Include at least one visceral, concrete image from their work life.
- The close must include their name as the final word or second-to-last word.

## STRUCTURE (400-500 words):
**Title:** [First Name] — [Archetype that captures their edge + how they're blunting it]. Keep the title to just the archetype. Don't append MBTI descriptions.

The edge (2-3 sentences): Open by naming what makes them rare. Their cognitive wiring. What they can see or do that most people can't. Make them feel recognized for what they actually are.

The blunt (3-4 sentences): Show exactly how they're dulling that edge. The specific behaviors, the rationalizations, the loop. Use "you" constantly. Include one concrete image from their work life. Frame it as waste.

The block (2-3 sentences): Name the deeper pattern. The protective mechanism that made sense once. The thing that's now standing between them and what they want. This should feel like recognition, not accusation.

The cost (2-3 sentences): What has this already cost them? Be specific to their stated ambition. Not "you're not reaching your potential." Instead use concrete examples.

The tease + close (2-3 sentences): What the full report unlocks. Be specific to their wiring. End with a binary choice and their name.

Tone: Sharp, elevated, direct. Like someone who sees them clearly and respects them too much to flatter. They should feel rare, not broken. But they should also feel the weight of what they're leaving on the table.`;

export function buildUserMessage(assessmentDataBlock: string): string {
  return `${assessmentDataBlock}

Generate the assessment now.`;
}

export { SYSTEM_PROMPT };
