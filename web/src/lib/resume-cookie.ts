/**
 * Persist quiz progress in a cookie so the user can resume after leaving.
 * Cookie stores: assessmentId, clientToken, phase, sectionIndex, questionIndex.
 * Actual answers are in Supabase; resume fetches them via resume-assessment.
 */

const COOKIE_NAME = 'talentrank_resume';
const MAX_AGE_DAYS = 7;

export interface ResumeCookiePayload {
  assessmentId: string;
  clientToken: string;
  phase: 'section' | 'collect_user' | 'complete';
  sectionIndex: number;
  questionIndex: number;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === 'undefined') return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function getResumeCookie(): ResumeCookiePayload | null {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ResumeCookiePayload;
    if (
      typeof parsed?.assessmentId === 'string' &&
      typeof parsed?.clientToken === 'string' &&
      typeof parsed?.phase === 'string' &&
      typeof parsed?.sectionIndex === 'number' &&
      typeof parsed?.questionIndex === 'number'
    ) {
      return parsed;
    }
  } catch {
    // ignore invalid JSON
  }
  return null;
}

export function setResumeCookie(payload: ResumeCookiePayload): void {
  setCookie(COOKIE_NAME, JSON.stringify(payload), MAX_AGE_DAYS);
}

export function clearResumeCookie(): void {
  deleteCookie(COOKIE_NAME);
}
