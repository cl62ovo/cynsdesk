"use client";

import { useEffect, useState } from "react";
import type { ContentEntry } from "../../../lib/content-store";

type Props = { entries: ContentEntry[]; owner: boolean; showStudioDoor: boolean };
type WorkbenchExtra = Record<string, string>;

export default function TinkeringWorkbench({ entries, owner, showStudioDoor }: Props) {
  const [selected, setSelected] = useState<ContentEntry | null>(null);
  const pieces = entries;

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", close);
    document.body.classList.add("bench-piece-open");
    return () => {
      document.removeEventListener("keydown", close);
      document.body.classList.remove("bench-piece-open");
    };
  }, [selected]);

  return (
    <main className="tinkering-room">
      <span className="bench-wall" aria-hidden="true" />
      <header className="bench-heading">
        <a className="bench-back" href="/" target="_top">← back to the desk</a>
        <div className="bench-heading-note">
          <span aria-hidden="true" />
          <p>curiosity lives here</p>
          <h1>things I tried</h1>
          <small>some worked · some didn&apos;t · some are still becoming</small>
        </div>
        <p className="just-here-note">Cynthia was just here.<br />she&apos;s probably coming back.</p>
        {showStudioDoor && (
          <a className="bench-edit-door" href="/studio/things-i-tried" target="_top">
            {owner ? "edit / add things →" : "open the private editor →"}
          </a>
        )}
      </header>

      <section className="tinkering-bench" aria-label="Cynthia's tinkering workbench">
        <span className="bench-pencil" aria-hidden="true" />
        <span className="loose-thread" aria-hidden="true" />
        <span className="bench-scissors" aria-hidden="true">✂</span>
        <span className="bench-tape-roll" aria-hidden="true" />

        {pieces.map((entry, index) => {
          const extras = parseExtras(entry.extraData);
          const stage = stageOf(entry.contentType);
          const kind = kindOf(extras.workbenchKind);
          return (
            <article
              className={`bench-piece bench-piece-${(index % 10) + 1} stage-${stage} kind-${kind}${entry.images.length ? " with-evidence" : ""}`}
              key={entry.id}
            >
              <button type="button" className="bench-object" onClick={() => setSelected(entry)}>
                <span className="object-visual" aria-hidden="true">
                  <span className="object-part object-part-one" />
                  <span className="object-part object-part-two" />
                  <span className="object-part object-part-three" />
                </span>
                {entry.images.length > 0 && (
                  <span className="bench-photo-pile">
                    {entry.images.slice(0, 3).map((image) => (
                      <span className="bench-photo" key={image.id}>
                        <img src={`/media/${image.objectKey}`} alt={image.altText || entry.title || "A trace of this experiment"} />
                      </span>
                    ))}
                  </span>
                )}
                {entry.files.length > 0 && (
                  <span className="bench-pdf-clip">
                    PDF<br /><small>{entry.files.length} clipped</small>
                  </span>
                )}
                {(entry.externalUrl || extras.referenceLinks) && (
                  <span className="bench-link-clip">www ↗</span>
                )}
                <span className="bench-label">
                  <small>{stageLabel(stage)}</small>
                  <strong>{entry.title || entry.shortText || "an unnamed experiment"}</strong>
                  {entry.shortText && entry.title && <span>{entry.shortText}</span>}
                </span>
                {entry.creator && <em className="status-scrap">{entry.creator}</em>}
              </button>
            </article>
          );
        })}

        {!entries.length && (
          <div className="empty-workbench-sheet">
            <span aria-hidden="true">✦</span>
            <strong>nothing is saved here yet</strong>
            <small>your first real attempt will land on this bench</small>
          </div>
        )}

        {showStudioDoor && (
          <a className="try-something-sheet" href="/studio/things-i-tried" target="_top">
            <span aria-hidden="true">✎</span>
            try something?
            <small>a spark is enough</small>
          </a>
        )}

        <aside className="bench-scrap-basket" aria-label="A pile of experiments that did not work">
          <span aria-hidden="true">⌁</span>
          <p>not everything<br />has to work.</p>
        </aside>
      </section>

      {selected && (
        <WorkbenchDetail entry={selected} owner={owner} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}

function WorkbenchDetail({ entry, owner, onClose }: { entry: ContentEntry; owner: boolean; onClose: () => void }) {
  const extras = parseExtras(entry.extraData);
  const stage = stageOf(entry.contentType);
  const links = referenceLinks(extras.referenceLinks, entry.externalUrl);
  const notes = [
    ["why I tried it", extras.why],
    ["pieces already here", extras.materialsHave],
    ["things I still need", extras.materialsNeed],
    ["need to figure out", extras.figuringOut],
    ["next, maybe…", extras.nextSteps],
    ["thoughts afterward", extras.reflection],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <div className="bench-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`bench-detail detail-stage-${stage}`} role="dialog" aria-modal="true" aria-labelledby="bench-detail-title">
        <span className="folder-tab" aria-hidden="true">still keeping this</span>
        <header>
          <p>{stageLabel(stage)}</p>
          <h2 id="bench-detail-title">{entry.title || entry.shortText || "an unnamed experiment"}</h2>
          {entry.creator && <em>{entry.creator}</em>}
          <small>
            {entry.entryDate ? formatDate(entry.entryDate) : `first left here ${formatTimestamp(entry.createdAt)}`}
            {entry.updatedAt > entry.createdAt && ` · last touched ${formatTimestamp(entry.updatedAt)}`}
          </small>
        </header>

        {entry.shortText && entry.title && <p className="original-spark"><span>the first spark</span>{entry.shortText}</p>}

        {entry.images.length > 0 && (
          <div className="bench-evidence-spread">
            {entry.images.map((image, index) => (
              <figure key={image.id} style={{ "--evidence-turn": `${((index % 5) - 2) * 1.3}deg` } as React.CSSProperties}>
                <img src={`/media/${image.objectKey}`} alt={image.altText || entry.title || "A trace of this experiment"} />
                {image.caption && <figcaption>{image.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}

        {notes.length > 0 && (
          <div className="project-scraps">
            {notes.map(([label, value]) => (
              <section key={label}>
                <h3>{label}</h3>
                <p>{value}</p>
              </section>
            ))}
          </div>
        )}

        {extras.attempts && (
          <section className="attempt-pages">
            <h3>attempts / versions</h3>
            <p>{extras.attempts}</p>
          </section>
        )}

        {entry.longText && (
          <section className="messy-process">
            <h3>messy workbench notes</h3>
            <p>{entry.longText}</p>
          </section>
        )}

        {entry.note && <p className="future-me-note"><span>note to future me</span>{entry.note}</p>}

        {links.length > 0 && (
          <nav className="reference-scraps" aria-label="References and useful links">
            {links.map((link, index) => <a href={link} target="_blank" rel="noreferrer" key={link}>reference {index + 1} ↗</a>)}
          </nav>
        )}

        {entry.files.length > 0 && (
          <section className="pdf-scraps" aria-label="PDF files and ebooks">
            <h3>papers / ebooks clipped here</h3>
            <div>
              {entry.files.map((file) => (
                <a href={`/media/${file.objectKey}`} target="_blank" rel="noreferrer" key={file.id}>
                  <span aria-hidden="true">PDF</span>
                  {file.originalName}
                  <small>open the pages ↗</small>
                </a>
              ))}
            </div>
          </section>
        )}

        {owner && (
          <a className="edit-this-attempt" href={`/studio/things-i-tried#entry-${entry.id}`} target="_top">
            edit this attempt ✎
          </a>
        )}

        <button className="put-project-back" type="button" onClick={onClose}>leave it on the bench</button>
      </section>
    </div>
  );
}

function parseExtras(value: string | null): WorkbenchExtra {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((item): item is [string, string] => typeof item[1] === "string"));
  } catch {
    return {};
  }
}

function stageOf(value: string | null) {
  return value === "trying" || value === "tried" ? value : "idea";
}

function kindOf(value: string | undefined) {
  return ["coding", "sewing", "embroidery", "drawing", "cooking", "craft"].includes(value || "") ? value : "random";
}

function stageLabel(stage: ReturnType<typeof stageOf>) {
  if (stage === "trying") return "currently trying";
  if (stage === "tried") return "I tried this";
  return "maybe I should try this?";
}

function referenceLinks(value: string | undefined, primary: string | null) {
  return [primary, ...(value?.split(/\s+/) ?? [])]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, all) => all.indexOf(item) === index)
    .filter((item) => {
      try {
        const url = new URL(item);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    });
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function formatTimestamp(value: number) {
  if (!value) return "sometime";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}
