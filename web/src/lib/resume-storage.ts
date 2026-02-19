import type { DbSection, DbQuestion } from '@/types/assessment';

const COOKIE_NAME = 'talentrank_resume';
const FALLBACK_KEY = 'talentrank_resume_fallback';
const MAX_AGE_DAYS = 7;
const MAX_COOKIE_BYTES = 3800;

export interface ResumeState {
  version: string;
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
    typeof s?.version === 'string' &&
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

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeDays: number): void {
  if (typeof document === 'undefined') return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function getResumeState(): ResumeState | null {
  if (typeof window === 'undefined') return null;
  try {
    let raw = getCookie(COOKIE_NAME);
    if (!raw) {
      raw = localStorage.getItem(FALLBACK_KEY);
      if (!raw) return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isValid(parsed) || isExpired(parsed.savedAt)) {
      clearResumeState();
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
    const value = JSON.stringify(full);
    if (value.length > MAX_COOKIE_BYTES) {
      localStorage.setItem(FALLBACK_KEY, value);
      deleteCookie(COOKIE_NAME);
    } else {
      setCookie(COOKIE_NAME, value, MAX_AGE_DAYS);
      localStorage.removeItem(FALLBACK_KEY);
    }
  } catch {
    //
  }
}

export function clearResumeState(): void {
  if (typeof window === 'undefined') return;
  deleteCookie(COOKIE_NAME);
  localStorage.removeItem(FALLBACK_KEY);
}
