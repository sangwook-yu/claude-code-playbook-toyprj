import type { Hall, Seat } from "../seat";

export type Site = { siteNo: string; siteNm: string; regionNm: string };
export type Movie = { movNo: string; movNm: string };

/**
 * 상영관 종류. 일반관과 IMAX·4DX 같은 특별관을 가른다.
 * 코드는 CGV 회차 응답의 `tcscnsGradCd`이며, 특별관 필터의 `attrCd`와는
 * 값 체계가 다르다(같은 "04"가 한쪽은 SCREENX, 다른 쪽은 IMAX다).
 */
export type ScreenKind = { code: string; name: string };

/** 한 회차. 좌석 조회에 필요한 값을 함께 들고 다닌다. */
export type Schedule = {
  id: string;
  screenNm: string;
  /** 상영관 종류 코드(`tcscnsGradCd`). */
  screenKindCode: string;
  /** 상영관 종류 이름(`tcscnsGradNm`). 예: "일반", "아이맥스", "4DX". */
  screenKindName: string;
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
