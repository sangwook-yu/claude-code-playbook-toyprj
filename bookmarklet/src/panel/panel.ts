/** CGV 화면 위에 얹히는 감시 패널. 상태를 받아 그리고, 사용자의 조작을 콜백으로 올린다. */
import { PANEL_CSS } from "./styles";
import type { ConditionDraft, Option, PanelCallbacks, PanelState } from "./view";

export const PANEL_ID = "imax-seat-watch-panel";
/** 최소 주기이자 클릭 한 번의 증감 단위. 내부 계산은 초 단위로 하고, 입력칸에는 분으로 보여준다. */
const MIN_INTERVAL_SECONDS = 30;
const MIN_INTERVAL_MINUTES = MIN_INTERVAL_SECONDS / 60;

function secondsToMinutes(seconds: number): string {
  return String(seconds / 60);
}

function minutesToSeconds(minutes: number): number {
  const rounded = Math.round(minutes / MIN_INTERVAL_MINUTES) * MIN_INTERVAL_MINUTES;
  return Math.max(MIN_INTERVAL_SECONDS, Math.round(rounded * 60));
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "20260829"를 "2026.08.29 (토)"로. 고를 때 요일이 보여야 알아보기 쉽다. */
export function describeDate(ymd: string): string {
  const year = ymd.slice(0, 4);
  const month = ymd.slice(4, 6);
  const day = ymd.slice(6, 8);
  const weekday = WEEKDAYS[new Date(`${year}-${month}-${day}T00:00:00`).getDay()] ?? "";
  return `${year}.${month}.${day} (${weekday})`;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  for (const child of children) node.append(child);
  return node;
}

export type Panel = {
  render: (state: PanelState) => void;
  destroy: () => void;
};

export function createPanel(callbacks: PanelCallbacks): Panel {
  const host = el("div", { id: PANEL_ID });
  const root = host.attachShadow({ mode: "open" });
  root.append(el("style", {}, [PANEL_CSS]));

  const shell = el("div", { class: "shell" });
  root.append(shell);
  document.body.append(host);

  // 머리말: 감시 상태와 접기.
  const dot = el("span", { class: "dot" });
  const head = el("div", { class: "head" }, [
    dot,
    el("h1", {}, ["CGV 좌석 감시"]),
    (() => {
      const button = el("button", { class: "iconbtn", title: "접기" }, ["–"]);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        shell.classList.toggle("folded");
        button.textContent = shell.classList.contains("folded") ? "+" : "–";
        button.title = shell.classList.contains("folded") ? "펼치기" : "접기";
      });
      return button;
    })(),
    (() => {
      const button = el("button", { class: "iconbtn", title: "감시 끄기" }, ["×"]);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        callbacks.onClose();
      });
      return button;
    })(),
  ]);
  shell.append(head);

  const body = el("div", { class: "body" });
  shell.append(body);

  // 감시 상태 줄. "지금 확인"과 OS 알림 조작은 감시 조건을 보면서 누를 수 있도록
  // 이 줄이 아니라 감시 조건 제목 옆에 둔다(drawConditions 참고).
  const watchingText = el("span", { class: "grow" });
  const watchingRow = el("div", { class: "watching" }, [watchingText]);
  body.append(watchingRow);

  const notifyButton = el("button", { class: "notifybtn" }, ["OS 알람"]);
  notifyButton.addEventListener("click", () => callbacks.onToggleNotify());

  const intervalInput = el("input", {
    type: "number",
    min: String(MIN_INTERVAL_MINUTES),
    step: String(MIN_INTERVAL_MINUTES),
  });
  const intervalBox = el(
    "span",
    { class: "intervalbox", title: "짧을수록 CGV가 자동 접근으로 판단해 막을 위험이 커집니다." },
    [intervalInput, "분마다"],
  );
  intervalInput.addEventListener("change", () => {
    const rawMinutes = Number(intervalInput.value) || MIN_INTERVAL_MINUTES;
    const seconds = minutesToSeconds(rawMinutes);
    intervalInput.value = secondsToMinutes(seconds);
    callbacks.onSetInterval(seconds);
  });

  const checkButton = el("button", { class: "small" }, ["지금 확인"]);
  checkButton.addEventListener("click", () => callbacks.onCheckNow());

  const errorBox = el("div", { class: "error" });
  body.append(errorBox);

  // 조건 등록.
  const movieSelect = el("select", { id: "movie" });
  movieSelect.addEventListener("change", () => callbacks.onSelectMovie(movieSelect.value));
  const siteSelect = el("select", { id: "site" });
  siteSelect.addEventListener("change", () => callbacks.onSelectSite(siteSelect.value));
  // 예매할 수 없는 날짜를 감시해 봐야 소용없으므로, 직접 입력이 아니라 목록에서 고른다.
  const dateSelect = el("select", { id: "date" });
  dateSelect.addEventListener("change", () => callbacks.onSelectDate(dateSelect.value));
  const screenSelect = el("select", { id: "screen" });
  const fromInput = el("input", { id: "from", type: "time" });
  fromInput.value = "00:00";
  const toInput = el("input", { id: "to", type: "time" });
  toInput.value = "23:59";
  const seatsInput = el("input", { id: "seats", type: "number", min: "1", max: "8" });
  seatsInput.value = "2";
  const regionBox = el("div", { class: "regions" });
  const movableInput = el("input", { id: "movable", type: "checkbox" });
  const addButton = el("button", { class: "action" }, ["조건 추가"]);

  addButton.addEventListener("click", () => {
    const regionIds = [...regionBox.querySelectorAll<HTMLInputElement>("input:checked")].map(
      (input) => input.value,
    );
    const draft: ConditionDraft = {
      movieId: movieSelect.value,
      siteId: siteSelect.value,
      date: dateSelect.value,
      screenKindCode: screenSelect.value,
      fromTime: fromInput.value,
      toTime: toInput.value,
      regionIds,
      minimumSeats: Math.max(1, Number(seatsInput.value) || 1),
      includeMovable: movableInput.checked,
    };
    callbacks.onAdd(draft);
  });

  body.append(
    el("fieldset", {}, [
      el("legend", {}, ["감시 조건 등록"]),
      el("label", { for: "movie" }, ["영화"]),
      movieSelect,
      el("label", { for: "site" }, ["지점"]),
      siteSelect,
      el("label", { for: "date" }, ["날짜"]),
      dateSelect,
      el("label", { for: "screen" }, ["상영관"]),
      screenSelect,
      el("div", { class: "two" }, [
        el("div", {}, [el("label", { for: "from" }, ["시작"]), fromInput]),
        el("div", {}, [el("label", { for: "to" }, ["끝"]), toInput]),
      ]),
      el("label", {}, ["좌석 구역 (여러 개 고를 수 있습니다)"]),
      regionBox,
      el("label", { for: "seats" }, ["최소 연석 수"]),
      seatsInput,
      el("label", { class: "checkrow", for: "movable" }, [
        movableInput,
        "이동식(장애인·동반석) 좌석도 포함",
      ]),
      addButton,
    ]),
  );

  // 헤더는 한 번만 만들어 붙인다. 조건 확인마다 자주 다시 그려지는 목록과 분리해 둬야
  // "OS 알람"·확인 주기 같은 조작 요소가 매번 떨어졌다 붙지 않는다(입력 중 포커스가 끊기지 않게).
  const conditionCountText = el("span", { class: "grow" });
  const conditionList = el("div");
  const conditionSection = el("div", {}, [
    el("h2", {}, [conditionCountText, notifyButton, intervalBox, checkButton]),
    conditionList,
  ]);
  const alarmSection = el("div");
  body.append(conditionSection, alarmSection);

  let regionsDrawn = false;

  function drawRegions(state: PanelState) {
    if (regionsDrawn) return;
    regionsDrawn = true;
    for (const region of state.regions) {
      const input = el("input", { type: "checkbox", value: region.id });
      input.checked = region.checked;
      regionBox.append(el("label", {}, [input, region.label]));
    }
  }

  function drawConditions(state: PanelState) {
    conditionCountText.textContent = `감시 조건 ${state.conditions.length}개`;
    conditionList.replaceChildren();

    if (state.conditions.length === 0) {
      conditionList.append(el("div", { class: "empty" }, ["등록한 조건이 없습니다."]));
      return;
    }

    const list = el("ul");
    for (const condition of state.conditions) {
      const toggle = el("button", { class: "small" }, [condition.active ? "끄기" : "켜기"]);
      toggle.addEventListener("click", () => callbacks.onToggle(condition.id));
      const remove = el("button", { class: "small" }, ["삭제"]);
      remove.addEventListener("click", () => callbacks.onRemove(condition.id));

      list.append(
        el("li", { class: "card", "data-testid": "condition" }, [
          el("div", { class: "title" }, [condition.title]),
          el("div", { class: "detail" }, [condition.detail]),
          el("div", { class: `status ${condition.statusTone === "bad" ? "bad" : ""}` }, [
            condition.status,
          ]),
          el("div", { class: "row" }, [
            el(
              "span",
              { class: `badge ${condition.active ? "on" : ""}`, "data-testid": "condition-state" },
              [condition.active ? "감시 중" : "꺼짐"],
            ),
            el("span", { class: "grow" }),
            toggle,
            remove,
          ]),
        ]),
      );
    }
    conditionList.append(list);
  }

  function drawAlarms(state: PanelState) {
    alarmSection.replaceChildren();

    const clear = el("button", { class: "small" }, ["모두 지우기"]);
    clear.addEventListener("click", () => callbacks.onClearAlarms());
    alarmSection.append(
      el("h2", {}, [
        el("span", { class: "grow" }, [`알람 ${state.alarms.length}건`]),
        ...(state.alarms.length > 0 ? [clear] : []),
      ]),
    );

    if (state.alarms.length === 0) {
      alarmSection.append(
        el("div", { class: "empty" }, ["아직 알람이 없습니다. 자리가 나면 여기에 쌓입니다."]),
      );
      return;
    }

    const list = el("ul");
    for (const alarm of state.alarms) {
      const open = el(
        "button",
        { class: "small", title: "지점 이름을 클립보드에 복사하고 CGV 예매 화면을 엽니다." },
        ["상영관 이름 복사하고 CGV 열기"],
      );
      open.addEventListener("click", () => callbacks.onOpenAlarm(alarm.id));

      list.append(
        el("li", { class: "card alarm", "data-testid": "alarm" }, [
          el("div", { class: "title" }, [alarm.title]),
          el("div", { class: "detail" }, [alarm.detail]),
          el("div", { class: "detail" }, [alarm.time]),
          el("div", { class: "row" }, [el("span", { class: "grow" }), open]),
        ]),
      );
    }
    alarmSection.append(list);
  }

  /**
   * 영화·지점·날짜·상영관은 모두 같은 모양의 단계다. 앞 단계가 정해져야 목록이 채워지고,
   * 불러오는 동안과 결과가 없을 때 할 말이 있다. 그 차이만 여기에 적는다.
   *
   * `selected`가 있으면 그 값이 곧 화면의 값이다(조합 계층이 들고 있는 단계).
   * 없으면 사용자가 고른 값을 그대로 둔다(상영관처럼 다음 단계를 부르지 않는 마지막 단계).
   */
  type Step = {
    options: Option[];
    /** 앞 단계를 아직 안 골랐다면 그 안내. 골랐으면 빈 문자열. */
    waiting: string;
    loading: boolean;
    empty: string;
    selected: string | null;
  };

  function stepOf(state: PanelState, which: "movies" | "sites" | "dates" | "screens"): Step {
    if (which === "movies") {
      return {
        options: state.movies,
        waiting: "",
        loading: false,
        empty: "상영 중인 영화가 없습니다",
        selected: state.selectedMovieId,
      };
    }
    if (which === "sites") {
      return {
        options: state.sites,
        waiting: state.selectedMovieId ? "" : "영화를 먼저 고르세요",
        loading: state.sitesLoading,
        empty: "상영 지점이 없습니다",
        selected: state.selectedSiteId,
      };
    }
    if (which === "dates") {
      return {
        options: state.dates,
        waiting: state.selectedSiteId ? "" : "지점을 먼저 고르세요",
        loading: state.datesLoading,
        empty: "예매 가능한 상영일이 없습니다",
        selected: state.selectedDate,
      };
    }
    return {
      options: state.screenKinds,
      waiting: state.selectedDate ? "" : "날짜를 먼저 고르세요",
      loading: state.screenKindsLoading,
      empty: "그날 상영하는 상영관이 없습니다",
      selected: null,
    };
  }

  function fillOptions(
    select: HTMLSelectElement,
    state: PanelState,
    which: "movies" | "sites" | "dates" | "screens",
  ) {
    const step = stepOf(state, which);
    const keep = select.value;

    const placeholder = step.waiting
      ? step.waiting
      : step.loading
        ? "불러오는 중"
        : step.options.length === 0
          ? step.empty
          : "선택하세요";

    select.replaceChildren(el("option", { value: "" }, [placeholder]));
    for (const option of step.options) {
      select.append(el("option", { value: option.id }, [option.label]));
    }

    if (step.selected !== null) {
      select.value = step.selected;
    } else {
      if (step.options.some((option) => option.id === keep)) select.value = keep;
      // 고를 것이 하나뿐이면 고민할 것도 없으니 미리 골라 둔다.
      if (!select.value && step.options.length === 1) select.value = step.options[0].id;
    }

    select.disabled = step.options.length === 0;
  }

  function render(state: PanelState) {
    drawRegions(state);

    watchingText.textContent = state.watching;
    dot.className = `dot ${state.watchingActive ? "" : "off"}`;

    notifyButton.style.display = state.permission === "unsupported" ? "none" : "";
    notifyButton.classList.toggle("on", state.permission === "granted" && state.osNotifyOn);
    notifyButton.disabled = state.permission === "denied";
    notifyButton.title =
      state.permission === "denied"
        ? "브라우저가 알림을 막았습니다. 브라우저의 사이트 설정에서 직접 허용해야 합니다."
        : state.permission === "granted"
          ? state.osNotifyOn
            ? "누르면 OS 알림을 끕니다"
            : "누르면 OS 알림을 켭니다"
          : "누르면 OS 알림 권한을 요청합니다";

    // 입력 중에 값을 되돌려 타이핑을 끊지 않는다.
    // shadow DOM 안의 포커스는 document.activeElement가 아니라 root.activeElement로 봐야 한다.
    if (root.activeElement !== intervalInput) {
      intervalInput.value = secondsToMinutes(state.intervalSeconds);
    }

    errorBox.style.display = state.error ? "" : "none";
    errorBox.textContent = state.error ?? "";

    fillOptions(movieSelect, state, "movies");
    fillOptions(siteSelect, state, "sites");
    fillOptions(dateSelect, state, "dates");
    fillOptions(screenSelect, state, "screens");

    drawConditions(state);
    drawAlarms(state);
  }

  function destroy() {
    host.remove();
  }

  return { render, destroy };
}
