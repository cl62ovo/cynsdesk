import type { Metadata } from "next";
import { getAllEntries, isOwner } from "../../../lib/content-store";
import { getChatGPTUser } from "../../chatgpt-auth";
import TimeArchive from "./TimeArchive";
import "./archive.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "the box, over time · Cynthia 的桌面",
  description: "A handmade chronological archive of the little things Cynthia kept.",
};

export default async function TimeArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const [entries, query, user] = await Promise.all([getAllEntries(false), searchParams, getChatGPTUser()]);
  const initialView = query.view === "day" || query.view === "week" ? query.view : "month";
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(query.date || "") ? query.date! : undefined;
  return <TimeArchive entries={entries} initialView={initialView} initialDate={initialDate} owner={await isOwner(user?.userId)} />;
}
