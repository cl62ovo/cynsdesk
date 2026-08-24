import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getEntries, isOwner } from "../../../lib/content-store";
import { getIllustratedSession } from "../../../lib/illustrated-sessions";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

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
    <main className={`noticed-session illustrated-session ${config.theme}`}>
      <span className="session-grain" aria-hidden="true" />
      <header className="noticed-heading illustrated-heading">
        <a className="desk-return" href="/" target="_top">← back to the desk</a>
        <div className="session-object-doodle" aria-hidden="true"><span /></div>
        <p className="session-kicker">{config.kicker}</p>
        <h1>{config.name}</h1>
        <p className="session-intro">{config.intro}</p>
        <span className="scribble-line" aria-hidden="true" />
      </header>

      {entries.length ? (
        <section className="noticing-wall session-collage" aria-label={config.name}>
          {entries.map((entry, index) => (
            <article
              className={`noticed-entry noticed-entry-${(index % 8) + 1}${entry.images.length ? "" : " text-only-entry"}`}
              key={entry.id}
            >
              {entry.images.length > 0 && (
                <div className={`entry-photos${entry.images.length > 1 ? " photo-stack" : ""}`}>
                  {entry.images.map((image) => (
                    <figure className="memory-photo" key={image.id}>
                      <img
                        src={`/media/${image.objectKey}`}
                        alt={image.altText || entry.title || `A kept item from ${config.name}`}
                      />
                      {image.caption && <figcaption>{image.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              )}

              <div className="entry-note">
                <span className="entry-tape" aria-hidden="true" />
                {entry.entryDate && (
                  <time dateTime={entry.entryDate}>{formatDate(entry.entryDate)}</time>
                )}
                {entry.title && <h2>{entry.title}</h2>}
                {entry.shortText && <p className="entry-short">{entry.shortText}</p>}
                {entry.longText && <p className="entry-long">{entry.longText}</p>}
                {entry.note && <p className="margin-note">↳ {entry.note}</p>}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-noticing-wall session-empty-slot">
          <span className="empty-photo-window" aria-hidden="true" />
          <p>{config.emptyText}</p>
          <small>{config.emptyHint}</small>
        </section>
      )}

      {owner && (
        <a className="owner-add-polaroid" href={`/studio/${config.slug}`} target="_top">
          <span aria-hidden="true">＋</span>
          {config.addLabel}
        </a>
      )}
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}
