import { env } from "cloudflare:workers";
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
  memoryFingerprint,
  memoryLine,
  periodEvidence,
} from "../../../lib/memory-layer";
import { entryDay, entryExcerpt, entryLabel } from "../../../lib/timeline";
import { getSession } from "../../../lib/sessions";

type PeriodGranularity = "week" | "month" | "year";
type ReflectionRequest =
  | { mode: "connection"; entryId: string }
  | { mode: "period"; granularity: PeriodGranularity; start: string; end: string; regenerate?: boolean; readOnly?: boolean };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ReflectionRequest | null;
  const entries = await getAllEntries(false);
  const prepared = prepareReflection(body, entries);
  if (prepared.error) return Response.json({ error: prepared.error }, { status: 400 });

  if (body?.mode === "period") {
    const periodKey = keyFor(body.granularity, body.start);
    const cached = await getMemoryRecap(body.granularity, periodKey);
    if (cached && (!body.regenerate || body.readOnly)) {
      return Response.json({
        reflection: cached.reflection,
        sources: sourcesFromIds(cached.evidenceEntryIds, entries),
        cached: true,
        stale: cached.contentFingerprint !== prepared.fingerprint,
      });
    }
    if (body.readOnly) return Response.json({ cached: false }, { status: 404 });
  }

  const user = await getChatGPTUser();
  if (!(await isOwner(user?.userId))) {
    return Response.json({ error: "Only Cynthia can ask the box to reflect." }, { status: 403 });
  }

  const apiKey = runtimeText("OPENAI_API_KEY");
  if (!apiKey) {
    return Response.json(
      { error: "AI reflections are ready, but the private server key has not been connected yet.", available: false },
      { status: 503 },
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: runtimeText("OPENAI_MODEL") || "gpt-5.6",
      reasoning: { effort: "low" },
      max_output_tokens: body?.mode === "period" && body.granularity === "month" ? 360 : 240,
      instructions: [
        "You write a warm, concise editorial reflection for Cynthia's private personal archive.",
        "Use only the supplied evidence. Do not invent facts, motives, diagnoses, feelings, or psychological claims.",
        "Never rewrite an original entry. Name concrete patterns and preserve uncertainty.",
        "If evidence is sparse, say something modest rather than creating a grand narrative.",
        "Write 1-3 short sentences. Do not use headings or bullet points. Quote at most a few words.",
      ].join(" "),
      input: prepared.prompt,
    }),
  });

  if (!response.ok) {
    return Response.json({ error: "The box could not make a reflection just now. Your original entries are untouched." }, { status: 502 });
  }

  const result = (await response.json()) as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const reflection = (result.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text?.trim())
    .filter(Boolean)
    .join("\n");
  if (!reflection) return Response.json({ error: "The box stayed quiet this time." }, { status: 502 });

  if (body?.mode === "period") {
    await saveMemoryRecap({
      granularity: body.granularity,
      periodKey: keyFor(body.granularity, body.start),
      startDate: body.start,
      endDate: body.end,
      contentFingerprint: prepared.fingerprint,
      reflection,
      evidenceEntryIds: prepared.evidence.map((entry) => entry.id),
    });
  }
  return Response.json({ reflection, sources: prepared.evidence.map(sourceFor), generated: true, cached: false });
}

function prepareReflection(body: ReflectionRequest | null, entries: ContentEntry[]) {
  if (!body) return { error: "That reflection request could not be read.", prompt: "", evidence: [] as ContentEntry[], fingerprint: "" };
  if (body.mode === "connection") {
    const selected = entries.find((entry) => entry.id === body.entryId);
    if (!selected) return { error: "That saved thing could not be found.", prompt: "", evidence: [] as ContentEntry[], fingerprint: "" };
    const evidence = connectionEvidence(selected, entries);
    return {
      error: "",
      evidence,
      fingerprint: memoryFingerprint(evidence),
      prompt: `Notice one supported, gentle connection between the selected entry and the other evidence. If there is no meaningful connection, briefly contextualize its date and archive room instead.\n\nSelected evidence:\n${memoryLine(selected)}\n\nRelated evidence:\n${evidence.slice(1).map(memoryLine).join("\n") || "No related entry yet."}`,
    };
  }
  if (
    body.mode !== "period" ||
    !["week", "month", "year"].includes(body.granularity) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.end) ||
    body.start > body.end
  ) return { error: "That time period could not be read.", prompt: "", evidence: [] as ContentEntry[], fingerprint: "" };

  const periodEntries = memoryEntries(entries, { start: body.start, end: body.end });
  if (!periodEntries.length) return { error: "There is not enough in that period to summarize yet.", prompt: "", evidence: [] as ContentEntry[], fingerprint: "" };
  const evidence = periodEvidence(periodEntries, body.granularity === "month" ? 20 : 14);
  return {
    error: "",
    evidence,
    fingerprint: memoryFingerprint(periodEntries),
    prompt: `Write a ${body.granularity} reflection for ${body.start} through ${body.end}. There were ${periodEntries.length} saved entries. The lines below are the chosen supporting evidence, selected deterministically from that period.\n\n${evidence.map(memoryLine).join("\n")}`,
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

function runtimeText(key: string) {
  const value = (env as typeof env & Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}
