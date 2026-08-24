import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getEntries, isOwner } from "../../../lib/content-store";
import { getIllustratedSession } from "../../../lib/illustrated-sessions";
import PhysicalCollection from "../PhysicalCollection";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const config = getIllustratedSession((await params).slug);
  return config
    ? {
        title: `${config.name} · Cynthia 的桌面`,
        description: config.intro,
      }
    : { title: "not found · Cynthia 的桌面" };
}

export default async function IllustratedSessionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getIllustratedSession(slug);

  if (!config) {
    return (
      <main className="noticed-session missing-session">
        <a className="desk-return" href="/" target="_top">← back to the desk</a>
        <p>there is no little drawer here yet.</p>
      </main>
    );
  }

  const [entries, user] = await Promise.all([
    getEntries(config.slug),
    getChatGPTUser(),
  ]);
  const owner = await isOwner(user?.userId);

  return (
    <main className={`noticed-session illustrated-session physical-room ${config.theme}`}>
      <span className="session-grain" aria-hidden="true" />
      <header className="noticed-heading illustrated-heading">
        <a className="desk-return" href="/" target="_top">← back to the desk</a>
        <div className="session-object-doodle" aria-hidden="true"><span /></div>
        <p className="session-kicker">{config.kicker}</p>
        <h1>{config.name}</h1>
        <p className="session-intro">{config.intro}</p>
        <span className="scribble-line" aria-hidden="true" />
      </header>

      <PhysicalCollection
        entries={entries}
        room={roomKind(config.slug)}
        roomName={config.name}
        owner={owner}
        studioHref={`/studio/${config.slug}`}
        addLabel={config.addLabel}
        emptyText={config.emptyText}
        emptyHint={config.emptyHint}
      />
    </main>
  );
}

function roomKind(slug: string): "made" | "drink" | "forget" {
  if (slug === "favorite-drink") return "drink";
  if (slug === "things-i-dont-want-to-forget") return "forget";
  return "made";
}
