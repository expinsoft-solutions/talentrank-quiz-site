import { describe, it, expect } from 'vitest';
import { scorePersonality } from '../personality';

const SECTION = 'personality_wiring';

function q(id: string, dimension: string, reverse = false, weight = 1) {
  return { id, sectionId: SECTION, type: 'likert', dimension, reverseScored: reverse, weight, correctAnswer: null };
}

function r(questionId: string, value: number) {
  return { questionId, answerNumeric: value, timeTakenSeconds: null };
}

describe('scorePersonality', () => {
  it('all max (7) on 7-point scale yields E,N,F,J and high axis strengths', () => {
    const questions = [
      q('e1', 'EI'), q('e2', 'EI'),
      q('s1', 'SN'), q('s2', 'SN'),
      q('t1', 'TF'), q('t2', 'TF'),
      q('j1', 'JP'), q('j2', 'JP'),
    ];
    const responses = questions.map((q) => r(q.id, 7));
    const result = scorePersonality(responses, questions, { scalePoints: 7 });
    expect(result.mbti).toBe('ENFJ');
    expect(result.axisStrengths.EI).toBe(100);
    expect(result.axisStrengths.SN).toBe(100);
    expect(result.axisStrengths.TF).toBe(100);
    expect(result.axisStrengths.JP).toBe(100);
  });

  it('all min (1) on 7-point scale yields I,S,T,P and high axis strengths', () => {
    const questions = [
      q('e1', 'EI'), q('e2', 'EI'),
      q('s1', 'SN'), q('s2', 'SN'),
      q('t1', 'TF'), q('t2', 'TF'),
      q('j1', 'JP'), q('j2', 'JP'),
    ];
    const responses = questions.map((q) => r(q.id, 1));
    const result = scorePersonality(responses, questions, { scalePoints: 7 });
    expect(result.mbti).toBe('ISTP');
    expect(result.axisStrengths.EI).toBe(100);
    expect(result.axisStrengths.SN).toBe(100);
    expect(result.axisStrengths.TF).toBe(100);
    expect(result.axisStrengths.JP).toBe(100);
  });

  it('midpoint (4) on 7-point scale yields second letter and zero strength', () => {
    const questions = [
      q('e1', 'EI'), q('e2', 'EI'),
      q('s1', 'SN'), q('s2', 'SN'),
      q('t1', 'TF'), q('t2', 'TF'),
      q('j1', 'JP'), q('j2', 'JP'),
    ];
    const responses = questions.map((q) => r(q.id, 4));
    const result = scorePersonality(responses, questions, { scalePoints: 7 });
    expect(result.mbti).toBe('ISTP');
    expect(result.axisStrengths.EI).toBe(0);
    expect(result.axisStrengths.SN).toBe(0);
    expect(result.axisStrengths.TF).toBe(0);
    expect(result.axisStrengths.JP).toBe(0);
  });

  it('5-point scale: all 5 yields E,N,F,J', () => {
    const questions = [
      q('e1', 'EI'), q('e2', 'EI'),
      q('s1', 'SN'), q('s2', 'SN'),
      q('t1', 'TF'), q('t2', 'TF'),
      q('j1', 'JP'), q('j2', 'JP'),
    ];
    const responses = questions.map((q) => r(q.id, 5));
    const result = scorePersonality(responses, questions, { scalePoints: 5 });
    expect(result.mbti).toBe('ENFJ');
  });

  it('5-point scale: all 3 yields I,S,T,P (midpoint)', () => {
    const questions = [
      q('e1', 'EI'), q('e2', 'EI'),
      q('s1', 'SN'), q('s2', 'SN'),
      q('t1', 'TF'), q('t2', 'TF'),
      q('j1', 'JP'), q('j2', 'JP'),
    ];
    const responses = questions.map((q) => r(q.id, 3));
    const result = scorePersonality(responses, questions, { scalePoints: 5 });
    expect(result.mbti).toBe('ISTP');
    expect(result.axisStrengths.EI).toBe(0);
  });

  it('reverse-scored: low raw becomes high contribution', () => {
    const questions = [
      q('e1', 'EI', false),
      q('e2', 'EI', true),
    ];
    const responses = [r('e1', 7), r('e2', 1)];
    const result = scorePersonality(responses, questions, { scalePoints: 7 });
    expect(result.mbti).toBe('ESTP');
    expect(result.axisStrengths.EI).toBe(100);
  });

  it('NEURO dimension produces neuroticismScore 0-100', () => {
    const questions = [
      q('n1', 'NEURO'), q('n2', 'NEURO'),
    ];
    const responses = [r('n1', 7), r('n2', 7)];
    const result = scorePersonality(responses, questions, { scalePoints: 7 });
    expect(result.neuroticismScore).toBe(100);
  });

  it('ignores non-personality_wiring questions', () => {
    const questions = [
      q('e1', 'EI'),
      { ...q('x1', 'EI'), sectionId: 'other_section', id: 'x1' },
    ];
    const responses = [r('e1', 7), r('x1', 1)];
    const result = scorePersonality(responses, questions, { scalePoints: 7 });
    expect(result.mbti).toBe('ESTP');
    expect(result.axisStrengths.EI).toBe(100);
  });
});
