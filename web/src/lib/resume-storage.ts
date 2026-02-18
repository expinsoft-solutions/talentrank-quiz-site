import type { DbSection, DbQuestion } from '@/types/assessment';

const STORAGE_KEY = 'talentrank_resume';
const MAX_AGE_DAYS = 7;

export interface ResumeState {
  assessmentId: string;
  clientToken: string;
  phase: 'section' | 'collect_user';
  sectionIndex: number;
  questionIndex: number;
  sections: DbSection[];
  questions: DbQuestion[];
  responses: Record<string, { answerNumeric?: number; answerRaw?: string }>;
  savedAt: number;
}

function isValid(state: unknown): state is ResumeState {
  const s = state as Record<string, unknown>;
  return (
    typeof s?.assessmentId === 'string' &&
    typeof s?.clientToken === 'string' &&
    typeof s?.phase === 'string' &&
    typeof s?.sectionIndex === 'number' &&
    typeof s?.questionIndex === 'number' &&
    Array.isArray(s?.sections) &&
    Array.isArray(s?.questions) &&
    typeof s?.responses === 'object' &&
    s.responses !== null &&
    typeof s?.savedAt === 'number'
  );
}

function isExpired(savedAt: number): boolean {
  return Date.now() - savedAt > MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

export function getResumeState(): ResumeState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValid(parsed) || isExpired(parsed.savedAt)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setResumeState(state: Omit<ResumeState, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const full: ResumeState = { ...state, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    //
  }
}

export function clearResumeState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
