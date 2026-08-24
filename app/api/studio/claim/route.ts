import { getChatGPTUser } from "../../../chatgpt-auth";
import { claimOwner } from "../../../../lib/content-store";

export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const claimed = await claimOwner(user.userId, user.email);
  if (!claimed) {
    return Response.json(
      { error: "This desk already belongs to another account." },
      { status: 403 },
    );
  }
  return Response.json({ ok: true });
}
