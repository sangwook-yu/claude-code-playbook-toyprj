import { describe, expect, it } from "vitest";

import { describeRun, findRuns, runKey } from "./adjacency";
import { regionOf } from "./region";
import type { Hall, Seat } from "./types";

/** 가로 0~29, 세로 0~29인 상영관. 3등분 경계는 10과 20이다. */
const hall: Hall = { xStart: 0, xEnd: 30, yStart: 0, yEnd: 30 };

function seat(row: string, number: number, free: boolean, x: number, y: number): Seat {
  return { row, number, free, x, y };
}

/** 중간 중앙 칸 한가운데 놓인 좌석. 구역이 아니라 이어짐만 보는 테스트에 쓴다. */
function middleCenter(row: string, number: number, free: boolean): Seat {
  return seat(row, number, free, 15, 15);
}

describe("regionOf", () => {
  it("좌표에 따라 아홉 칸 중 하나로 가린다", () => {
    expect(regionOf(seat("A", 1, true, 5, 5), hall)).toBe("front-left");
    expect(regionOf(seat("E", 1, true, 15, 15), hall)).toBe("middle-center");
    expect(regionOf(seat("I", 1, true, 25, 25), hall)).toBe("back-right");
  });

  it("범위가 없는 상영관은 가운데로 본다", () => {
    const flat: Hall = { xStart: 5, xEnd: 5, yStart: 5, yEnd: 5 };
    expect(regionOf(seat("A", 1, true, 5, 5), flat)).toBe("middle-center");
  });
});

describe("findRuns", () => {
  it("이어진 빈자리를 한 덩어리로 찾는다", () => {
    const runs = findRuns(
      [middleCenter("B", 5, true), middleCenter("B", 6, true), middleCenter("B", 7, true)],
      hall,
      ["middle-center"],
      2,
    );

    expect(runs).toHaveLength(1);
    expect(runs[0].numbers).toEqual([5, 6, 7]);
    expect(describeRun(runs[0])).toBe("B5–B7 (3석)");
  });

  it("번호가 끊기면 다른 덩어리로 나눈다", () => {
    const runs = findRuns(
      [
        middleCenter("B", 5, true),
        middleCenter("B", 6, true),
        middleCenter("B", 9, true),
        middleCenter("B", 10, true),
      ],
      hall,
      ["middle-center"],
      2,
    );

    expect(runs.map((run) => run.numbers)).toEqual([
      [5, 6],
      [9, 10],
    ]);
  });

  it("최소 연석 수에 못 미치는 덩어리는 버린다", () => {
    const runs = findRuns(
      [middleCenter("B", 5, true), middleCenter("B", 7, true)],
      hall,
      ["middle-center"],
      2,
    );

    expect(runs).toEqual([]);
  });

  it("팔린 자리는 이어지지 않은 것으로 본다", () => {
    const runs = findRuns(
      [middleCenter("B", 5, true), middleCenter("B", 6, false), middleCenter("B", 7, true)],
      hall,
      ["middle-center"],
      2,
    );

    expect(runs).toEqual([]);
  });

  it("고르지 않은 칸의 자리는 세지 않는다", () => {
    const runs = findRuns(
      [seat("A", 1, true, 5, 5), seat("A", 2, true, 6, 5)],
      hall,
      ["middle-center"],
      2,
    );

    expect(runs).toEqual([]);
  });

  it("여러 칸을 고르면 그중 어느 칸이든 찾는다", () => {
    const runs = findRuns(
      [seat("A", 1, true, 5, 5), seat("A", 2, true, 6, 5)],
      hall,
      ["front-left", "middle-center"],
      2,
    );

    expect(runs).toHaveLength(1);
    expect(runs[0].region).toBe("front-left");
  });

  it("다른 열의 자리는 이어지지 않는다", () => {
    const runs = findRuns(
      [middleCenter("B", 5, true), middleCenter("C", 6, true)],
      hall,
      ["middle-center"],
      2,
    );

    expect(runs).toEqual([]);
  });

  it("한 열이 구역 경계를 넘으면 고른 칸에 든 부분만 이어진 것으로 본다", () => {
    // x가 20을 넘으면 중앙이 아니라 우측 칸이다.
    const runs = findRuns(
      [
        seat("B", 5, true, 18, 15),
        seat("B", 6, true, 19, 15),
        seat("B", 7, true, 21, 15),
      ],
      hall,
      ["middle-center"],
      2,
    );

    expect(runs).toHaveLength(1);
    expect(runs[0].numbers).toEqual([5, 6]);
  });

  it("한 자리만 필요하면 홀로 있는 빈자리도 찾는다", () => {
    const runs = findRuns([middleCenter("B", 5, true)], hall, ["middle-center"], 1);

    expect(runs).toHaveLength(1);
    expect(describeRun(runs[0])).toBe("B5 (1석)");
  });
});

describe("runKey", () => {
  it("같은 덩어리는 같은 값을 준다", () => {
    const a = findRuns([middleCenter("B", 5, true), middleCenter("B", 6, true)], hall, ["middle-center"], 2);
    const b = findRuns([middleCenter("B", 6, true), middleCenter("B", 5, true)], hall, ["middle-center"], 2);

    expect(runKey(a[0])).toBe(runKey(b[0]));
  });

  it("자리가 늘어나면 다른 값이 된다", () => {
    const two = findRuns([middleCenter("B", 5, true), middleCenter("B", 6, true)], hall, ["middle-center"], 2);
    const three = findRuns(
      [middleCenter("B", 5, true), middleCenter("B", 6, true), middleCenter("B", 7, true)],
      hall,
      ["middle-center"],
      2,
    );

    expect(runKey(two[0])).not.toBe(runKey(three[0]));
  });
});
