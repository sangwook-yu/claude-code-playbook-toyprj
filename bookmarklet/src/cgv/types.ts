import type { Hall, Seat } from "../seat";

export type Site = { siteNo: string; siteNm: string; regionNm: string };
export type Movie = { movNo: string; movNm: string };

/** 한 회차. 좌석 조회에 필요한 값을 함께 들고 다닌다. */
export type Schedule = {
  id: string;
  screenNm: string;
  /** HHMM */
  startTime: string;
  /** HHMM */
  endTime: string;
  freeSeats: number;
  totalSeats: number;
  scnsNo: string;
  scnSseq: string;
};

/** 한 회차의 좌석 배치. */
export type SeatMap = { hall: Hall; seats: Seat[] };

export type Failure = {
  /** blocked: CGV가 자동 접근으로 판단해 거부함. unavailable: 그 밖의 실패. */
  reason: "blocked" | "unavailable";
  message: string;
};

export type Fetched<T> = { ok: true; data: T } | ({ ok: false } & Failure);
