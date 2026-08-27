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
  selectedMovieId: string;
  sitesLoading: boolean;
  regions: RegionChoice[];
  error: string | null;
  conditions: ConditionView[];
  alarms: AlarmView[];
  /** 감시 중임을 알리는 한 줄. */
  watching: string;
  /** 활성 조건이 하나 이상 있어 실제로 감시가 도는지. 상태 점 색을 여기서 정한다. */
  watchingActive: boolean;
  permission: "unsupported" | "default" | "granted" | "denied";
};

export type ConditionDraft = {
  movieId: string;
  siteId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  fromTime: string;
  /** HH:MM */
  toTime: string;
  regionIds: string[];
  minimumSeats: number;
};

export type PanelCallbacks = {
  onSelectMovie: (movieId: string) => void;
  onAdd: (draft: ConditionDraft) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenAlarm: (id: string) => void;
  onClearAlarms: () => void;
  onAskPermission: () => void;
  onCheckNow: () => void;
  onClose: () => void;
};
