"use client";

import { useSyncExternalStore } from "react";

/** Named formats so server pages don't pass Intl options objects around. */
const FORMATS = {
  dateTime: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  longDateTime: { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" },
  weekdayTime: { weekday: "long", hour: "numeric", minute: "2-digit" },
  time: { hour: "numeric", minute: "2-digit" },
  shortDate: { month: "short", day: "numeric" },
  longDate: { month: "long", day: "numeric" },
  fullDate: { month: "long", day: "numeric", year: "numeric" },
  month: { month: "short" },
  day: { day: "numeric" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type LocalTimeFormat = keyof typeof FORMATS;

const subscribe = () => () => {};

/**
 * A date in the viewer's own time zone. The server has no idea where the viewer is, so the
 * server render (and the first client render, to hydrate cleanly) shows UTC and says so; the
 * browser then switches to local time.
 */
export function LocalTime({ iso, format, zoneLabel = false }: { iso: string; format: LocalTimeFormat; zoneLabel?: boolean }) {
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false);
  const date = new Date(iso);
  const text = date.toLocaleString("en-US", inBrowser ? FORMATS[format] : { ...FORMATS[format], timeZone: "UTC" });
  const label = zoneLabel ? (inBrowser ? ` ${localZoneName(date)}` : " UTC") : "";
  return (
    <time dateTime={iso}>
      {text}
      {label}
    </time>
  );
}

function localZoneName(date: Date): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(date).find((p) => p.type === "timeZoneName");
  return part?.value ?? "";
}
