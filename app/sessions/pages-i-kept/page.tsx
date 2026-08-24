import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getEntries, isOwner } from "../../../lib/content-store";
import PagesArchive from "./PagesArchive";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "pages I kept · Cynthia 的桌面",
  description: "A messy little archive of words and pages that stayed with Cynthia.",
};

export default async function PagesKeptPage() {
  const [entries, user] = await Promise.all([
    getEntries("pages-i-kept"),
    getChatGPTUser(),
  ]);
  const owner = await isOwner(user?.userId);

  return (
    <main className="pages-room">
      <span className="pages-room-grain" aria-hidden="true" />
      <header className="pages-heading">
        <a className="desk-return" href="/" target="_top">← back to the desk</a>
        <div className="little-book-doodle" aria-hidden="true"><span /></div>
        <p>from the book stack</p>
        <h1>pages I kept</h1>
        <small>a messy little archive of words and pages that stayed with me</small>
      </header>

      {entries.length || owner ? (
        <PagesArchive entries={entries} owner={owner} />
      ) : (
        <section className="quiet-pages-pile">
          <span aria-hidden="true" />
          <p>no sentence has been left between these pages yet.</p>
          <small>the pencil is waiting.</small>
        </section>
      )}
    </main>
  );
}
