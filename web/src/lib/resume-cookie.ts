export interface ResumeCookiePayload {
  assessmentId: string;
  clientToken: string;
  phase: 'section' | 'collect_user' | 'complete';
  sectionIndex: number;
  questionIndex: number;
}

export function getResumeCookie(): ResumeCookiePayload | null {
  return null;
}

export function setResumeCookie(_payload: ResumeCookiePayload): void {}

export function clearResumeCookie(): void {}
