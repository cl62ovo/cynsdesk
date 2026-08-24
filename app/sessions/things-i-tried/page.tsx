import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getEntries, isOwner } from "../../../lib/content-store";
import TinkeringWorkbench from "./TinkeringWorkbench";
import "./workbench.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "things I tried · Cynthia 的桌面",
  description: "A messy little workbench of experiments, unfinished things, and curious ideas.",
};

export default async function ThingsTriedPage() {
  const [entries, user] = await Promise.all([
    getEntries("things-i-tried"),
    getChatGPTUser(),
  ]);
  const owner = await isOwner(user?.userId);

  return <TinkeringWorkbench entries={entries} owner={owner} />;
}
