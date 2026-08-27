/**
 * 알람을 화면 밖으로 내보내는 수단. 권한이 없거나 거부되어도
 * 화면 안의 알람은 그대로 남으므로 조용히 넘어간다.
 */
import type { Alarm } from "./types";

export type NotifyPermission = "unsupported" | "default" | "granted" | "denied";

export function currentPermission(): NotifyPermission {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestPermission(): Promise<NotifyPermission> {
  if (currentPermission() === "unsupported") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function hhmm(value: string): string {
  return `${value.slice(0, 2)}:${value.slice(2)}`;
}

export function describe(alarm: Alarm): { title: string; body: string } {
  return {
    title: `자리가 났습니다 — ${alarm.movNm}`,
    body: `${alarm.siteNm} ${alarm.screenNm} ${hhmm(alarm.startTime)} · ${alarm.seats.join(", ")}`,
  };
}

export function sendOsNotification(alarm: Alarm): void {
  if (currentPermission() !== "granted") return;
  const { title, body } = describe(alarm);
  try {
    new Notification(title, { body, tag: alarm.id });
  } catch {
    // OS 알림이 실패해도 화면 알람으로 전달된다.
  }
}
