/**
 * CGV 조회. 반드시 cgv.co.kr 페이지 안에서 실행되어야 한다.
 * 차단을 우회하지 않으며, 거부당하면 그 사실을 그대로 위로 전달한다.
 */
import type { Hall, Seat } from "../seat";
import { dedupeById } from "./dedupe";
import type { Fetched, Movie, SeatMap, Schedule, Site } from "./types";

const COMPANY = "A420";
/** 특별관 구분값. 04가 IMAX다. */
const IMAX_ATTR = "04";
const ATTR_DIV = "CUST_EXPO_MOVTYP_CD";
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

export async function fetchImaxMovies(): Promise<Fetched<Movie[]>> {
  const result = await call<{ movNo: string; movNm: string }[]>(
    `/api/v1/booking/searchAtktTopPostrList?coCd=${COMPANY}&movNm=&div=${ATTR_DIV}&attrCd=${IMAX_ATTR}`,
  );
  if (!result.ok) return result;

  const rows = result.data.data ?? [];
  return { ok: true, data: rows.map((row) => ({ movNo: row.movNo, movNm: row.movNm })) };
}

type RegionRow = { regnGrpNm: string; siteList: { siteNo: string; siteNm: string }[] | null };

export async function fetchImaxSites(movNo: string): Promise<Fetched<Site[]>> {
  const result = await call<RegionRow[]>(
    `/api/v1/booking/searchRegnList?movNo=${encodeURIComponent(movNo)}&coCd=${COMPANY}&div=${ATTR_DIV}&attrCd=${IMAX_ATTR}`,
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

type ScheduleRow = {
  scnsNo: string;
  scnSseq: string;
  scnsNm: string;
  scnsrtTm: string;
  scnendTm: string;
  frSeatCnt: string;
  cpSeatCnt: string;
};

export async function fetchSchedules(
  siteNo: string,
  movNo: string,
  date: string,
): Promise<Fetched<Schedule[]>> {
  const result = await call<ScheduleRow[]>(
    `/api/v1/booking/searchSchByMov?coCd=${COMPANY}&siteNo=${siteNo}&scnYmd=${date}&movNo=${movNo}&rtctlScopCd=08`,
  );
  if (!result.ok) return result;

  const rows = result.data.data ?? [];
  const schedules = rows.map((row) => ({
    id: `${siteNo}-${date}-${row.scnsNo}-${row.scnSseq}`,
    screenNm: row.scnsNm,
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

type SeatRow = {
  seatRowNm: string;
  seatNo: string;
  seatSaleYn: string;
  xcoordStartVal: string;
  ycoordStartVal: string;
};

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
