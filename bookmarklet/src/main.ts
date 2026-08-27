/**
 * 북마클릿의 조합 계층. 아래 모듈들을 엮어 하나의 감시 도구로 만든다.
 * 각 모듈은 서로를 모르며, 엮는 일은 여기서만 한다.
 */
import {
  currentPermission,
  requestPermission,
  sendOsNotification,
  type Alarm,
  type NotifyPermission,
} from "./alarm";
import {
  fetchImaxMovies,
  fetchImaxSites,
  fetchSchedules,
  fetchSeatMap,
  type Movie,
  type Schedule,
  type Site,
} from "./cgv";
import { pickFresh, remember } from "./monitor";
import { createPanel, PANEL_ID } from "./panel";
import type { ConditionDraft, PanelState, RegionChoice } from "./panel";
import { describeRun, findRuns, REGION_LABELS, REGIONS, runKey, type Region } from "./seat";
import { loadConditions, saveConditions, type WatchCondition, type WatchStatus } from "./watch";

const BOOKING_URL = "https://cgv.co.kr/cnm/movieBook/movie";
/** 실제 CGV를 보는 만큼 넉넉한 간격을 기본값으로 둔다. 사용자가 줄일 수 있다. */
const DEFAULT_INTERVAL_SECONDS = 60;
/** 한 조건 안에서 회차를 이어 조회할 때 두는 간격. */
const BETWEEN_SCHEDULES_MS = 400;
const MAX_ALARMS = 30;

function hhmm(value: string): string {
  return `${value.slice(0, 2)}:${value.slice(2)}`;
}

function ymd(value: string): string {
  return `${value.slice(0, 4)}.${value.slice(4, 6)}.${value.slice(6)}`;
}

function clockOf(at: number): string {
  return new Date(at).toLocaleTimeString("ko-KR");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function start(): void {
  if (!location.hostname.endsWith("cgv.co.kr")) {
    window.alert("아이맥스 좌석 감시는 CGV 페이지(cgv.co.kr)에서만 쓸 수 있습니다.");
    return;
  }
  if (document.getElementById(PANEL_ID)) {
    window.alert("이미 감시 패널이 열려 있습니다.");
    return;
  }

  let conditions = loadConditions();
  let alarms: Alarm[] = [];
  let movies: Movie[] = [];
  let sites: Site[] = [];
  let selectedMovieId = "";
  let sitesLoading = false;
  let error: string | null = null;
  let permission: NotifyPermission = currentPermission();
  // 권한이 이미 허용된 채로 시작했다면(전에 켜둔 적이 있다면) 기본은 켠 상태다.
  let osNotifyEnabled = true;
  let intervalSeconds = DEFAULT_INTERVAL_SECONDS;
  let timer = 0;
  const statuses = new Map<string, WatchStatus>();
  /** 조건마다 지난번에 본 자리 덩어리. */
  const seen = new Map<string, Set<string>>();
  let running = false;

  function statusLine(condition: WatchCondition): { text: string; tone: "quiet" | "bad" } {
    const status = statuses.get(condition.id);
    if (!status || status.kind === "idle") return { text: "아직 확인하지 않았습니다.", tone: "quiet" };
    if (status.kind === "checking") return { text: "확인 중…", tone: "quiet" };
    if (status.kind === "failed") {
      const head = status.reason === "blocked" ? "조회가 차단되었습니다" : "조회에 실패했습니다";
      return { text: `${clockOf(status.checkedAt)} · ${head} — ${status.message}`, tone: "bad" };
    }
    return {
      text: `${clockOf(status.checkedAt)} · 회차 ${status.scheduleCount}개 확인`,
      tone: "quiet",
    };
  }

  function regionChoices(): RegionChoice[] {
    return REGIONS.map((region) => ({
      id: region,
      label: REGION_LABELS[region],
      checked: region === "middle-center",
    }));
  }

  function toState(): PanelState {
    const active = conditions.filter((condition) => condition.active).length;
    return {
      movies: movies.map((movie) => ({ id: movie.movNo, label: movie.movNm })),
      sites: sites.map((site) => ({
        id: site.siteNo,
        label: `${site.siteNm} (${site.regionNm})`,
      })),
      selectedMovieId,
      sitesLoading,
      regions: regionChoices(),
      error,
      conditions: conditions.map((condition) => {
        const line = statusLine(condition);
        const regionNames = condition.regions.map((region) => REGION_LABELS[region]).join(", ");
        const movableNote = condition.includeMovable ? " · 이동식 포함" : "";
        return {
          id: condition.id,
          title: `${condition.movNm} · ${condition.siteNm}`,
          detail: `${ymd(condition.date)} ${hhmm(condition.fromTime)}–${hhmm(condition.toTime)} · ${regionNames} · ${condition.minimumSeats}석 이상${movableNote}`,
          status: line.text,
          statusTone: line.tone,
          active: condition.active,
        };
      }),
      alarms: alarms.map((alarm) => ({
        id: alarm.id,
        title: `자리가 났습니다 — ${alarm.movNm}`,
        detail: `${alarm.siteNm} ${alarm.screenNm} ${ymd(alarm.date)} ${hhmm(alarm.startTime)} · ${alarm.seats.join(", ")}`,
        time: clockOf(alarm.raisedAt),
      })),
      watching: active > 0 ? `감시 중 · 조건 ${active}개` : "감시 중인 조건이 없습니다",
      watchingActive: active > 0,
      permission,
      osNotifyOn: osNotifyEnabled,
      intervalSeconds,
    };
  }

  const panel = createPanel({
    onSelectMovie(movieId) {
      selectedMovieId = movieId;
      sites = [];
      void loadSites();
      draw();
    },
    onAdd(draft) {
      const added = buildCondition(draft);
      if (!added) {
        // 검증 실패 사유(error)를 화면에 실제로 보여줘야 한다.
        draw();
        return;
      }
      conditions = [...conditions, added];
      saveConditions(conditions);
      draw();
      void checkOnce();
    },
    onToggle(id) {
      conditions = conditions.map((condition) =>
        condition.id === id ? { ...condition, active: !condition.active } : condition,
      );
      saveConditions(conditions);
      draw();
    },
    onRemove(id) {
      conditions = conditions.filter((condition) => condition.id !== id);
      statuses.delete(id);
      seen.delete(id);
      saveConditions(conditions);
      draw();
    },
    onOpenAlarm() {
      window.open(BOOKING_URL, "_blank", "noopener,noreferrer");
    },
    onClearAlarms() {
      alarms = [];
      draw();
    },
    onToggleNotify() {
      if (permission === "granted") {
        // 브라우저 권한은 코드로 되돌릴 수 없다. 실제로 보낼지만 앱 안에서 끈다.
        osNotifyEnabled = !osNotifyEnabled;
        draw();
        return;
      }
      if (permission !== "default") return;
      void requestPermission().then((next) => {
        permission = next;
        if (next === "granted") osNotifyEnabled = true;
        draw();
      });
    },
    onCheckNow() {
      void checkOnce();
    },
    onSetInterval(seconds) {
      intervalSeconds = seconds;
      restartTimer();
      draw();
    },
    onClose() {
      window.clearInterval(timer);
      panel.destroy();
    },
  });

  function draw() {
    panel.render(toState());
  }

  function buildCondition(draft: ConditionDraft): WatchCondition | null {
    const movie = movies.find((item) => item.movNo === draft.movieId);
    const site = sites.find((item) => item.siteNo === draft.siteId);
    if (!movie || !site) {
      error = "영화와 지점을 모두 골라 주세요.";
      return null;
    }
    if (draft.regionIds.length === 0) {
      error = "좌석 구역을 하나 이상 골라 주세요.";
      return null;
    }
    error = null;

    return {
      id: crypto.randomUUID(),
      siteNo: site.siteNo,
      siteNm: site.siteNm,
      movNo: movie.movNo,
      movNm: movie.movNm,
      date: draft.date.replaceAll("-", ""),
      fromTime: draft.fromTime.replace(":", ""),
      toTime: draft.toTime.replace(":", ""),
      regions: draft.regionIds as Region[],
      minimumSeats: draft.minimumSeats,
      includeMovable: draft.includeMovable,
      active: true,
    };
  }

  async function loadMovies() {
    const result = await fetchImaxMovies();
    if (result.ok) {
      movies = result.data;
      error = null;
    } else {
      movies = [];
      error = result.message;
    }
    draw();
  }

  async function loadSites() {
    // 응답이 오기 전에 사용자가 다른 영화로 바꾸면, 늦게 도착한 이 응답은 버려야 한다.
    const requestedFor = selectedMovieId;
    if (!requestedFor) return;
    sitesLoading = true;
    draw();

    const result = await fetchImaxSites(requestedFor);
    if (selectedMovieId !== requestedFor) return;

    sitesLoading = false;
    if (result.ok) {
      sites = result.data;
      error = null;
    } else {
      sites = [];
      error = result.message;
    }
    draw();
  }

  /** 한 조건을 한 번 확인한다. 조건에 맞는 자리가 새로 나타났으면 알람을 낸다. */
  async function checkCondition(condition: WatchCondition) {
    statuses.set(condition.id, { kind: "checking" });
    draw();

    const scheduleResult = await fetchSchedules(condition.siteNo, condition.movNo, condition.date);
    const checkedAt = Date.now();

    if (!scheduleResult.ok) {
      statuses.set(condition.id, {
        kind: "failed",
        checkedAt,
        reason: scheduleResult.reason,
        message: scheduleResult.message,
      });
      draw();
      return;
    }

    const inWindow = scheduleResult.data.filter(
      (schedule) =>
        schedule.startTime >= condition.fromTime && schedule.startTime <= condition.toTime,
    );

    type Hit = { schedule: Schedule; key: string; text: string };
    const hits: Hit[] = [];
    let checkedCount = 0;
    let failure: { reason: "blocked" | "unavailable"; message: string } | null = null;

    for (const schedule of inWindow) {
      // 빈자리가 없으면 좌석 배치를 볼 것도 없다. 조회를 아낀다.
      if (schedule.freeSeats <= 0) {
        checkedCount += 1;
        continue;
      }

      const seatResult = await fetchSeatMap(
        condition.siteNo,
        condition.date,
        schedule.scnsNo,
        schedule.scnSseq,
      );
      if (!seatResult.ok) {
        // 이 회차부터는 확인하지 못했다. 그렇다고 이미 찾은 자리까지 버리지는 않는다.
        failure = { reason: seatResult.reason, message: seatResult.message };
        break;
      }
      checkedCount += 1;

      const runs = findRuns(
        seatResult.data.seats,
        seatResult.data.hall,
        condition.regions,
        condition.minimumSeats,
        // 이 필드가 생기기 전에 저장된 조건은 기본값(이동식 제외)으로 다룬다.
        condition.includeMovable ?? false,
      );
      for (const run of runs) {
        hits.push({
          schedule,
          key: `${schedule.id}:${runKey(run)}`,
          text: describeRun(run),
        });
      }

      if (schedule !== inWindow[inWindow.length - 1]) await sleep(BETWEEN_SCHEDULES_MS);
    }

    // 확인한 회차만 "본 것"으로 기억한다. 실패로 확인하지 못한 회차는 다음 주기에 새로 본다.
    const fresh = pickFresh(seen.get(condition.id) ?? new Set(), hits, (hit) => hit.key);
    seen.set(condition.id, remember(hits, (hit) => hit.key));

    statuses.set(
      condition.id,
      failure
        ? { kind: "failed", checkedAt: Date.now(), ...failure }
        : { kind: "ok", checkedAt: Date.now(), scheduleCount: checkedCount },
    );

    // 같은 회차의 여러 덩어리는 한 건으로 묶어 알린다.
    const bySchedule = new Map<string, Hit[]>();
    for (const hit of fresh) {
      const bucket = bySchedule.get(hit.schedule.id);
      if (bucket) bucket.push(hit);
      else bySchedule.set(hit.schedule.id, [hit]);
    }

    const raised: Alarm[] = [];
    for (const [, group] of bySchedule) {
      const schedule = group[0].schedule;
      raised.push({
        id: `${condition.id}:${schedule.id}:${Date.now()}`,
        conditionId: condition.id,
        siteNm: condition.siteNm,
        movNm: condition.movNm,
        screenNm: schedule.screenNm,
        date: condition.date,
        startTime: schedule.startTime,
        seats: group.map((hit) => hit.text),
        raisedAt: Date.now(),
      });
    }

    if (raised.length > 0) {
      alarms = [...raised, ...alarms].slice(0, MAX_ALARMS);
      if (osNotifyEnabled) for (const alarm of raised) sendOsNotification(alarm);
    }

    draw();
  }

  async function checkOnce() {
    if (running) return;
    running = true;
    try {
      for (const condition of conditions.filter((item) => item.active)) {
        await checkCondition(condition);
      }
    } finally {
      running = false;
    }
  }

  function restartTimer() {
    window.clearInterval(timer);
    timer = window.setInterval(() => void checkOnce(), intervalSeconds * 1000);
  }

  restartTimer();

  draw();
  void loadMovies();
  void checkOnce();
}
