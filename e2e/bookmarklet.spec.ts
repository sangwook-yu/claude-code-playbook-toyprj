import { expect, test, type Page } from "@playwright/test";

import {
  bookmarkletCode,
  centerSeat,
  frontLeftSeat,
  movableCenterSeat,
  serveFakeCgv,
  type FakeState,
} from "./fake-cgv";

/** 19:30 회차에 중간 중앙 연석 두 자리가 비어 있는 상태. */
function withCenterPair(): FakeState {
  return {
    blocked: false,
    schedules: [
      {
        scnsNo: "004",
        scnSseq: "4",
        startTime: "1930",
        seats: [
          centerSeat("B", 5, true),
          centerSeat("B", 6, true),
          centerSeat("B", 7, false),
          frontLeftSeat("A", 1, false),
        ],
      },
    ],
  };
}

/** 어느 회차에도 빈자리가 없는 상태. */
function soldOut(): FakeState {
  return {
    blocked: false,
    schedules: [
      {
        scnsNo: "004",
        scnSseq: "4",
        startTime: "1930",
        seats: [centerSeat("B", 5, false), centerSeat("B", 6, false)],
      },
    ],
  };
}

async function openPanel(page: Page) {
  await page.goto("https://cgv.co.kr/");
  await page.evaluate(() => window.localStorage.clear());
  await page.addScriptTag({ content: await bookmarkletCode() });
  await expect(page.getByRole("heading", { name: "아이맥스 좌석 감시" })).toBeVisible();
}

/** 조건 하나를 등록한다. 기본은 중간 중앙 2연석, 하루 전체 시간대. */
async function addCondition(
  page: Page,
  options: {
    from?: string;
    to?: string;
    seats?: string;
    region?: string;
    includeMovable?: boolean;
  } = {},
) {
  await page.getByLabel("영화").selectOption({ label: "오디세이" });
  await page.getByLabel("지점").selectOption({ label: "천안펜타포트 (대전/충청)" });
  await page.getByLabel("시작").fill(options.from ?? "00:00");
  await page.getByLabel("끝").fill(options.to ?? "23:59");
  if (options.seats) await page.getByLabel("최소 연석 수").fill(options.seats);

  if (options.region) {
    await page.getByText("중간 중앙", { exact: true }).click();
    await page.getByText(options.region, { exact: true }).click();
  }

  if (options.includeMovable) {
    await page.getByLabel("이동식(장애인·동반석) 좌석도 포함").check();
  }

  await page.getByRole("button", { name: "조건 추가" }).click();
}

test("CGV 페이지에서 실행하면 감시 패널이 뜬다", async ({ page }) => {
  await serveFakeCgv(page, soldOut());
  await openPanel(page);

  await expect(page.getByText("감시 중인 조건이 없습니다")).toBeVisible();
});

test("CGV가 아닌 곳에서 실행하면 패널 대신 안내가 나온다", async ({ page }) => {
  await page.goto("/");

  const messages: string[] = [];
  page.on("dialog", (dialog) => {
    messages.push(dialog.message());
    void dialog.dismiss();
  });

  await page.addScriptTag({ content: await bookmarkletCode() });

  expect(messages.join(" ")).toContain("CGV 페이지");
  await expect(page.getByRole("heading", { name: "아이맥스 좌석 감시" })).toHaveCount(1);
});

test("두 번 실행해도 패널은 하나만 있다", async ({ page }) => {
  await serveFakeCgv(page, soldOut());
  await openPanel(page);

  page.on("dialog", (dialog) => void dialog.dismiss());
  await page.addScriptTag({ content: await bookmarkletCode() });

  await expect(page.getByRole("heading", { name: "아이맥스 좌석 감시" })).toHaveCount(1);
});

test("조건을 등록하면 목록에 남고 새로고침 뒤에도 이어진다", async ({ page }) => {
  await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);

  await expect(page.getByTestId("condition")).toHaveCount(1);
  await expect(page.getByTestId("condition")).toContainText("오디세이 · 천안펜타포트");
  await expect(page.getByTestId("condition")).toContainText("중간 중앙 · 2석 이상");

  await page.reload();
  await page.addScriptTag({ content: await bookmarkletCode() });
  await expect(page.getByTestId("condition")).toHaveCount(1);
});

test("조건을 꺼도 다른 조건은 감시 중으로 남는다", async ({ page }) => {
  await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await addCondition(page);
  await addCondition(page);

  await expect(page.getByTestId("condition")).toHaveCount(3);
  await page.getByRole("button", { name: "끄기" }).first().click();

  const states = page.getByTestId("condition-state");
  await expect(states.nth(0)).toHaveText("꺼짐");
  await expect(states.nth(1)).toHaveText("감시 중");
  await expect(states.nth(2)).toHaveText("감시 중");
  await expect(page.getByText("감시 중 · 조건 2개")).toBeVisible();
});

test("고른 구역에 연석이 나면 알람이 뜨고, 무엇을 고를지 알려준다", async ({ page }) => {
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);

  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");
  await expect(page.getByTestId("alarm")).toHaveCount(0);

  // 중간 중앙에 연석 두 자리가 풀린다.
  state.schedules = withCenterPair().schedules;
  await page.getByRole("button", { name: "지금 확인" }).click();

  const alarm = page.getByTestId("alarm");
  await expect(alarm).toHaveCount(1);
  await expect(alarm).toContainText("오디세이");
  await expect(alarm).toContainText("IMAX관");
  await expect(alarm).toContainText("19:30");
  await expect(alarm).toContainText("B5–B6 (2석)");
});

test("같은 자리가 계속 비어 있는 동안에는 알람이 한 번만 뜬다", async ({ page }) => {
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  state.schedules = withCenterPair().schedules;
  await page.getByRole("button", { name: "지금 확인" }).click();
  await expect(page.getByTestId("alarm")).toHaveCount(1);

  await page.getByRole("button", { name: "지금 확인" }).click();
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");
  await expect(page.getByTestId("alarm")).toHaveCount(1);
});

test("고르지 않은 구역의 자리는 알람을 내지 않는다", async ({ page }) => {
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  // 앞 좌측에만 연석이 난다. 조건은 중간 중앙이다.
  state.schedules = [
    {
      scnsNo: "004",
      scnSseq: "4",
      startTime: "1930",
      seats: [frontLeftSeat("A", 1, true), frontLeftSeat("A", 2, true)],
    },
  ];
  await page.getByRole("button", { name: "지금 확인" }).click();

  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");
  await expect(page.getByTestId("alarm")).toHaveCount(0);
});

test("시간 범위 밖 회차는 자리가 나도 알람을 내지 않는다", async ({ page }) => {
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page, { from: "09:00", to: "18:00" });
  await expect(page.getByTestId("condition")).toContainText("회차 0개 확인");

  state.schedules = withCenterPair().schedules;
  await page.getByRole("button", { name: "지금 확인" }).click();

  await expect(page.getByTestId("alarm")).toHaveCount(0);
});

test("알람을 누르면 CGV 예매 화면이 새 탭으로 열린다", async ({ page, context }) => {
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  state.schedules = withCenterPair().schedules;
  await page.getByRole("button", { name: "지금 확인" }).click();
  await expect(page.getByTestId("alarm")).toHaveCount(1);

  const opened = context.waitForEvent("page");
  await page.getByRole("button", { name: "CGV 예매 화면 열기" }).click();
  const tab = await opened;

  expect(tab.url()).toContain("cgv.co.kr/cnm/movieBook/movie");
  await tab.close();
});

test("조회가 차단되면 감시가 조용히 멈추지 않고 화면에 드러난다", async ({ page }) => {
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  state.blocked = true;
  await page.getByRole("button", { name: "지금 확인" }).click();

  await expect(page.getByTestId("condition")).toContainText("조회가 차단되었습니다");
  await expect(page.getByTestId("condition")).toContainText("403");
});

test("알림 권한을 허용하면 자리가 났을 때 OS 알림을 보낸다", async ({ page, context }) => {
  await context.grantPermissions(["notifications"]);
  await page.addInitScript(() => {
    const sent: string[] = [];
    class RecordingNotification {
      static permission = "granted";
      static requestPermission() {
        return Promise.resolve("granted");
      }
      constructor(title: string) {
        sent.push(title);
      }
    }
    Object.defineProperty(window, "Notification", { value: RecordingNotification, writable: true });
    Object.defineProperty(window, "__osNotifications", { value: sent, writable: true });
  });

  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  state.schedules = withCenterPair().schedules;
  await page.getByRole("button", { name: "지금 확인" }).click();
  await expect(page.getByTestId("alarm")).toHaveCount(1);

  const sent = await page.evaluate(
    () => (window as unknown as { __osNotifications: string[] }).__osNotifications,
  );
  expect(sent.join(" ")).toContain("자리가 났습니다");
});

test("CGV가 같은 회차를 여러 상품으로 중복해 돌려줘도 알람의 자리 목록은 한 번만 나온다", async ({
  page,
}) => {
  const state = await serveFakeCgv(page, { ...soldOut(), duplicateRows: true });
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  state.schedules = withCenterPair().schedules;
  await page.getByRole("button", { name: "지금 확인" }).click();

  const alarm = page.getByTestId("alarm");
  await expect(alarm).toHaveCount(1);

  const detail = await alarm.locator(".detail").first().textContent();
  expect(detail?.match(/B5–B6/g)).toHaveLength(1);
});

test("한 회차의 좌석 조회가 실패해도, 그전에 이미 찾은 다른 회차의 자리는 알람이 뜬다", async ({
  page,
}) => {
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  // 17:30 회차는 자리가 나고, 19:30 회차는 좌석 조회 자체가 막힌다.
  state.schedules = [
    {
      scnsNo: "004",
      scnSseq: "3",
      startTime: "1730",
      seats: [centerSeat("B", 5, true), centerSeat("B", 6, true)],
    },
    {
      scnsNo: "004",
      scnSseq: "4",
      startTime: "1930",
      seats: [centerSeat("C", 5, true), centerSeat("C", 6, true)],
    },
  ];
  state.blockSeatDataFor = "004-4";

  await page.getByRole("button", { name: "지금 확인" }).click();

  await expect(page.getByTestId("alarm")).toHaveCount(1);
  await expect(page.getByTestId("alarm")).toContainText("17:30");
  await expect(page.getByTestId("condition")).toContainText("조회가 차단되었습니다");
});

test("감시 중인 조건이 없으면 상태 점이 꺼진 것으로 보인다", async ({ page }) => {
  await serveFakeCgv(page, soldOut());
  await openPanel(page);

  await expect(page.locator(".dot")).toHaveClass(/off/);

  await addCondition(page);
  await expect(page.locator(".dot")).not.toHaveClass(/off/);
});

test("영화와 지점을 고르지 않고 조건 추가를 누르면 에러가 화면에 보인다", async ({ page }) => {
  await serveFakeCgv(page, soldOut());
  await openPanel(page);

  await page.getByRole("button", { name: "조건 추가" }).click();

  await expect(page.getByText("영화와 지점을 모두 골라 주세요.")).toBeVisible();
});

test("아이맥스가 아닌 상영관의 자리는 알람을 내지 않는다", async ({ page }) => {
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  // 같은 지점의 일반관(1관)에 자리가 났다. 조건은 아이맥스만 본다.
  state.schedules = [
    {
      scnsNo: "001",
      scnSseq: "3",
      startTime: "1730",
      seats: [centerSeat("B", 5, true), centerSeat("B", 6, true)],
      screenGrade: "01",
    },
  ];
  await page.getByRole("button", { name: "지금 확인" }).click();

  await expect(page.getByTestId("condition")).toContainText("회차 0개 확인");
  await expect(page.getByTestId("alarm")).toHaveCount(0);
});

test("OS 알람 버튼은 켜짐/꺼짐을 토글하고, 꺼져 있으면 알림을 보내지 않는다", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["notifications"]);
  await page.addInitScript(() => {
    const sent: string[] = [];
    class RecordingNotification {
      static permission = "granted";
      static requestPermission() {
        return Promise.resolve("granted");
      }
      constructor(title: string) {
        sent.push(title);
      }
    }
    Object.defineProperty(window, "Notification", { value: RecordingNotification, writable: true });
    Object.defineProperty(window, "__osNotifications", { value: sent, writable: true });
  });

  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  const notifyButton = page.getByRole("button", { name: "OS 알람" });
  await expect(notifyButton).toBeVisible();
  await expect(notifyButton).toHaveClass(/on/);

  // 꺼둔 상태에서 자리가 나면 화면 알람은 뜨지만 OS 알림은 안 간다.
  await notifyButton.click();
  await expect(notifyButton).not.toHaveClass(/on/);

  state.schedules = withCenterPair().schedules;
  await page.getByRole("button", { name: "지금 확인" }).click();
  await expect(page.getByTestId("alarm")).toHaveCount(1);

  let sent = await page.evaluate(
    () => (window as unknown as { __osNotifications: string[] }).__osNotifications,
  );
  expect(sent).toHaveLength(0);

  // 다시 켜면 이후 자리에는 OS 알림도 간다.
  await notifyButton.click();
  await expect(notifyButton).toHaveClass(/on/);

  state.schedules = [
    {
      scnsNo: "004",
      scnSseq: "5",
      startTime: "2100",
      seats: [centerSeat("D", 5, true), centerSeat("D", 6, true)],
    },
  ];
  await page.getByRole("button", { name: "지금 확인" }).click();
  await expect(page.getByTestId("alarm")).toHaveCount(2);

  sent = await page.evaluate(
    () => (window as unknown as { __osNotifications: string[] }).__osNotifications,
  );
  expect(sent).toHaveLength(1);
});

test("이동식(장애인·동반석) 좌석은 조건에 맞아도 알람을 내지 않는다", async ({ page }) => {
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  // 중간 중앙에 이동식 좌석 두 자리가 이어져 비어 있다.
  state.schedules = [
    {
      scnsNo: "004",
      scnSseq: "4",
      startTime: "1930",
      seats: [movableCenterSeat("A", 17, true), movableCenterSeat("A", 18, true)],
    },
  ];
  await page.getByRole("button", { name: "지금 확인" }).click();

  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");
  await expect(page.getByTestId("alarm")).toHaveCount(0);
});

test("이동식 좌석이 일반석 사이에 끼어 있으면 그 자리에서 이어짐이 끊긴다", async ({ page }) => {
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  // B5, B7은 일반석이고 B6은 이동식이다. 최소 연석 2를 만족하는 일반석 조합이 없다.
  state.schedules = [
    {
      scnsNo: "004",
      scnSseq: "4",
      startTime: "1930",
      seats: [centerSeat("B", 5, true), movableCenterSeat("B", 6, true), centerSeat("B", 7, true)],
    },
  ];
  await page.getByRole("button", { name: "지금 확인" }).click();

  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");
  await expect(page.getByTestId("alarm")).toHaveCount(0);
});

test("이동식 좌석 포함을 체크하면 그 자리로도 알람이 뜬다", async ({ page }) => {
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page, { includeMovable: true });
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");
  await expect(page.getByTestId("condition")).toContainText("이동식 포함");

  state.schedules = [
    {
      scnsNo: "004",
      scnSseq: "4",
      startTime: "1930",
      seats: [movableCenterSeat("A", 17, true), movableCenterSeat("A", 18, true)],
    },
  ];
  await page.getByRole("button", { name: "지금 확인" }).click();

  const alarm = page.getByTestId("alarm");
  await expect(alarm).toHaveCount(1);
  await expect(alarm).toContainText("A17–A18 (2석)");
});

test("확인 주기를 바꾸면 그 주기로 다시 확인이 돈다", async ({ page }) => {
  test.setTimeout(60_000);
  const state = await serveFakeCgv(page, soldOut());
  await openPanel(page);
  await addCondition(page);
  await expect(page.getByTestId("condition")).toContainText("회차 1개 확인");

  const intervalInput = page.locator(".intervalbox input");
  await expect(intervalInput).toHaveValue("1");

  await intervalInput.fill("0.5");
  await intervalInput.blur();
  await expect(intervalInput).toHaveValue("0.5");

  // 자리를 풀어두면, 수동으로 "지금 확인"을 누르지 않아도 짧아진 주기 안에 알람이 뜬다.
  state.schedules = withCenterPair().schedules;
  await expect(page.getByTestId("alarm")).toHaveCount(1, { timeout: 40_000 });
});

test("0.5분보다 작은 값을 넣으면 0.5분(30초)으로 맞춰진다", async ({ page }) => {
  await serveFakeCgv(page, soldOut());
  await openPanel(page);

  const intervalInput = page.locator(".intervalbox input");
  await intervalInput.fill("0.1");
  await intervalInput.blur();

  await expect(intervalInput).toHaveValue("0.5");
});

test("한 클릭에 0.5분씩 오르내린다", async ({ page }) => {
  await serveFakeCgv(page, soldOut());
  await openPanel(page);

  const intervalInput = page.locator(".intervalbox input");
  await expect(intervalInput).toHaveValue("1");

  await intervalInput.focus();
  await intervalInput.press("ArrowUp");
  await expect(intervalInput).toHaveValue("1.5");

  await intervalInput.press("ArrowDown");
  await intervalInput.press("ArrowDown");
  await expect(intervalInput).toHaveValue("0.5");
});
