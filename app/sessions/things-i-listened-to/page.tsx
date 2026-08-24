import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getEntries, isOwner } from "../../../lib/content-store";
import ListeningWall from "./ListeningWall";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "things I listened to · Cynthia 的桌面",
  description: "A hand-kept wall of albums, songs, podcasts, and listening notes.",
};

export default async function ListeningSessionPage() {
  const [entries, user] = await Promise.all([
    getEntries("things-i-listened-to"),
    getChatGPTUser(),
  ]);
  const owner = await isOwner(user?.userId);

  return (
    <main className="listening-room">
      <span className="listening-wall-grain" aria-hidden="true" />
      <header className="listening-heading">
        <a className="desk-return" href="/" target="_top">← back to the desk</a>
        <div className="headphone-doodle" aria-hidden="true"><span /></div>
        <p>from the headphones</p>
        <h1>things I listened to</h1>
        <small>sounds I kept close, and the moments that stayed with them</small>
      </header>

      {entries.length || owner ? (
        <ListeningWall entries={entries} owner={owner} />
      ) : (
        <section className="quiet-listening-wall">
          <span aria-hidden="true">♫</span>
          <p>the listening wall is quiet for now.</p>
          <small>the first sleeve is waiting.</small>
        </section>
      )}
    </main>
  );
}
