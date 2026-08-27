import type { Region } from "../seat";

/** 사용자가 등록해 두고 감시하는 한 벌의 조건. */
export type WatchCondition = {
  id: string;
  siteNo: string;
  siteNm: string;
  movNo: string;
  movNm: string;
  /** YYYYMMDD */
  date: string;
  /** HHMM */
  fromTime: string;
  /** HHMM */
  toTime: string;
  regions: Region[];
  minimumSeats: number;
  /** 이동식(장애인·동반석) 좌석도 감시 대상에 넣을지. */
  includeMovable: boolean;
  active: boolean;
};

/** 조건마다 마지막 확인이 어떻게 끝났는지. */
export type WatchStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; checkedAt: number; scheduleCount: number }
  | { kind: "failed"; checkedAt: number; reason: "blocked" | "unavailable"; message: string };
