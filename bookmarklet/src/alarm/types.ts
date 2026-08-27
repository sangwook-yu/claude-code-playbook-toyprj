/** 조건에 맞는 자리가 났음을 알리는 한 건의 알람. */
export type Alarm = {
  id: string;
  conditionId: string;
  siteNm: string;
  movNm: string;
  screenNm: string;
  /** YYYYMMDD */
  date: string;
  /** HHMM */
  startTime: string;
  /** 사람이 읽는 자리 설명. 예: "B5–B7 (3석)". */
  seats: string[];
  raisedAt: number;
};
