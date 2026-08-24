import type { Metadata } from "next";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getEntries, isOwner } from "../../../lib/content-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "little things I noticed · Cynthia 的桌面",
  description: "Small moments kept by the camera on Cynthia's desk.",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

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

      {entries.length ? (
        <section className="noticing-wall" aria-label="Things I noticed">
          {entries.map((entry, index) => (
            <article
              className={`noticed-entry noticed-entry-${(index % 8) + 1}${entry.images.length ? "" : " text-only-entry"}`}
              key={entry.id}
            >
              <span className="collection-fastener" aria-hidden="true" />
              {entry.images.length > 0 && (
                <div
                  className={`entry-photos${entry.images.length > 1 ? " photo-stack" : ""}`}
                >
                  {entry.images.map((image) => (
                    <figure className="memory-photo" key={image.id}>
                      <img
                        src={`/media/${image.objectKey}`}
                        alt={image.altText || entry.title || "A small noticed moment"}
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
        <section className="empty-noticing-wall">
          <span className="empty-photo-window" aria-hidden="true" />
          <p>nothing has been tucked behind this photo yet.</p>
          <small>the camera is waiting.</small>
        </section>
      )}

      {owner && (
        <a
          className="owner-add-polaroid"
          href="/studio/little-things-i-noticed"
          target="_top"
        >
          <span aria-hidden="true">＋</span>
          add another noticing
        </a>
      )}
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}
