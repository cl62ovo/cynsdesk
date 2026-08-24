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

export default function ListeningWall({ entries, owner }: Props) {
  const [selected, setSelected] = useState<ContentEntry | null>(null);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  function surpriseMe() {
    if (!entries.length) return;
    setSelected(entries[Math.floor(Math.random() * entries.length)]);
  }

  return (
    <>
      <section className="listening-wall" aria-label="Things on the listening wall">
        <span className="wall-cable" aria-hidden="true" />
        {entries.map((entry, index) => (
          <ListeningPiece
            entry={entry}
            index={index}
            key={entry.id}
            onPick={() => setSelected(entry)}
          />
        ))}

        {owner && (
          <a className="listening-add-piece" href="/studio/things-i-listened-to" target="_top">
            <span aria-hidden="true" />
            something new? ♫
          </a>
        )}
      </section>

      {entries.length > 0 && (
        <button className="tiny-record-player" type="button" onClick={surpriseMe}>
          <span className="player-disc" aria-hidden="true" />
          <span className="player-arm" aria-hidden="true" />
          play me something
        </button>
      )}

      {selected && (
        <ListeningDetail entry={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function ListeningPiece({
  entry,
  index,
  onPick,
}: {
  entry: ContentEntry;
  index: number;
  onPick: () => void;
}) {
  const kind = normalizeType(entry.contentType);
  const cover = entry.images[0];

  return (
    <button
      className={`listening-piece listening-${kind} listening-piece-${(index % 9) + 1}`}
      type="button"
      onClick={onPick}
      aria-label={`Pick up ${entry.title || "this listening item"}`}
    >
      {kind === "album" && (
        <span className="vinyl-sleeve">
          <Cover image={cover} title={entry.title} />
          <span className="vinyl-record" aria-hidden="true" />
        </span>
      )}

      {kind === "single" && (
        <span className="single-disc">
          <Cover image={cover} title={entry.title} />
          <span className="disc-hole" aria-hidden="true" />
        </span>
      )}

      {(kind === "podcast" || kind === "podcast-episode") && (
        <span className="podcast-paper">
          <span className="paper-pin" aria-hidden="true" />
          <Cover image={cover} title={entry.title} />
          <small>{kind === "podcast" ? "podcast show" : "one episode"}</small>
        </span>
      )}

      {kind === "other" && (
        <span className="audio-scrap">
          <Cover image={cover} title={entry.title} />
          <span aria-hidden="true">♪</span>
        </span>
      )}

      <span className="listening-label">
        <strong>{entry.title || "untitled sound"}</strong>
        {entry.creator && <small>{entry.creator}</small>}
        {entry.note && <em>{entry.note}</em>}
      </span>
    </button>
  );
}

function Cover({
  image,
  title,
}: {
  image: ContentEntry["images"][number] | undefined;
  title: string | null;
}) {
  return image ? (
    <img src={`/media/${image.objectKey}`} alt={image.altText || title || "Listening cover"} />
  ) : (
    <span className="blank-cover" aria-hidden="true">♫</span>
  );
}

function ListeningDetail({ entry, onClose }: { entry: ContentEntry; onClose: () => void }) {
  const cover = entry.images[0];
  const listeningUrl = safeExternalUrl(entry.externalUrl);
  const kind = normalizeType(entry.contentType);

  return (
    <div className="listening-detail-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className={`listening-detail detail-${kind}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="listening-detail-title"
      >
        <span className="detail-tape" aria-hidden="true" />
        <div className="detail-cover">
          <Cover image={cover} title={entry.title} />
        </div>
        <div className="detail-writing">
          <p className="detail-kind">{typeLabel(kind)}</p>
          <h2 id="listening-detail-title">{entry.title || "untitled sound"}</h2>
          {entry.creator && <p className="detail-creator">by {entry.creator}</p>}
          {entry.entryDate && (
            <time dateTime={entry.entryDate}>{formatDate(entry.entryDate)}</time>
          )}
          {entry.note && <p className="detail-note">“{entry.note}”</p>}
          {entry.longText && <p className="detail-long">{entry.longText}</p>}
          {listeningUrl && (
            <a href={listeningUrl} target="_blank" rel="noreferrer">♫ listen ↗</a>
          )}
          <button type="button" onClick={onClose}>put it back</button>
        </div>
      </section>
    </div>
  );
}

function normalizeType(value: string | null) {
  return ["album", "single", "podcast", "podcast-episode"].includes(value || "")
    ? (value as "album" | "single" | "podcast" | "podcast-episode")
    : "other";
}

function typeLabel(kind: ReturnType<typeof normalizeType>) {
  if (kind === "podcast-episode") return "podcast episode";
  if (kind === "podcast") return "podcast show";
  if (kind === "other") return "something I heard";
  return kind;
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
