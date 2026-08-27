/**
 * 가짜 CGV. 실제 CGV는 자동화 브라우저를 차단하므로, 요청을 가로채
 * 같은 모양의 응답을 돌려주고 그 위에서 진짜 북마클릿 번들을 돌린다.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Page } from "@playwright/test";

export const SITE_NO = "0110";
export const MOV_NO = "30001323";

/** 상영관 좌표. 3등분 경계는 x가 10과 20, y가 10과 20이다. */
const HALL = { xStart: 0, xEnd: 30, yStart: 0, yEnd: 30 };

export type FakeSeat = {
  row: string;
  number: number;
  free: boolean;
  x: number;
  y: number;
  /** 이동식(장애인·동반석) 좌석인지. */
  movable?: boolean;
};

/** 중간 중앙 칸에 놓이는 좌석. */
export function centerSeat(row: string, number: number, free: boolean): FakeSeat {
  return { row, number, free, x: 15, y: 15 };
}

/** 앞 좌측 칸에 놓이는 좌석. */
export function frontLeftSeat(row: string, number: number, free: boolean): FakeSeat {
  return { row, number, free, x: 5, y: 5 };
}

/** 중간 중앙 칸의 이동식(장애인·동반석) 좌석. */
export function movableCenterSeat(row: string, number: number, free: boolean): FakeSeat {
  return { row, number, free, x: 15, y: 15, movable: true };
}

export type FakeSchedule = {
  scnsNo: string;
  scnSseq: string;
  /** HHMM */
  startTime: string;
  seats: FakeSeat[];
  /** 상영관 등급 코드. 비우면 아이맥스("03")다. CGV는 한 지점의 모든 상영관을 함께 돌려준다. */
  screenGrade?: string;
};

export type FakeState = {
  schedules: FakeSchedule[];
  /** 회차·좌석 조회를 차단된 것처럼 돌려준다. */
  blocked: boolean;
  /** CGV가 실제로 그러듯, 같은 회차를 가격 상품별로 두 번 돌려준다. */
  duplicateRows?: boolean;
  /** 이 회차(scnsNo-scnSseq)만 좌석 조회를 차단된 것처럼 돌려준다. 다른 회차는 그대로 성공한다. */
  blockSeatDataFor?: string;
};

function seatRow(seat: FakeSeat) {
  return {
    seatRowNm: seat.row,
    seatNo: String(seat.number),
    seatSaleYn: seat.free ? "Y" : "N",
    xcoordStartVal: String(seat.x).padStart(4, "0"),
    ycoordStartVal: String(seat.y).padStart(4, "0"),
    seatSalfrmCd: seat.movable ? "04" : "01",
  };
}

function envelope(data: unknown) {
  return { statusCode: 0, statusMessage: "조회 되었습니다.", data };
}

const PAGE_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>가짜 CGV</title></head>
<body><h1>가짜 CGV</h1><p>북마클릿 검증용 페이지입니다.</p></body></html>`;

/** 빌드해 둔 북마클릿에서 실행 코드만 꺼낸다. 실제 배포물과 같은 코드다. */
export async function bookmarkletCode(): Promise<string> {
  const raw = (await readFile(join(process.cwd(), "public", "bookmarklet.txt"), "utf8")).trim();
  return decodeURIComponent(raw.replace(/^javascript:/, ""));
}

/**
 * 가짜 CGV를 세운다. 돌려주는 객체의 필드를 바꾸면 다음 조회부터 반영된다.
 */
export async function serveFakeCgv(page: Page, initial: FakeState): Promise<FakeState> {
  const state: FakeState = { ...initial };

  await page.route("https://cgv.co.kr/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.startsWith("/api/v1/booking/searchAtktTopPostrList")) {
      return route.fulfill({ json: envelope([{ movNo: MOV_NO, movNm: "오디세이" }]) });
    }

    if (path.startsWith("/api/v1/booking/searchRegnList")) {
      return route.fulfill({
        json: envelope([
          {
            regnGrpNm: "대전/충청",
            siteList: [{ siteNo: SITE_NO, siteNm: "천안펜타포트" }],
          },
        ]),
      });
    }

    if (state.blocked) {
      return route.fulfill({
        status: 403,
        contentType: "text/html; charset=UTF-8",
        body: "<html><body>비정상적으로 CGV에 접속한 것이 확인되어 이용이 제한되었어요.</body></html>",
      });
    }

    if (path.startsWith("/api/v1/booking/searchSchByMov")) {
      const rows = state.schedules.map((schedule) => ({
        scnsNo: schedule.scnsNo,
        scnSseq: schedule.scnSseq,
        scnsNm: schedule.screenGrade && schedule.screenGrade !== "03" ? "1관 (Laser)" : "IMAX관",
        scnsrtTm: schedule.startTime,
        scnendTm: "2359",
        frSeatCnt: String(schedule.seats.filter((seat) => seat.free).length),
        cpSeatCnt: String(schedule.seats.length),
        tcscnsGradCd: schedule.screenGrade ?? "03",
      }));
      return route.fulfill({
        json: envelope(
          state.duplicateRows ? rows.flatMap((row) => [row, row]) : rows,
        ),
      });
    }

    if (path.startsWith("/api/v1/booking/searchIfSeatData")) {
      const scnsNo = url.searchParams.get("scnsNo");
      const scnSseq = url.searchParams.get("scnSseq");

      if (state.blockSeatDataFor === `${scnsNo}-${scnSseq}`) {
        return route.fulfill({
          status: 403,
          contentType: "text/html; charset=UTF-8",
          body: "<html><body>비정상적으로 CGV에 접속한 것이 확인되어 이용이 제한되었어요.</body></html>",
        });
      }

      const schedule = state.schedules.find(
        (item) => item.scnsNo === scnsNo && item.scnSseq === scnSseq,
      );
      return route.fulfill({
        json: envelope({
          items: [
            {
              seats: (schedule?.seats ?? []).map(seatRow),
              sbord: {
                xcoordStartVal: String(HALL.xStart).padStart(4, "0"),
                xcoordEndVal: String(HALL.xEnd).padStart(4, "0"),
                ycoordStartVal: String(HALL.yStart).padStart(4, "0"),
                ycoordEndVal: String(HALL.yEnd).padStart(4, "0"),
              },
            },
          ],
        }),
      });
    }

    return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE_HTML });
  });

  return state;
}
