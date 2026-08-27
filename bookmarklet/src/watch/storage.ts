/** 등록한 조건은 브라우저에 남겨 다음에 북마크를 눌렀을 때 이어서 쓴다. */
import type { WatchCondition } from "./types";

const KEY = "imax-seat-watch:conditions";

export function loadConditions(): WatchCondition[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WatchCondition[]) : [];
  } catch {
    return [];
  }
}

export function saveConditions(conditions: WatchCondition[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(conditions));
  } catch {
    // 저장에 실패해도 이번 감시는 계속 돌아야 한다.
  }
}
