"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import type { ContentEntry } from "../../../lib/content-store";

type Props = {
  entries: ContentEntry[];
  owner: boolean;
};

type WallThought = ContentEntry & { starter?: boolean };

const starterThoughts: WallThought[] = [
  starter("starter-questions", "I don’t have all the answers.", "just a lot of questions."),
  starter("starter-sense", "what if one day everything makes sense?"),
  starter("starter-walk", "sometimes a walk clears more than a full night of overthinking"),
  starter("starter-moon", "the moon looked insanely pretty tonight", "I almost forgot to look up."),
  starter("starter-understand", "what if I’m not trying to be understood, but to understand?"),
  starter("starter-economics", "I should learn more about behavioral economics"),
  starter("starter-world", "the world is loud, but there are still tiny moments that matter."),
  starter("starter-soft", "today: be a little softer"),
  starter("starter-change", "note to self: you’re allowed to change."),
];

export default function ThoughtsWall({ entries, owner }: Props) {
  const [thoughts, setThoughts] = useState<WallThought[]>(entries);
  const [selected, setSelected] = useState<WallThought | null>(null);
  const [arranging, setArranging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState("");
  const visibleThoughts = useMemo(
    () => (thoughts.length ? thoughts : starterThoughts),
    [thoughts],
  );

  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("thought-is-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("thought-is-open");
    };
  }, [selected]);

  async function keepOrder(next: WallThought[]) {
    setThoughts(next);
    setSaveState("pinning…");
    const response = await fetch("/api/sessions/things-stuck-in-my-head/entries", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entryIds: next.map((thought) => thought.id) }),
    });
    setSaveState(response.ok ? "wall order kept ✓" : "the pins slipped — try again");
  }

  function moveThought(id: string, direction: -1 | 1) {
    const from = thoughts.findIndex((thought) => thought.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= thoughts.length) return;
    const next = [...thoughts];
    [next[from], next[to]] = [next[to], next[from]];
    void keepOrder(next);
  }

  function dropThought(event: DragEvent<HTMLElement>, targetId: string) {
    event.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const from = thoughts.findIndex((thought) => thought.id === draggedId);
    const to = thoughts.findIndex((thought) => thought.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...thoughts];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraggedId(null);
    void keepOrder(next);
  }

  return (
    <main className="thought-room">
      <span className="thought-wall-grain" aria-hidden="true" />
      <header className="thought-heading">
        <a className="thought-back" href="/" target="_top">← back to the desk</a>
        <div className="thought-title-paper">
          <span className="title-tape title-tape-left" aria-hidden="true" />
          <span className="title-tape title-tape-right" aria-hidden="true" />
          <p>little scraps I unfolded and kept</p>
          <h1>things stuck<br />in my head</h1>
          <span className="thought-cloud" aria-hidden="true">◌</span>
        </div>
        {owner && entries.length > 1 && (
          <button
            className="arrange-wall"
            type="button"
            aria-pressed={arranging}
            onClick={() => {
              setArranging((value) => !value);
              setSaveState("");
            }}
          >
            {arranging ? "done pinning" : "rearrange the wall"}
          </button>
        )}
        {saveState && <span className="arrange-status" role="status">{saveState}</span>}
      </header>

      <section className={`thought-collage${arranging ? " is-arranging" : ""}`} aria-label="Thoughts pinned to the wall">
        {visibleThoughts.map((thought, index) => {
          const look = paperLook(thought.id, index);
          return (
            <article
              className={`thought-scrap thought-slot-${(index % 12) + 1} paper-${look.paper} fastener-${look.fastener}${thought.images.length ? " has-thought-images" : ""}${thought.starter ? " starter-thought" : ""}`}
              draggable={arranging && !thought.starter}
              key={thought.id}
              onDragStart={() => setDraggedId(thought.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(event) => arranging && event.preventDefault()}
              onDrop={(event) => dropThought(event, thought.id)}
              style={{ "--paper-turn": `${look.rotation}deg` } as CSSProperties}
            >
              <span className="thought-fastener" aria-hidden="true" />
              <button
                className="thought-pickup"
                type="button"
                onClick={() => !arranging && setSelected(thought)}
                aria-label={arranging ? "Thought ready to move" : `Read ${thought.title || thought.shortText || "this thought"}`}
              >
                {thought.images.length > 0 && (
                  <span className={`thought-image-stack${thought.images.length > 1 ? " has-stack" : ""}`}>
                    {thought.images.slice(0, 3).map((image) => (
                      <span className="thought-polaroid" key={image.id}>
                        <img src={`/media/${image.objectKey}`} alt={image.altText || thought.title || "A picture kept with this thought"} />
                      </span>
                    ))}
                  </span>
                )}
                <span className="thought-writing">
                  {thought.entryDate && <time dateTime={thought.entryDate}>{formatDate(thought.entryDate)}</time>}
                  {thought.title && <strong>{thought.title}</strong>}
                  {thought.shortText && <span>{thought.shortText}</span>}
                  {!thought.shortText && thought.longText && <span>{thought.longText}</span>}
                  {thought.note && <small>{thought.note}</small>}
                </span>
                <span className="thought-doodle" aria-hidden="true">{doodleFor(index)}</span>
              </button>
              {arranging && !thought.starter && (
                <span className="thought-move-tools">
                  <button type="button" onClick={() => moveThought(thought.id, -1)} disabled={index === 0} aria-label="Move thought earlier">←</button>
                  <span>drag me</span>
                  <button type="button" onClick={() => moveThought(thought.id, 1)} disabled={index === thoughts.length - 1} aria-label="Move thought later">→</button>
                </span>
              )}
            </article>
          );
        })}

        {owner && (
          <a className="blank-thought" href="/studio/things-stuck-in-my-head" target="_top">
            <span aria-hidden="true">＋</span>
            what&apos;s stuck in<br />your head?
            <small>write something…</small>
          </a>
        )}
      </section>

      {!entries.length && (
        <p className="starter-whisper">a few starter scraps, until your own thoughts move in</p>
      )}

      {selected && (
        <div className="thought-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <section className={`thought-detail paper-${paperLook(selected.id, 0).paper}`} role="dialog" aria-modal="true" aria-labelledby="thought-detail-title">
            <span className="detail-pin" aria-hidden="true" />
            {selected.images.length > 0 && (
              <div className="detail-thought-images">
                {selected.images.map((image) => (
                  <figure key={image.id}>
                    <img src={`/media/${image.objectKey}`} alt={image.altText || selected.title || "A picture kept with this thought"} />
                    {image.caption && <figcaption>{image.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
            <div className="detail-thought-writing">
              {selected.entryDate && <time dateTime={selected.entryDate}>{formatDate(selected.entryDate)}</time>}
              <h2 id="thought-detail-title">{selected.title || selected.shortText || "an untitled thought"}</h2>
              {selected.title && selected.shortText && <p>{selected.shortText}</p>}
              {selected.longText && <p className="thought-longer">{selected.longText}</p>}
              {selected.note && <small>↳ {selected.note}</small>}
              <button type="button" onClick={() => setSelected(null)}>put it back</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function starter(id: string, title: string, shortText?: string): WallThought {
  return {
    id,
    sessionSlug: "things-stuck-in-my-head",
    title,
    entryDate: null,
    shortText: shortText ?? null,
    longText: null,
    note: null,
    contentType: null,
    creator: null,
    externalUrl: null,
    isPublished: true,
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
    images: [],
    starter: true,
  };
}

function paperLook(id: string, index: number) {
  let hash = 0;
  for (let cursor = 0; cursor < id.length; cursor += 1) {
    hash = (hash * 31 + id.charCodeAt(cursor)) >>> 0;
  }
  return {
    paper: ((hash + index) % 6) + 1,
    fastener: ((hash >>> 3) % 4) + 1,
    rotation: (((hash >>> 5) % 45) - 22) / 10,
  };
}

function doodleFor(index: number) {
  return ["♡", "?", "☾", "✦", "〰", "☁", "↝", "♪"][index % 8];
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date);
}
