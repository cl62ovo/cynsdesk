import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getEntries, getOwnerId, isOwner } from "../../../lib/content-store";
import TinkeringWorkbench from "./TinkeringWorkbench";
import "./workbench.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "things I tried · Cynthia 的桌面",
  description: "A messy little workbench of experiments, unfinished things, and curious ideas.",
};

export default async function ThingsTriedPage() {
  const [entries, user, ownerId] = await Promise.all([
    getEntries("things-i-tried"),
    getChatGPTUser(),
    getOwnerId(),
  ]);
  const owner = await isOwner(user?.userId);

  const showStudioDoor = owner || Boolean(user && !ownerId);

  return <TinkeringWorkbench entries={entries} owner={owner} showStudioDoor={showStudioDoor} />;
}
