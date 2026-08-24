"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { ContentEntry } from "../../lib/content-store";

type RoomKind = "camera" | "made" | "drink" | "forget";

type Props = {
  entries: ContentEntry[];
  room: RoomKind;
  roomName: string;
  owner: boolean;
  studioHref: string;
  addLabel: string;
  emptyText: string;
  emptyHint: string;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export default function PhysicalCollection({ entries, room, roomName, owner, studioHref, addLabel, emptyText, emptyHint }: Props) {
  const [selected, setSelected] = useState<ContentEntry | null>(null);

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("physical-piece-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("physical-piece-open");
    };
  }, [selected]);

  return (
    <>
      {entries.length ? (
        <section className="noticing-wall session-collage" aria-label={roomName}>
          {entries.map((entry, index) => (
            <article className={`noticed-entry noticed-entry-${(index % 8) + 1}${entry.images.length ? "" : " text-only-entry"}`} key={entry.id}>
              <span className="collection-fastener" aria-hidden="true" />
              {entry.images.length > 0 && (
                <div className={`entry-photos${entry.images.length > 1 ? " photo-stack" : ""}`}>
                  {entry.images.map((image) => (
                    <figure className="memory-photo" key={image.id}>
                      <img src={`/media/${image.objectKey}`} alt={image.altText || entry.title || `A kept item from ${roomName}`} />
                      {image.caption && <figcaption>{image.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              )}
              <div className="entry-note">
                <span className="entry-tape" aria-hidden="true" />
                {entry.entryDate && <time dateTime={entry.entryDate}>{formatDate(entry.entryDate)}</time>}
                {entry.title && <h2>{entry.title}</h2>}
                {entry.shortText && <p className="entry-short">{entry.shortText}</p>}
                {entry.longText && <p className="entry-long">{entry.longText}</p>}
                {entry.note && <p className="margin-note">↳ {entry.note}</p>}
              </div>
              <button
                className="physical-entry-pickup"
                type="button"
                aria-haspopup="dialog"
                aria-label={`${pickupLabel(room)} ${entry.title || entry.shortText || "this kept thing"}`}
                onClick={() => setSelected(entry)}
              />
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-noticing-wall session-empty-slot">
          <span className="empty-photo-window" aria-hidden="true" />
          <p>{emptyText}</p>
          <small>{emptyHint}</small>
        </section>
      )}

      {owner && (
        <a className="owner-add-polaroid" href={studioHref} target="_top">
          <span aria-hidden="true">＋</span>
          {addLabel}
        </a>
      )}

      {selected && <PhysicalDetail entry={selected} room={room} onClose={() => setSelected(null)} />}
    </>
  );
}

function PhysicalDetail({ entry, room, onClose }: { entry: ContentEntry; room: RoomKind; onClose: () => void }) {
  const externalUrl = safeExternalUrl(entry.externalUrl);
  return (
    <div className={`physical-detail-backdrop detail-backdrop-${room}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`physical-detail physical-detail-${room}${entry.images.length ? " has-detail-photos" : ""}`} role="dialog" aria-modal="true" aria-labelledby="physical-detail-title">
        <span className="physical-detail-fastener" aria-hidden="true" />
        {entry.images.length > 0 && (
          <div className="physical-detail-photos">
            {entry.images.map((image, index) => (
              <figure style={{ "--detail-turn": `${((index % 5) - 2) * 1.15}deg` } as CSSProperties} key={image.id}>
                <img src={`/media/${image.objectKey}`} alt={image.altText || entry.title || "A kept photograph"} />
                {image.caption && <figcaption>{image.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
        <div className="physical-detail-writing">
          <p className="physical-detail-kind">{detailKind(room)}</p>
          {entry.entryDate && <time dateTime={entry.entryDate}>{formatDate(entry.entryDate)}</time>}
          <h2 id="physical-detail-title">{entry.title || entry.shortText || "an unnamed little thing"}</h2>
          {entry.creator && <p className="physical-detail-creator">by {entry.creator}</p>}
          {entry.title && entry.shortText && <p className="physical-detail-short">{entry.shortText}</p>}
          {entry.longText && <p className="physical-detail-long">{entry.longText}</p>}
          {entry.note && <aside><small>left in the margin</small><p>{entry.note}</p></aside>}
          {externalUrl && <a href={externalUrl} target="_blank" rel="noreferrer">follow the little link ↗</a>}
          {entry.files.length > 0 && <div className="physical-detail-files">{entry.files.map((file) => <a href={`/media/${file.objectKey}`} target="_blank" rel="noreferrer" key={file.id}>{file.originalName} ↗</a>)}</div>}
          <button type="button" onClick={onClose}>{closeLabel(room)}</button>
        </div>
      </section>
    </div>
  );
}

function pickupLabel(room: RoomKind) {
  if (room === "camera") return "Bring closer";
  if (room === "made") return "Pick up";
  if (room === "drink") return "Read the café note for";
  return "Take from the drawer";
}

function detailKind(room: RoomKind) {
  if (room === "camera") return "a closer look";
  if (room === "made") return "from the making table";
  if (room === "drink") return "from the café corner";
  return "from the memory drawer";
}

function closeLabel(room: RoomKind) {
  if (room === "camera") return "back to the wall";
  if (room === "made") return "leave it on the table";
  if (room === "drink") return "set the note back";
  return "tuck it away";
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
