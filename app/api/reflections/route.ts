import { getChatGPTUser } from "../../chatgpt-auth";
import {
  getAllEntries,
  getMemoryRecap,
  isOwner,
  saveMemoryRecap,
  type ContentEntry,
} from "../../../lib/content-store";
import {
  connectionEvidence,
  memoryEntries,
  periodEvidence,
} from "../../../lib/memory-layer";
import {
  LOCAL_REFLECTION_VERSION,
  localReflectionFingerprint,
  makeLocalConnection,
  makeLocalPeriodReflection,
} from "../../../lib/reflection-engine";
import { entryDay, entryExcerpt, entryLabel } from "../../../lib/timeline";
import { getSession } from "../../../lib/sessions";

type PeriodGranularity = "week" | "month" | "year";
type ReflectionRequest =
  | { mode: "connection"; entryId: string; variation?: number }
  | { mode: "period"; granularity: PeriodGranularity; start: string; end: string; regenerate?: boolean; readOnly?: boolean; variation?: number };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ReflectionRequest | null;
  const entries = await getAllEntries(false);
  const prepared = prepareReflection(body, entries);
  if (prepared.error) return Response.json({ error: prepared.error }, { status: 400 });

  if (body?.mode === "period") {
    const periodKey = keyFor(body.granularity, body.start);
    const cached = await getMemoryRecap(body.granularity, periodKey);
    const localCache = cached?.contentFingerprint.startsWith(`${LOCAL_REFLECTION_VERSION}:`);
    if (cached && localCache && (!body.regenerate || body.readOnly)) {
      return Response.json({
        reflection: cached.reflection,
        sources: sourcesFromIds(cached.evidenceEntryIds, entries),
        cached: true,
        stale: cached.contentFingerprint !== prepared.fingerprint,
      });
    }
    if (body.readOnly) return Response.json({ cached: false });
  }

  const variation = Number.isFinite(body?.variation) ? Number(body?.variation) : 0;
  const local = body?.mode === "connection"
    ? makeLocalConnection(prepared.evidence[0], entries, variation)
    : makeLocalPeriodReflection(prepared.periodEntries, body!.granularity, variation);
  const reflection = local.reflection;

  if (body?.mode === "period") {
    const user = await getChatGPTUser();
    if (await isOwner(user?.userId)) {
      await saveMemoryRecap({
        granularity: body.granularity,
        periodKey: keyFor(body.granularity, body.start),
        startDate: body.start,
        endDate: body.end,
        contentFingerprint: prepared.fingerprint,
        reflection,
        evidenceEntryIds: local.evidence.map((entry) => entry.id),
      });
    }
  }
  return Response.json({ reflection, sources: local.evidence.map(sourceFor), generated: true, cached: false, engine: LOCAL_REFLECTION_VERSION });
}

function prepareReflection(body: ReflectionRequest | null, entries: ContentEntry[]) {
  if (!body) return { error: "That reflection request could not be read.", evidence: [] as ContentEntry[], periodEntries: [] as ContentEntry[], fingerprint: "" };
  if (body.mode === "connection") {
    const selected = entries.find((entry) => entry.id === body.entryId);
    if (!selected) return { error: "That saved thing could not be found.", evidence: [] as ContentEntry[], periodEntries: [] as ContentEntry[], fingerprint: "" };
    const evidence = connectionEvidence(selected, entries);
    return {
      error: "",
      evidence,
      periodEntries: [] as ContentEntry[],
      fingerprint: localReflectionFingerprint(evidence),
    };
  }
  if (
    body.mode !== "period" ||
    !["week", "month", "year"].includes(body.granularity) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.end) ||
    body.start > body.end
  ) return { error: "That time period could not be read.", evidence: [] as ContentEntry[], periodEntries: [] as ContentEntry[], fingerprint: "" };

  const periodEntries = memoryEntries(entries, { start: body.start, end: body.end });
  if (!periodEntries.length) return { error: "There is not enough in that period to summarize yet.", evidence: [] as ContentEntry[], periodEntries: [] as ContentEntry[], fingerprint: "" };
  const evidence = periodEvidence(periodEntries, body.granularity === "month" ? 20 : 14);
  return {
    error: "",
    evidence,
    periodEntries,
    fingerprint: localReflectionFingerprint(periodEntries),
  };
}

function sourceFor(entry: ContentEntry) {
  return {
    id: entry.id,
    sessionSlug: entry.sessionSlug,
    sessionName: getSession(entry.sessionSlug)?.name ?? entry.sessionSlug,
    date: entryDay(entry),
    label: entryLabel(entry),
    excerpt: entryExcerpt(entry).replace(/\s+/g, " ").slice(0, 140),
  };
}

function sourcesFromIds(ids: string[], entries: ContentEntry[]) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return ids.map((id) => byId.get(id)).filter((entry): entry is ContentEntry => Boolean(entry)).map(sourceFor);
}

function keyFor(granularity: PeriodGranularity, start: string) {
  if (granularity === "year") return start.slice(0, 4);
  if (granularity === "month") return start.slice(0, 7);
  return start;
}
