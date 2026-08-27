/** 붙어 있는 빈자리를 찾는다. */
import { regionOf } from "./region";
import type { Hall, Region, Seat } from "./types";

/** 조건에 맞는 한 덩어리의 빈자리. */
export type SeatRun = {
  row: string;
  /** 왼쪽부터 차례로 놓인 좌석 번호. */
  numbers: number[];
  /** 이 덩어리가 속한 칸. 좌석마다 다를 수 있어 첫 좌석 기준이다. */
  region: Region;
};

/** 덩어리를 사람이 읽는 한 줄로. 예: "B5–B7 (3석)". */
export function describeRun(run: SeatRun): string {
  const first = run.numbers[0];
  const last = run.numbers[run.numbers.length - 1];
  const range = first === last ? `${run.row}${first}` : `${run.row}${first}–${run.row}${last}`;
  return `${range} (${run.numbers.length}석)`;
}

/** 덩어리를 다시 만나도 같은 값이 되는 식별자. */
export function runKey(run: SeatRun): string {
  return `${run.row}:${run.numbers.join(",")}`;
}

/**
 * 지정한 칸 안에서, 같은 열에 번호가 이어진 빈자리를 최소 길이 이상으로 찾는다.
 * 이어진 자리가 최소 길이보다 길면 그 덩어리 전체를 하나로 돌려준다.
 */
export function findRuns(
  seats: Seat[],
  hall: Hall,
  regions: Region[],
  minimum: number,
  includeMovable: boolean,
): SeatRun[] {
  if (minimum < 1) return [];

  const wanted = new Set(regions);
  const byRow = new Map<string, Seat[]>();

  for (const seat of seats) {
    if (!seat.free) continue;
    if (seat.movable && !includeMovable) continue;
    if (!wanted.has(regionOf(seat, hall))) continue;
    const bucket = byRow.get(seat.row);
    if (bucket) bucket.push(seat);
    else byRow.set(seat.row, [seat]);
  }

  const runs: SeatRun[] = [];

  for (const [row, rowSeats] of byRow) {
    rowSeats.sort((a, b) => a.number - b.number);

    let group: Seat[] = [];
    const flush = () => {
      if (group.length >= minimum) {
        runs.push({
          row,
          numbers: group.map((seat) => seat.number),
          region: regionOf(group[0], hall),
        });
      }
      group = [];
    };

    for (const seat of rowSeats) {
      const previous = group[group.length - 1];
      if (previous && seat.number !== previous.number + 1) flush();
      group.push(seat);
    }
    flush();
  }

  return runs;
}
