/** CGV 화면 위에 얹히는 감시 패널. 상태를 받아 그리고, 사용자의 조작을 콜백으로 올린다. */
import { PANEL_CSS } from "./styles";
import type { ConditionDraft, PanelCallbacks, PanelState } from "./view";

export const PANEL_ID = "imax-seat-watch-panel";

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
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
    el("h1", {}, ["아이맥스 좌석 감시"]),
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

  // 감시 상태 줄.
  const watchingText = el("span", { class: "grow" });
  const permissionButton = el("button", { class: "small" }, ["OS 알림 허용"]);
  permissionButton.addEventListener("click", () => callbacks.onAskPermission());
  const permissionText = el("span", { class: "badge" });
  const checkButton = el("button", { class: "small" }, ["지금 확인"]);
  checkButton.addEventListener("click", () => callbacks.onCheckNow());
  const watchingRow = el("div", { class: "watching" }, [
    watchingText,
    permissionButton,
    permissionText,
    checkButton,
  ]);
  body.append(watchingRow);

  const errorBox = el("div", { class: "error" });
  body.append(errorBox);

  // 조건 등록.
  const movieSelect = el("select", { id: "movie" });
  movieSelect.addEventListener("change", () => callbacks.onSelectMovie(movieSelect.value));
  const siteSelect = el("select", { id: "site" });
  const dateInput = el("input", { id: "date", type: "date" });
  dateInput.value = today();
  const fromInput = el("input", { id: "from", type: "time" });
  fromInput.value = "00:00";
  const toInput = el("input", { id: "to", type: "time" });
  toInput.value = "23:59";
  const seatsInput = el("input", { id: "seats", type: "number", min: "1", max: "8" });
  seatsInput.value = "2";
  const regionBox = el("div", { class: "regions" });
  const addButton = el("button", { class: "action" }, ["조건 추가"]);

  addButton.addEventListener("click", () => {
    const regionIds = [...regionBox.querySelectorAll<HTMLInputElement>("input:checked")].map(
      (input) => input.value,
    );
    const draft: ConditionDraft = {
      movieId: movieSelect.value,
      siteId: siteSelect.value,
      date: dateInput.value,
      fromTime: fromInput.value,
      toTime: toInput.value,
      regionIds,
      minimumSeats: Math.max(1, Number(seatsInput.value) || 1),
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
      dateInput,
      el("div", { class: "two" }, [
        el("div", {}, [el("label", { for: "from" }, ["시작"]), fromInput]),
        el("div", {}, [el("label", { for: "to" }, ["끝"]), toInput]),
      ]),
      el("label", {}, ["좌석 구역 (여러 개 고를 수 있습니다)"]),
      regionBox,
      el("label", { for: "seats" }, ["최소 연석 수"]),
      seatsInput,
      addButton,
    ]),
  );

  const conditionSection = el("div");
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
    conditionSection.replaceChildren();
    conditionSection.append(
      el("h2", {}, [el("span", { class: "grow" }, [`감시 조건 ${state.conditions.length}개`])]),
    );

    if (state.conditions.length === 0) {
      conditionSection.append(el("div", { class: "empty" }, ["등록한 조건이 없습니다."]));
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
    conditionSection.append(list);
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
      const open = el("button", { class: "small" }, ["CGV 예매 화면 열기"]);
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

  function fillOptions(select: HTMLSelectElement, state: PanelState, which: "movies" | "sites") {
    const options = which === "movies" ? state.movies : state.sites;
    const keep = select.value;

    const placeholder =
      which === "movies"
        ? options.length === 0
          ? "상영 중인 IMAX 영화가 없습니다"
          : "선택하세요"
        : !state.selectedMovieId
          ? "영화를 먼저 고르세요"
          : state.sitesLoading
            ? "불러오는 중"
            : options.length === 0
              ? "IMAX 상영 지점이 없습니다"
              : "선택하세요";

    select.replaceChildren(el("option", { value: "" }, [placeholder]));
    for (const option of options) {
      select.append(el("option", { value: option.id }, [option.label]));
    }

    if (which === "movies") select.value = state.selectedMovieId;
    else if (options.some((option) => option.id === keep)) select.value = keep;

    select.disabled = options.length === 0;
  }

  function render(state: PanelState) {
    drawRegions(state);

    watchingText.textContent = state.watching;
    dot.className = `dot ${state.watchingActive ? "" : "off"}`;

    permissionButton.style.display = state.permission === "default" ? "" : "none";
    permissionText.style.display = state.permission === "default" ? "none" : "";
    permissionText.textContent =
      state.permission === "granted"
        ? "OS 알림 켜짐"
        : state.permission === "denied"
          ? "OS 알림 꺼짐"
          : "OS 알림 미지원";

    errorBox.style.display = state.error ? "" : "none";
    errorBox.textContent = state.error ?? "";

    fillOptions(movieSelect, state, "movies");
    fillOptions(siteSelect, state, "sites");

    drawConditions(state);
    drawAlarms(state);
  }

  function destroy() {
    host.remove();
  }

  return { render, destroy };
}
