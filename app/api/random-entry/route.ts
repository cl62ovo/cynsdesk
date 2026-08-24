import { getAllEntries } from "../../../lib/content-store";
import { randomMemory } from "../../../lib/memory-layer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const exclude = new URL(request.url).searchParams.get("exclude") || undefined;
  const entry = randomMemory(await getAllEntries(false), exclude);
  return Response.json(
    { entry },
    { headers: { "Cache-Control": "no-store" } },
  );
}
