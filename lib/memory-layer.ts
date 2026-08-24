import type { ContentEntry } from "./content-store";
import { entryDay, entryExcerpt, entryLabel } from "./timeline";

export type MemoryGranularity = "day" | "week" | "month" | "year";

export type MemoryPeriod = {
  granularity: MemoryGranularity;
  start: string;
  end: string;
  key: string;
  label: string;
};

export type MemoryConnection = {
  left: ContentEntry;
  right: ContentEntry;
  shared: string[];
};

export type MonthlyMemory = {
  total: number;
  sessionCounts: Array<{ slug: string; count: number }>;
  photos: ContentEntry[];
  listening: ContentEntry[];
  reading: ContentEntry[];
  making: ContentEntry[];
  recurringWords: Array<{ word: string; count: number }>;
  quotes: ContentEntry[];
  connections: MemoryConnection[];
};

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "and", "are", "because", "been", "before", "but", "can", "come", "could", "did", "does", "for", "from", "had", "has", "have", "here", "into", "its", "just", "like", "made", "make", "more", "not", "one", "only", "really", "saved", "some", "still", "that", "the", "their", "them", "then", "there", "these", "they", "thing", "things", "this", "today", "too", "very", "was", "were", "what", "when", "where", "which", "while", "with", "would", "you", "your", "我", "的", "了", "是", "在", "和", "也", "有", "就", "都", "很", "一个", "这个", "没有", "还是", "但是",
]);

export function memoryEntries(entries: ContentEntry[], options: {
  start?: string;
  end?: string;
  sessionSlug?: string;
  contentType?: string;
} = {}) {
  return entries
    .filter((entry) => !options.start || entryDay(entry) >= options.start)
    .filter((entry) => !options.end || entryDay(entry) <= options.end)
    .filter((entry) => !options.sessionSlug || entry.sessionSlug === options.sessionSlug)
    .filter((entry) => !options.contentType || entry.contentType === options.contentType)
    .sort((a, b) => entryDay(b).localeCompare(entryDay(a)) || b.createdAt - a.createdAt);
}

export function randomMemory(entries: ContentEntry[], excludeId?: string, sessionSlug?: string) {
  let pool = memoryEntries(entries, { sessionSlug }).filter((entry) => entry.id !== excludeId);
  if (!pool.length && excludeId) pool = memoryEntries(entries, { sessionSlug });
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export function memoryPeriod(granularity: MemoryGranularity, selected: string): MemoryPeriod {
  const date = parseDay(selected);
  if (granularity === "day") {
    return { granularity, start: selected, end: selected, key: selected, label: prettyDate(selected) };
  }
  if (granularity === "week") {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    const startDate = new Date(date);
    startDate.setUTCDate(startDate.getUTCDate() - mondayOffset);
    const start = toDay(startDate);
    const end = addDays(start, 6);
    return { granularity, start, end, key: start, label: `${prettyDate(start)} — ${prettyDate(end)}` };
  }
  if (granularity === "year") {
    const year = date.getUTCFullYear();
    return { granularity, start: `${year}-01-01`, end: `${year}-12-31`, key: String(year), label: String(year) };
  }
  const start = toDay(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)));
  const end = toDay(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
  return {
    granularity,
    start,
    end,
    key: start.slice(0, 7),
    label: new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(parseDay(start)),
  };
}

export function relatedMemories(selected: ContentEntry, entries: ContentEntry[], limit = 5) {
  const selectedTokens = tokensFor(selected);
  const selectedTime = parseDay(entryDay(selected)).getTime();
  return entries
    .filter((entry) => entry.id !== selected.id)
    .map((entry) => {
      const shared = [...tokensFor(entry)].filter((token) => selectedTokens.has(token));
      const daysApart = Math.abs(parseDay(entryDay(entry)).getTime() - selectedTime) / 86_400_000;
      const score = shared.length * 4
        + (daysApart <= 7 ? 3 : daysApart <= 31 ? 1.5 : 0)
        + (entry.sessionSlug !== selected.sessionSlug ? 1 : 0)
        + (entry.contentType && entry.contentType === selected.contentType ? 1 : 0);
      return { entry, score, shared };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || entryDay(b.entry).localeCompare(entryDay(a.entry)) || a.entry.id.localeCompare(b.entry.id))
    .slice(0, limit);
}

export function connectionEvidence(selected: ContentEntry, entries: ContentEntry[]) {
  const related = relatedMemories(selected, entries, 5).map(({ entry }) => entry);
  if (related.length) return [selected, ...related];
  const nearby = [...entries]
    .filter((entry) => entry.id !== selected.id)
    .sort((a, b) => Math.abs(parseDay(entryDay(a)).getTime() - parseDay(entryDay(selected)).getTime()) - Math.abs(parseDay(entryDay(b)).getTime() - parseDay(entryDay(selected)).getTime()))
    .slice(0, 3);
  return [selected, ...nearby];
}

export function periodEvidence(entries: ContentEntry[], limit = 14) {
  const sorted = memoryEntries(entries);
  if (sorted.length <= limit) return sorted;
  const chosen: ContentEntry[] = [];
  const seenSessions = new Set<string>();
  for (const entry of sorted) {
    if (!seenSessions.has(entry.sessionSlug)) {
      chosen.push(entry);
      seenSessions.add(entry.sessionSlug);
    }
    if (chosen.length >= Math.ceil(limit / 2)) break;
  }
  for (let index = 0; chosen.length < limit && index < sorted.length; index += 1) {
    const entry = sorted[Math.floor((index * (sorted.length - 1)) / Math.max(1, limit - 1))];
    if (entry && !chosen.some((item) => item.id === entry.id)) chosen.push(entry);
  }
  return chosen.slice(0, limit);
}

export function monthlyMemory(entries: ContentEntry[]): MonthlyMemory {
  const sessionCounts = new Map<string, number>();
  entries.forEach((entry) => sessionCounts.set(entry.sessionSlug, (sessionCounts.get(entry.sessionSlug) ?? 0) + 1));
  const relatedPairs: MemoryConnection[] = [];
  for (const entry of entries) {
    const match = relatedMemories(entry, entries, 1)[0];
    if (match && match.entry.sessionSlug !== entry.sessionSlug && !relatedPairs.some((pair) => pair.left.id === match.entry.id && pair.right.id === entry.id)) {
      relatedPairs.push({ left: entry, right: match.entry, shared: match.shared.slice(0, 3) });
    }
  }
  const wordCounts = new Map<string, number>();
  entries.forEach((entry) => tokensFor(entry).forEach((word) => wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1)));
  return {
    total: entries.length,
    sessionCounts: [...sessionCounts.entries()].map(([slug, count]) => ({ slug, count })).sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug)),
    photos: entries.filter((entry) => entry.images.length > 0).slice(0, 6),
    listening: entries.filter((entry) => entry.sessionSlug === "things-i-listened-to").slice(0, 6),
    reading: entries.filter((entry) => entry.sessionSlug === "pages-i-kept").slice(0, 6),
    making: entries.filter((entry) => entry.sessionSlug === "things-i-made" || entry.sessionSlug === "things-i-tried").slice(0, 6),
    recurringWords: [...wordCounts.entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 9).map(([word, count]) => ({ word, count })),
    quotes: entries.filter((entry) => Boolean(entry.shortText || entry.note || entry.longText)).slice(0, 5),
    connections: relatedPairs.slice(0, 3),
  };
}

export function memoryFingerprint(entries: ContentEntry[]) {
  const value = [...entries].sort((a, b) => a.id.localeCompare(b.id)).map((entry) => `${entry.id}:${entry.updatedAt}`).join("|");
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${entries.length}-${(hash >>> 0).toString(36)}`;
}

export function memoryLine(entry: ContentEntry) {
  return `${entryDay(entry)} | ${entry.sessionSlug} | ${[entryLabel(entry), entryExcerpt(entry), entry.note].filter(Boolean).join(" — ").replace(/\s+/g, " ").slice(0, 700)}`;
}

function tokensFor(entry: ContentEntry) {
  const text = [entry.title, entry.shortText, entry.longText, entry.note, entry.creator, entry.contentType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return new Set((text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]{1,}/gu) ?? []).filter((word) => !STOP_WORDS.has(word) && word.length > 1));
}

export function parseDay(value: string) { return new Date(`${value}T12:00:00Z`); }
export function toDay(date: Date) { return date.toISOString().slice(0, 10); }
export function addDays(value: string, count: number) { const date = parseDay(value); date.setUTCDate(date.getUTCDate() + count); return toDay(date); }
export function prettyDate(value: string) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(parseDay(value)); }
export function shortDate(value: string) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }).format(parseDay(value)); }
