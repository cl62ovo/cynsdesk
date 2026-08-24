import type { ContentEntry } from "./content-store";

export const DESK_TIME_ZONE = "Asia/Hong_Kong";

export function entryDay(entry: ContentEntry): string {
  if (entry.entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entry.entryDate)) return entry.entryDate;
  return dateKey(new Date(entry.createdAt));
}

export function dateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DESK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function sessionTone(slug: string): string {
  if (slug === "little-things-i-noticed") return "photo";
  if (slug === "things-stuck-in-my-head") return "thought";
  if (slug === "pages-i-kept") return "page";
  if (slug === "things-i-listened-to") return "listening";
  if (slug === "things-i-tried") return "workbench";
  if (slug === "things-i-made") return "made";
  if (slug === "favorite-drink") return "drink";
  if (slug === "things-i-dont-want-to-forget") return "memory";
  if (slug === "my-pet-frogs") return "frog";
  return "misc";
}

export function entryExcerpt(entry: ContentEntry): string {
  return entry.shortText || entry.longText || entry.note || entry.creator || "a small thing, kept without words";
}

export function entryLabel(entry: ContentEntry): string {
  return entry.title || entry.shortText || entry.longText || "an unnamed little thing";
}
