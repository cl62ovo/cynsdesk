import { getAllEntries } from "../../../lib/content-store";
import { randomMemory } from "../../../lib/memory-layer";
import { entryExcerpt, entryLabel } from "../../../lib/timeline";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode");
  const entries = await getAllEntries(false);
  const entry = mode === "sing"
    ? randomMemory(entries, undefined, "things-i-listened-to")
    : randomMemory(entries);
  if (!entry) return Response.json({ memory: null }, { headers: { "Cache-Control": "no-store" } });
  const note = entry.note || entry.shortText || entryExcerpt(entry);
  const memory = mode === "sing"
    ? `♪ la la la… ♪\ncurrently stuck on: ${entryLabel(entry)}${note ? `\nCynthia wrote: “${clipWords(note, 10)}”` : ""}`
    : `the box remembers: ${entryLabel(entry)}`;
  return Response.json({ memory, entryId: entry.id, sessionSlug: entry.sessionSlug }, { headers: { "Cache-Control": "no-store" } });
}

function clipWords(value: string, length: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  const words = clean.split(" ");
  return words.length > length ? `${words.slice(0, length).join(" ")}…` : clean;
}
