/**
 * CGV 조회. 반드시 cgv.co.kr 페이지 안에서 실행되어야 한다.
 * 차단을 우회하지 않으며, 거부당하면 그 사실을 그대로 위로 전달한다.
 */
import type { Hall, Seat } from "../seat";
import { dedupeById } from "./dedupe";
import type { Fetched, Movie, SeatMap, Schedule, ScreenKind, Site } from "./types";

const COMPANY = "A420";
/** 응답이 오지도 실패하지도 않고 멎으면, 이 시간 뒤에 실패로 끊는다. */
const TIMEOUT_MS = 10_000;

type Envelope<T> = { statusCode: number; statusMessage: string; data: T };

async function call<T>(path: string): Promise<Fetched<Envelope<T>>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(path, { cache: "no-store", signal: controller.signal });
    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("json")) {
      return {
        ok: false,
        reason: "blocked",
        message: `CGV가 조회를 거부했습니다 (HTTP ${response.status}).`,
      };
    }
    if (!response.ok) {
      return { ok: false, reason: "unavailable", message: `CGV 응답 오류 (HTTP ${response.status}).` };
    }

    return { ok: true, data: (await response.json()) as Envelope<T> };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        reason: "unavailable",
        message: `조회 응답이 ${TIMEOUT_MS / 1000}초 동안 없어 멈췄습니다.`,
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: "unavailable", message: `조회에 실패했습니다: ${message}` };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMovies(): Promise<Fetched<Movie[]>> {
  const result = await call<{ movNo: string; movNm: string }[]>(
    `/api/v1/booking/searchAtktTopPostrList?coCd=${COMPANY}&movNm=&div=&attrCd=`,
  );
  if (!result.ok) return result;

  const rows = result.data.data ?? [];
  return { ok: true, data: rows.map((row) => ({ movNo: row.movNo, movNm: row.movNm })) };
}

type RegionRow = { regnGrpNm: string; siteList: { siteNo: string; siteNm: string }[] | null };

export async function fetchSites(movNo: string): Promise<Fetched<Site[]>> {
  const result = await call<RegionRow[]>(
    `/api/v1/booking/searchRegnList?movNo=${encodeURIComponent(movNo)}&coCd=${COMPANY}`,
  );
  if (!result.ok) return result;

  const sites = (result.data.data ?? []).flatMap((region) =>
    (region.siteList ?? []).map((site) => ({
      siteNo: site.siteNo,
      siteNm: site.siteNm,
      regionNm: region.regnGrpNm,
    })),
  );
  return { ok: true, data: sites };
}

/** 그 지점에서 그 영화의 상영이 실제로 있는 날짜만 돌려준다. */
export async function fetchDates(siteNo: string, movNo: string): Promise<Fetched<string[]>> {
  const result = await call<{ scnYmd: string }[]>(
    `/api/v1/booking/searchSiteScnscYmdListByMov?coCd=${COMPANY}&siteNo=${encodeURIComponent(siteNo)}&movNo=${encodeURIComponent(movNo)}`,
  );
  if (!result.ok) return result;

  const dates = (result.data.data ?? []).map((row) => row.scnYmd).filter(Boolean);
  return { ok: true, data: dates };
}

type ScheduleRow = {
  scnsNo: string;
  scnSseq: string;
  scnsNm: string;
  scnsrtTm: string;
  scnendTm: string;
  frSeatCnt: string;
  cpSeatCnt: string;
  /** 상영관 등급 코드. 01=일반, 02=4DX, 03=아이맥스, 04=SCREENX (실측). */
  tcscnsGradCd: string;
  /** 상영관 등급 이름. 코드와 함께 오므로 종류 목록을 여기서 그대로 만든다. */
  tcscnsGradNm: string;
};

/**
 * 한 지점의 그날 회차를 상영관 종류 구분 없이 모두 돌려준다.
 * 어느 상영관을 볼지는 조건이 정하므로 여기서 거르지 않는다.
 */
export async function fetchSchedules(
  siteNo: string,
  movNo: string,
  date: string,
): Promise<Fetched<Schedule[]>> {
  const result = await call<ScheduleRow[]>(
    `/api/v1/booking/searchSchByMov?coCd=${COMPANY}&siteNo=${siteNo}&scnYmd=${date}&movNo=${movNo}&rtctlScopCd=08`,
  );
  if (!result.ok) return result;

  const schedules = (result.data.data ?? []).map((row) => ({
    id: `${siteNo}-${date}-${row.scnsNo}-${row.scnSseq}`,
    screenNm: row.scnsNm,
    screenKindCode: row.tcscnsGradCd,
    screenKindName: row.tcscnsGradNm,
    startTime: row.scnsrtTm,
    endTime: row.scnendTm,
    freeSeats: Number(row.frSeatCnt),
    totalSeats: Number(row.cpSeatCnt),
    scnsNo: row.scnsNo,
    scnSseq: row.scnSseq,
  }));

  // 같은 회차가 가격 상품별로 여러 행 돌아올 때가 있다. 회차당 하나만 남긴다.
  return { ok: true, data: dedupeById(schedules) };
}

/**
 * 그 지점·영화·날짜에 실제로 있는 상영관 종류만 돌려준다.
 * 코드 체계를 미리 알 필요가 없도록, CGV가 준 이름을 그대로 쓴다.
 */
export async function fetchScreenKinds(
  siteNo: string,
  movNo: string,
  date: string,
): Promise<Fetched<ScreenKind[]>> {
  const result = await fetchSchedules(siteNo, movNo, date);
  if (!result.ok) return result;

  const byCode = new Map<string, ScreenKind>();
  for (const schedule of result.data) {
    if (!schedule.screenKindCode || byCode.has(schedule.screenKindCode)) continue;
    byCode.set(schedule.screenKindCode, {
      code: schedule.screenKindCode,
      name: schedule.screenKindName || schedule.screenKindCode,
    });
  }

  return { ok: true, data: [...byCode.values()] };
}

type SeatRow = {
  seatRowNm: string;
  seatNo: string;
  seatSaleYn: string;
  xcoordStartVal: string;
  ycoordStartVal: string;
  /** 판매 형태. "04"가 이동식(장애인·동반석)이다. 실측으로 확인했다(docs/decisions/cgv-data-source.md). */
  seatSalfrmCd: string;
};

/** 이동식(장애인·동반석) 좌석 판매 형태 코드. 이 좌석을 감시에 포함할지는 조건마다 사용자가 정한다. */
const MOVABLE_SEAT_FORM = "04";

type SeatItem = {
  seats: SeatRow[] | null;
  sbord: {
    xcoordStartVal: string;
    ycoordStartVal: string;
    xcoordEndVal: string;
    ycoordEndVal: string;
  } | null;
};

export async function fetchSeatMap(
  siteNo: string,
  date: string,
  scnsNo: string,
  scnSseq: string,
): Promise<Fetched<SeatMap>> {
  const query = new URLSearchParams({
    coCd: COMPANY,
    siteNo,
    scnYmd: date,
    scnsNo,
    scnSseq,
    seatAreaNo: "001",
    cusgdCd: "01",
  });
  const result = await call<{ items: SeatItem[] | null }>(
    `/api/v1/booking/searchIfSeatData?${query}`,
  );
  if (!result.ok) return result;

  const items = result.data.data?.items ?? [];
  const seats: Seat[] = [];
  let hall: Hall | null = null;

  for (const item of items) {
    for (const row of item.seats ?? []) {
      seats.push({
        row: row.seatRowNm,
        number: Number(row.seatNo),
        free: row.seatSaleYn === "Y",
        movable: row.seatSalfrmCd === MOVABLE_SEAT_FORM,
        x: Number(row.xcoordStartVal),
        y: Number(row.ycoordStartVal),
      });
    }
    const bord = item.sbord;
    if (bord && !hall) {
      hall = {
        xStart: Number(bord.xcoordStartVal),
        xEnd: Number(bord.xcoordEndVal),
        yStart: Number(bord.ycoordStartVal),
        yEnd: Number(bord.ycoordEndVal),
      };
    }
  }

  if (!hall || seats.length === 0) {
    return { ok: false, reason: "unavailable", message: "좌석 배치를 읽지 못했습니다." };
  }

  return { ok: true, data: { hall, seats } };
}
