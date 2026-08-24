import type { Metadata } from "next";
import {
  chatGPTSignInPath,
  getChatGPTUser,
} from "../../chatgpt-auth";
import { getEntries, getOwnerId } from "../../../lib/content-store";
import StudioClient from "./StudioClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "camera studio · Cynthia 的桌面",
  robots: { index: false, follow: false },
};

export default async function NoticedStudioPage() {
  const user = await getChatGPTUser();
  const ownerId = await getOwnerId();
  const returnTo = "/studio/little-things-i-noticed";

  if (!user) {
    return (
      <main className="studio-shell">
        <header className="studio-heading">
          <a href="/sessions/little-things-i-noticed">← leave the little studio</a>
          <h1>behind the camera</h1>
        </header>
        <section className="claim-card">
          <span className="entry-tape" aria-hidden="true" />
          <h2>This little door is private.</h2>
          <p>Sign in with ChatGPT to check whether this desk belongs to you.</p>
          <a href={chatGPTSignInPath(returnTo)}>sign in to the studio</a>
        </section>
      </main>
    );
  }

  if (!ownerId) {
    return (
      <main className="studio-shell">
        <header className="studio-heading">
          <a href="/sessions/little-things-i-noticed">← leave the little studio</a>
          <h1>behind the camera</h1>
        </header>
        <StudioClient entries={[]} canClaim />
      </main>
    );
  }

  if (ownerId !== user.userId) {
    return (
      <main className="studio-shell">
        <header className="studio-heading">
          <a href="/sessions/little-things-i-noticed">← back to the photographs</a>
          <h1>behind the camera</h1>
        </header>
        <section className="claim-card">
          <span className="entry-tape" aria-hidden="true" />
          <h2>This is Cynthia&apos;s private drawer.</h2>
          <p>You can enjoy everything on display, but this part stays locked.</p>
        </section>
      </main>
    );
  }

  const entries = await getEntries("little-things-i-noticed", true);
  return (
    <main className="studio-shell">
      <header className="studio-heading">
        <a href="/sessions/little-things-i-noticed">← see the camera wall</a>
        <p>private · only visible to you</p>
        <h1>behind the camera</h1>
      </header>
      <StudioClient entries={entries} />
    </main>
  );
}
