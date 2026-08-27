/** 한 좌석. CGV 응답에서 판별에 필요한 것만 추린 모양이다. */
export type Seat = {
  /** 열 이름. A, B, C 같은 값. */
  row: string;
  /** 열 안에서의 번호. */
  number: number;
  /** 살 수 있는 자리인지. */
  free: boolean;
  x: number;
  y: number;
};

/** 상영관 전체가 차지하는 좌표 범위. 구역을 나누는 기준이 된다. */
export type Hall = {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
};

/** 앞뒤 위치. */
export type Depth = "front" | "middle" | "back";
/** 좌우 위치. */
export type Side = "left" | "center" | "right";

/** 상영관을 가로·세로로 3등분해 나눈 아홉 칸 중 하나. */
export type Region = `${Depth}-${Side}`;

export const REGIONS: Region[] = [
  "front-left",
  "front-center",
  "front-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "back-left",
  "back-center",
  "back-right",
];

export const REGION_LABELS: Record<Region, string> = {
  "front-left": "앞 좌측",
  "front-center": "앞 중앙",
  "front-right": "앞 우측",
  "middle-left": "중간 좌측",
  "middle-center": "중간 중앙",
  "middle-right": "중간 우측",
  "back-left": "뒤 좌측",
  "back-center": "뒤 중앙",
  "back-right": "뒤 우측",
};
