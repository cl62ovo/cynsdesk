import { getRandomEntry } from "../../../lib/content-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const exclude = new URL(request.url).searchParams.get("exclude") || undefined;
  const entry = await getRandomEntry(exclude);
  return Response.json(
    { entry },
    { headers: { "Cache-Control": "no-store" } },
  );
}
