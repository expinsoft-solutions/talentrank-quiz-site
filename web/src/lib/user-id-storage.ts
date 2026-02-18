const KEY = 'talentrank_completed_user_id';

export function getCompletedUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setCompletedUserId(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, userId);
  } catch {
    //
  }
}
