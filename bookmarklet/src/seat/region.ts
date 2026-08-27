/** 좌석이 상영관의 어느 칸에 있는지 가린다. */
import type { Depth, Hall, Region, Seat, Side } from "./types";

/** 값이 범위의 어느 3등분에 드는지. 범위가 0이면 가운데로 본다. */
function third(value: number, start: number, end: number): 0 | 1 | 2 {
  const span = end - start;
  if (span <= 0) return 1;

  const ratio = (value - start) / span;
  if (ratio < 1 / 3) return 0;
  if (ratio < 2 / 3) return 1;
  return 2;
}

const DEPTHS: Depth[] = ["front", "middle", "back"];
const SIDES: Side[] = ["left", "center", "right"];

export function regionOf(seat: Seat, hall: Hall): Region {
  const depth = DEPTHS[third(seat.y, hall.yStart, hall.yEnd)];
  const side = SIDES[third(seat.x, hall.xStart, hall.xEnd)];
  return `${depth}-${side}`;
}
