import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getEntries, isOwner } from "../../../lib/content-store";
import ThoughtsWall from "./ThoughtsWall";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "things stuck in my head · Cynthia 的桌面",
  description: "Thoughts I almost threw away, then unfolded and kept.",
};

export default async function ThoughtsPage() {
  const [entries, user] = await Promise.all([
    getEntries("things-stuck-in-my-head"),
    getChatGPTUser(),
  ]);
  const owner = await isOwner(user?.userId);

  return <ThoughtsWall entries={entries} owner={owner} />;
}
