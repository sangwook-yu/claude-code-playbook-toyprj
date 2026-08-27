/**
 * 패널이 그리는 것들의 모양. 무엇을 감시하는지, 알람이 어디서 오는지는 알지 않는다.
 * 조합 계층이 도메인 값을 이 모양으로 바꿔 넘긴다.
 */

export type Option = { id: string; label: string };

export type RegionChoice = { id: string; label: string; checked: boolean };

export type ConditionView = {
  id: string;
  /** 첫 줄. 예: "오디세이 · 용산아이파크몰". */
  title: string;
  /** 둘째 줄. 예: "2026.08.29 09:00–21:59 · 중간 중앙 · 2석 이상". */
  detail: string;
  /** 셋째 줄. 마지막 확인 결과. */
  status: string;
  statusTone: "quiet" | "bad";
  active: boolean;
};

export type AlarmView = {
  id: string;
  title: string;
  detail: string;
  time: string;
};

export type PanelState = {
  movies: Option[];
  sites: Option[];
  /** 그 지점에서 그 영화의 상영이 실제로 있는 날짜만. id는 YYYYMMDD다. */
  dates: Option[];
  /** 그 날짜에 실제로 있는 상영관 종류만. id는 tcscnsGradCd다. */
  screenKinds: Option[];
  selectedMovieId: string;
  selectedSiteId: string;
  selectedDate: string;
  sitesLoading: boolean;
  datesLoading: boolean;
  screenKindsLoading: boolean;
  regions: RegionChoice[];
  error: string | null;
  conditions: ConditionView[];
  alarms: AlarmView[];
  /** 감시 중임을 알리는 한 줄. */
  watching: string;
  /** 활성 조건이 하나 이상 있어 실제로 감시가 도는지. 상태 점 색을 여기서 정한다. */
  watchingActive: boolean;
  /** 브라우저 알림 권한. 한 번 허용되면 코드로는 다시 거부 상태로 되돌릴 수 없다. */
  permission: "unsupported" | "default" | "granted" | "denied";
  /** 권한이 허용된 상태에서, 지금 실제로 OS 알림을 보낼지. 앱이 자체적으로 켜고 끈다. */
  osNotifyOn: boolean;
  /** 확인 주기(초). 최소이자 증감 단위가 30초(0.5분)다. */
  intervalSeconds: number;
};

export type ConditionDraft = {
  movieId: string;
  siteId: string;
  /** YYYYMMDD. 고를 수 있는 날짜 목록에서 온 값이다. */
  date: string;
  /** 상영관 종류 코드. 고를 수 있는 상영관 목록에서 온 값이다. */
  screenKindCode: string;
  /** HH:MM */
  fromTime: string;
  /** HH:MM */
  toTime: string;
  regionIds: string[];
  minimumSeats: number;
  includeMovable: boolean;
};

export type PanelCallbacks = {
  onSelectMovie: (movieId: string) => void;
  /** 지점이 정해져야 그 지점의 상영 날짜를 가져올 수 있다. */
  onSelectSite: (siteId: string) => void;
  /** 날짜가 정해져야 그날 어떤 상영관이 있는지 알 수 있다. */
  onSelectDate: (date: string) => void;
  onAdd: (draft: ConditionDraft) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenAlarm: (id: string) => void;
  onClearAlarms: () => void;
  /** 권한이 default면 요청하고, granted면 osNotifyOn을 뒤집는다. */
  onToggleNotify: () => void;
  onSetInterval: (seconds: number) => void;
  onCheckNow: () => void;
  onClose: () => void;
};
