import type { ContentEntry } from "./content-store";
import {
  memoryFingerprint,
  monthlyMemory,
  periodEvidence,
  relatedMemories,
} from "./memory-layer";
import { getSession } from "./sessions";
import { entryDay, entryLabel } from "./timeline";

export const LOCAL_REFLECTION_VERSION = "local-v1";

type ReflectionGranularity = "week" | "month" | "year";

export function localReflectionFingerprint(entries: ContentEntry[]) {
  return `${LOCAL_REFLECTION_VERSION}:${memoryFingerprint(entries)}`;
}

export function makeLocalConnection(selected: ContentEntry, entries: ContentEntry[], variation = 0) {
  const related = relatedMemories(selected, entries, 5);
  const selectedRoom = roomName(selected);

  if (!related.length) {
    return {
      reflection: `This one was left on ${longDate(entryDay(selected))} in ${selectedRoom}. There is not a strong second thread yet, so the box is keeping the connection small.`,
      evidence: [selected],
    };
  }

  const match = related[0];
  const daysApart = dayDistance(entryDay(selected), entryDay(match.entry));
  const matchRoom = roomName(match.entry);
  const selectedName = clippedLabel(selected);
  const matchName = clippedLabel(match.entry);
  const shared = match.shared.slice(0, 2);
  const timePhrase = daysApart === 0 ? "on the same day" : daysApart === 1 ? "one day apart" : `${daysApart} days apart`;
  const candidates = shared.length ? [
    `The ${shared.length === 1 ? "word" : "words"} “${shared.join(" · ")}” ${shared.length === 1 ? "appears" : "appear"} in both “${selectedName}” and “${matchName}.” They were kept ${timePhrase}, in ${selectedRoom === matchRoom ? `the same corner: ${selectedRoom}` : `two different corners of the box`}.`,
    `A small thread runs from “${selectedName}” to “${matchName}”: ${shared.join(" · ")}. The two pieces were left ${timePhrase}${selectedRoom === matchRoom ? ` in ${selectedRoom}` : `, between ${selectedRoom} and ${matchRoom}`}.`,
    `“${selectedName}” is not alone in the box. “${matchName}” returns to ${shared.join(" and ")}, ${timePhrase}${selectedRoom === matchRoom ? " in the same room" : " somewhere else in the archive"}.`,
  ] : [
    `“${selectedName}” and “${matchName}” were left ${timePhrase}${selectedRoom === matchRoom ? ` in ${selectedRoom}` : `, one in ${selectedRoom} and one in ${matchRoom}`}. The box is only pointing to their nearness, not turning it into a bigger story.`,
    `The nearest little echo is “${matchName},” kept ${timePhrase}. It comes from ${matchRoom}${selectedRoom === matchRoom ? " too" : `, while this one belongs to ${selectedRoom}`}.`,
    `Two saved things sit close together in time: “${selectedName}” and “${matchName}.” They landed ${timePhrase}${selectedRoom === matchRoom ? " in the same corner" : " in different corners"}.`,
  ];

  return {
    reflection: choose(candidates, `${selected.id}:${match.entry.id}:${variation}`),
    evidence: [selected, ...related.slice(0, 3).map(({ entry }) => entry)],
  };
}

export function makeLocalPeriodReflection(entries: ContentEntry[], granularity: ReflectionGranularity, variation = 0) {
  const story = monthlyMemory(entries);
  const evidence = periodEvidence(entries, granularity === "month" ? 20 : 14);
  const days = new Set(entries.map(entryDay)).size;
  const rooms = story.sessionCounts.length;
  const seed = `${localReflectionFingerprint(entries)}:${granularity}:${variation}`;

  if (entries.length === 1) {
    const only = entries[0];
    return {
      reflection: `One little thing stayed here: “${clippedLabel(only)},” from ${roomName(only)}. The box is leaving it as a single clear note rather than making a larger story from it.`,
      evidence,
    };
  }

  const opening = choose([
    `${entries.length} little things stayed here across ${days} ${days === 1 ? "day" : "days"}${rooms > 1 ? ` and ${rooms} corners of the box` : ""}.`,
    `This ${granularity} left ${entries.length} things in the box${rooms > 1 ? `, spread across ${rooms} different corners` : ""}.`,
    `The box kept ${entries.length} pieces from ${days} ${days === 1 ? "day" : "days"} in this ${granularity}.`,
  ], `${seed}:opening`);

  const observations: string[] = [];
  const busiest = story.sessionCounts[0];
  if (busiest && busiest.count > 1) {
    observations.push(`${roomLabel(busiest.slug)} was the fullest corner, with ${busiest.count} things kept there.`);
  }

  const recurring = story.recurringWords.filter(({ word }) => !/^\d+$/.test(word)).slice(0, 3);
  if (recurring.length) {
    observations.push(`The ${recurring.length === 1 ? "word" : "words"} “${recurring.map(({ word }) => word).join(" · ")}” kept turning up in the saved text.`);
  }

  const categoryBits = [
    story.photos.length ? `${story.photos.length} with ${story.photos.length === 1 ? "an image" : "images"}` : "",
    story.listening.length ? `${story.listening.length} that played` : "",
    story.reading.length ? `${story.reading.length} from the pages shelf` : "",
    story.making.length ? `${story.making.length} made or tried` : "",
  ].filter(Boolean);
  if (categoryBits.length >= 2) {
    observations.push(`Among them were ${naturalList(categoryBits.slice(0, 3))}.`);
  }

  const connection = story.connections[0];
  if (connection?.shared.length) {
    observations.push(`“${clippedLabel(connection.left)}” and “${clippedLabel(connection.right)}” met across two rooms through ${connection.shared.slice(0, 2).join(" and ")}.`);
  }

  if (!observations.length) {
    const first = entries[0];
    const last = entries[entries.length - 1];
    observations.push(`The entries run from “${clippedLabel(last)}” to “${clippedLabel(first)},” without a strong repeated thread the box can honestly name yet.`);
  }

  return {
    reflection: `${opening} ${choose(observations, `${seed}:observation`)}`,
    evidence,
  };
}

function roomName(entry: ContentEntry) {
  return roomLabel(entry.sessionSlug);
}

function roomLabel(slug: string) {
  return getSession(slug)?.name ?? slug.replaceAll("-", " ");
}

function clippedLabel(entry: ContentEntry) {
  const clean = entryLabel(entry).replace(/\s+/g, " ").trim();
  return clean.length > 58 ? `${clean.slice(0, 57).trim()}…` : clean;
}

function longDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
}

function dayDistance(left: string, right: string) {
  return Math.round(Math.abs(new Date(`${left}T12:00:00Z`).getTime() - new Date(`${right}T12:00:00Z`).getTime()) / 86_400_000);
}

function naturalList(values: string[]) {
  if (values.length < 2) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function choose<T>(values: T[], seed: string): T {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return values[(hash >>> 0) % values.length];
}
