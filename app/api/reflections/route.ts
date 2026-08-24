import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getAllEntries, isOwner, type ContentEntry } from "../../../lib/content-store";
import { entryDay, entryExcerpt, entryLabel } from "../../../lib/timeline";
import { getSession } from "../../../lib/sessions";

type ReflectionRequest =
  | { mode: "connection"; entryId: string }
  | { mode: "period"; granularity: "week" | "month" | "year"; start: string; end: string };

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => null)) as ReflectionRequest | null;
  const entries = await getAllEntries(false);
  const prepared = prepareReflection(body, entries);
  if (prepared.error) return Response.json({ error: prepared.error }, { status: 400 });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: runtimeText("OPENAI_MODEL") || "gpt-5.6",
      reasoning: { effort: "low" },
      max_output_tokens: 220,
      instructions: [
        "You write one warm, concise editorial reflection for a private personal archive.",
        "Use only the supplied entries. Never diagnose, psychoanalyze, or invent motives.",
        "Preserve uncertainty, mention concrete recurring images or contrasts, and write 1-3 short sentences.",
        "Do not quote more than a few words from any entry. Do not use headings or bullet points.",
      ].join(" "),
      input: prepared.prompt,
    }),
  });

  if (!response.ok) {
    return Response.json(
      { error: "The box could not make a reflection just now. Your original entries are untouched." },
      { status: 502 },
    );
  }

  const result = (await response.json()) as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const reflection = (result.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text?.trim())
    .filter(Boolean)
    .join("\n");

  if (!reflection) {
    return Response.json({ error: "The box stayed quiet this time." }, { status: 502 });
  }
  return Response.json({ reflection, generated: true });
}

function prepareReflection(body: ReflectionRequest | null, entries: ContentEntry[]) {
  if (!body) return { error: "That reflection request could not be read.", prompt: "" };

  if (body.mode === "connection") {
    const selected = entries.find((entry) => entry.id === body.entryId);
    if (!selected) return { error: "That saved thing could not be found.", prompt: "" };
    const context = entries.filter((entry) => entry.id !== selected.id).slice(0, 60);
    return {
      error: "",
      prompt: `Find one grounded, gentle connection between the selected entry and the rest of the box.\n\nSelected:\n${entryLine(selected)}\n\nOther entries:\n${context.map(entryLine).join("\n") || "No other entries yet."}`,
    };
  }

  if (
    body.mode !== "period" ||
    !["week", "month", "year"].includes(body.granularity) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.start) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.end) ||
    body.start > body.end
  ) {
    return { error: "That time period could not be read.", prompt: "" };
  }

  const periodEntries = entries
    .filter((entry) => {
      const day = entryDay(entry);
      return day >= body.start && day <= body.end;
    })
    .slice(0, 100);
  if (!periodEntries.length) return { error: "There is not enough in that period to summarize yet.", prompt: "" };

  return {
    error: "",
    prompt: `Write a ${body.granularity} reflection for ${body.start} through ${body.end}. Keep it playful and modest if there are only a few entries.\n\nEntries:\n${periodEntries.map(entryLine).join("\n")}`,
  };
}

function entryLine(entry: ContentEntry) {
  const session = getSession(entry.sessionSlug)?.name ?? entry.sessionSlug;
  const text = [entryLabel(entry), entryExcerpt(entry), entry.note]
    .filter(Boolean)
    .join(" — ")
    .replace(/\s+/g, " ")
    .slice(0, 700);
  return `${entryDay(entry)} | ${session} | ${text}`;
}

function runtimeText(key: string) {
  const value = (env as typeof env & Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}
