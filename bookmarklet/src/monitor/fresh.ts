/**
 * 감시의 판단 부분. 직전 확인과 견주어 이번에 새로 나타난 것만 골라낸다.
 * 무엇을 감시하는지는 알지 않는다.
 */

/** 이번 확인에서 처음 보는 것만 고른다. */
export function pickFresh<T>(seen: ReadonlySet<string>, current: T[], key: (item: T) => string): T[] {
  return current.filter((item) => !seen.has(key(item)));
}

/**
 * 다음 확인의 기준이 될 기억을 만든다. 이번에 없는 것은 잊는다.
 * 잊어야 사라졌다가 다시 나타난 것을 새로 알아볼 수 있다.
 */
export function remember<T>(current: T[], key: (item: T) => string): Set<string> {
  return new Set(current.map(key));
}
