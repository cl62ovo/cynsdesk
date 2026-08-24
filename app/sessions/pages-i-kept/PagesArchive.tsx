"use client";

import { useEffect, useState } from "react";
import type { ContentEntry } from "../../../lib/content-store";

type Props = {
  entries: ContentEntry[];
  owner: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default function PagesArchive({ entries, owner }: Props) {
  const [selected, setSelected] = useState<ContentEntry | null>(null);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  return (
    <>
      <section className="pages-archive" aria-label="Words and pages Cynthia kept">
        <span className="archive-pencil" aria-hidden="true" />
        <span className="archive-thread" aria-hidden="true" />

        {entries.map((entry, index) => (
          <KeptPiece
            entry={entry}
            index={index}
            key={entry.id}
            onPick={() => setSelected(entry)}
          />
        ))}

        {owner && (
          <a className="pages-add-sheet" href="/studio/pages-i-kept" target="_top">
            <span aria-hidden="true" />
            leave something here
          </a>
        )}
      </section>

      {selected && <PageDetail entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function KeptPiece({
  entry,
  index,
  onPick,
}: {
  entry: ContentEntry;
  index: number;
  onPick: () => void;
}) {
  const kind = normalizeType(entry.contentType);
  const image = entry.images[0];

  return (
    <button
      className={`kept-piece kept-${kind} kept-piece-${(index % 10) + 1}`}
      type="button"
      onClick={onPick}
      aria-label={`Pick up ${entry.title || "this kept page"}`}
    >
      {kind === "book" && (
        <span className="book-object">
          <span className="book-page-edges" aria-hidden="true" />
          {image ? (
            <img src={`/media/${image.objectKey}`} alt={image.altText || entry.title || "Book cover"} />
          ) : (
            <span className="book-blank-cover" aria-hidden="true">{entry.title || "a book"}</span>
          )}
          <span className="book-bookmark" aria-hidden="true" />
        </span>
      )}

      {kind === "article" && (
        <span className="folded-article">
          <span className="paperclip" aria-hidden="true" />
          {image && <img src={`/media/${image.objectKey}`} alt={image.altText || entry.title || "Article image"} />}
          <strong>{entry.title || "an article"}</strong>
          {entry.creator && <small>{entry.creator}</small>}
          {entry.longText && <em>{entry.longText}</em>}
        </span>
      )}

      {(kind === "line" || kind === "lyric") && (
        <span className={`tiny-writing tiny-${kind}`}>
          <span className="tiny-tape" aria-hidden="true" />
          <q>{entry.longText || entry.title || "a line I kept"}</q>
          {entry.creator && <small>— {entry.creator}</small>}
        </span>
      )}

      {kind === "passage" && (
        <span className="loose-passage">
          <span className="passage-fold" aria-hidden="true" />
          {entry.title && <strong>{entry.title}</strong>}
          {entry.longText && <q>{entry.longText}</q>}
          {entry.creator && <small>— {entry.creator}</small>}
        </span>
      )}

      {kind === "other" && (
        <span className="other-page-scrap">
          {image && <img src={`/media/${image.objectKey}`} alt={image.altText || entry.title || "Kept page"} />}
          <strong>{entry.title || "something written"}</strong>
          {entry.longText && <q>{entry.longText}</q>}
        </span>
      )}

      {entry.note && (
        <span className="archive-personal-note">
          <small>my note</small>
          {entry.note}
        </span>
      )}
    </button>
  );
}

function PageDetail({ entry, onClose }: { entry: ContentEntry; onClose: () => void }) {
  const kind = normalizeType(entry.contentType);
  const image = entry.images[0];
  const externalUrl = safeExternalUrl(entry.externalUrl);

  return (
    <div className="pages-detail-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className={`pages-detail pages-detail-${kind}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pages-detail-title"
      >
        <span className="detail-bookmark" aria-hidden="true" />
        <div className="pages-detail-source">
          {image && <img src={`/media/${image.objectKey}`} alt={image.altText || entry.title || "Reading image"} />}
          <p>{typeLabel(kind)}</p>
          <h2 id="pages-detail-title">{entry.title || fallbackTitle(kind)}</h2>
          {entry.creator && <h3>{entry.creator}</h3>}
          {entry.entryDate && <time dateTime={entry.entryDate}>{formatDate(entry.entryDate)}</time>}
        </div>

        <div className="pages-detail-reading">
          {entry.longText && (
            <div className="kept-original-words">
              <small>the words I kept</small>
              <blockquote>{entry.longText}</blockquote>
            </div>
          )}
          {entry.note && (
            <aside className="kept-my-thought">
              <small>my note</small>
              <p>{entry.note}</p>
            </aside>
          )}
          {externalUrl && (
            <a href={externalUrl} target="_blank" rel="noreferrer">read / find this ↗</a>
          )}
          <button type="button" onClick={onClose}>{closeLabel(kind)}</button>
        </div>
      </section>
    </div>
  );
}

function normalizeType(value: string | null) {
  return ["book", "article", "line", "lyric", "passage"].includes(value || "")
    ? (value as "book" | "article" | "line" | "lyric" | "passage")
    : "other";
}

function typeLabel(kind: ReturnType<typeof normalizeType>) {
  if (kind === "line") return "a line / quote";
  if (kind === "other") return "a piece of writing";
  return kind;
}

function fallbackTitle(kind: ReturnType<typeof normalizeType>) {
  if (kind === "book") return "an untitled book";
  if (kind === "article") return "an untitled article";
  return "some words I kept";
}

function closeLabel(kind: ReturnType<typeof normalizeType>) {
  if (kind === "book") return "close the book";
  if (kind === "article") return "fold it back";
  return "put it back";
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}
