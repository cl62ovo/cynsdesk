import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getEntries, isOwner } from "../../../lib/content-store";
import PhysicalCollection from "../PhysicalCollection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "little things I noticed · Cynthia 的桌面",
  description: "Small moments kept by the camera on Cynthia's desk.",
};

export default async function NoticedSessionPage() {
  const [entries, user] = await Promise.all([
    getEntries("little-things-i-noticed"),
    getChatGPTUser(),
  ]);
  const owner = await isOwner(user?.userId);

  return (
    <main className="noticed-session camera-session physical-room">
      <span className="session-grain" aria-hidden="true" />
      <header className="noticed-heading">
        <a className="desk-return" href="/" target="_top">
          ← back to the desk
        </a>
        <div className="camera-doodle" aria-hidden="true">
          <span className="camera-lens" />
          <span className="camera-button" />
        </div>
        <p className="session-kicker">from the camera</p>
        <h1>little things I noticed</h1>
        <p className="session-intro">
          ordinary moments that asked me to look twice
        </p>
        <span className="scribble-line" aria-hidden="true" />
      </header>

      <PhysicalCollection
        entries={entries}
        room="camera"
        roomName="Things I noticed"
        owner={owner}
        studioHref="/studio/little-things-i-noticed"
        addLabel="add another noticing"
        emptyText="nothing has been tucked behind this photo yet."
        emptyHint="the camera is waiting."
      />
    </main>
  );
}
