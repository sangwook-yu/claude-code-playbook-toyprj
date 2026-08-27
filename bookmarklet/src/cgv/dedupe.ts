/**
 * CGV의 회차 조회는 같은 회차(같은 상영관·순번)를 가격 상품별로 여러 행 돌려줄 때가 있다.
 * 좌석 배치는 회차 단위이므로, 같은 회차를 여러 번 조회하면 같은 자리 목록이 중복으로 알려진다.
 * 처음 나온 행만 남겨 회차 하나에 한 행만 남도록 정리한다.
 */
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}
