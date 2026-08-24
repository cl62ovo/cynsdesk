"use client";

import { useState, type FormEvent } from "react";
import type { ContentEntry } from "../../../lib/content-store";

type Props = {
  entries: ContentEntry[];
  canClaim?: boolean;
  sessionSlug?: string;
  freshLabel?: string;
  collectionLabel?: string;
  itemNoun?: string;
  storageLabel?: string;
  listeningFields?: boolean;
  readingFields?: boolean;
  thoughtFields?: boolean;
};

export default function StudioClient({
  entries,
  canClaim = false,
  sessionSlug = "little-things-i-noticed",
  freshLabel = "a fresh little noticing",
  collectionLabel = "things already in the camera",
  itemNoun = "noticing",
  storageLabel = "the camera",
  listeningFields = false,
  readingFields = false,
  thoughtFields = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function claimDesk() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/studio/claim", { method: "POST" });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(result.error ?? "The claim did not work.");
    window.location.reload();
  }

  async function save(event: FormEvent<HTMLFormElement>, method: "POST" | "PATCH") {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const response = await fetch(`/api/sessions/${sessionSlug}/entries`, {
      method,
      body: new FormData(form),
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(result.error ?? "That note would not stay put.");
    if (method === "POST") form.reset();
    setMessage(method === "POST" ? `tucked safely inside ${storageLabel} ✓` : "changes kept ✓");
    window.location.reload();
  }

  async function remove(entry: ContentEntry) {
    const label = entry.title || entry.shortText || `this untitled ${itemNoun}`;
    if (!window.confirm(`Remove “${label}” and its photos for good?`)) return;

    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("entryId", entry.id);
    const response = await fetch(`/api/sessions/${sessionSlug}/entries`, {
      method: "DELETE",
      body: form,
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(result.error ?? `That ${itemNoun} would not come loose.`);
    setMessage(`removed from ${storageLabel} ✓`);
    window.location.reload();
  }

  if (canClaim) {
    return (
      <section className="claim-card">
        <span className="entry-tape" aria-hidden="true" />
        <h2>Is this your desk?</h2>
        <p>
          Claim it once with this signed-in account. From then on, only you can
          add or edit what is kept here.
        </p>
        <button type="button" onClick={claimDesk} disabled={busy}>
          {busy ? "claiming…" : "yes, make this my desk"}
        </button>
        {message && <p className="studio-message">{message}</p>}
      </section>
    );
  }

  return (
    <>
      <form className="studio-paper new-entry-form" onSubmit={(event) => save(event, "POST")}>
        <span className="entry-tape" aria-hidden="true" />
        <p className="studio-number">{freshLabel}</p>
        <EntryFields listening={listeningFields} reading={readingFields} thoughts={thoughtFields} />
        <label className="photo-pocket">
          <span>
            {thoughtFields
              ? "tape up an image or a few little pictures"
              : listeningFields || readingFields
                ? "drop a cover / image here"
                : "drop up to 6 photos here"}
          </span>
          <small>JPG, PNG, GIF or WebP · 8 MB each</small>
          <input type="file" name="photos" accept="image/*" multiple />
        </label>
        <PublishField />
        <button className="studio-save" type="submit" disabled={busy}>
          {busy ? "tucking it away…" : "keep this one"}
        </button>
      </form>

      {message && <p className="studio-message" role="status">{message}</p>}

      {entries.length > 0 && (
        <section className="studio-existing" aria-label="Edit existing entries">
          <h2>{collectionLabel}</h2>
          {entries.map((entry) => (
            <details className="edit-scrap" key={entry.id}>
              <summary>{entry.title || entry.shortText || `an untitled ${itemNoun}`}</summary>
              <form onSubmit={(event) => save(event, "PATCH")}>
                <input type="hidden" name="entryId" value={entry.id} />
                <EntryFields
                  entry={entry}
                  listening={listeningFields}
                  reading={readingFields}
                  thoughts={thoughtFields}
                />
                {entry.images.length > 0 && (
                  <p className="kept-photos-note">
                    {entry.images.length} photo{entry.images.length === 1 ? " is" : "s are"} already tucked here.
                  </p>
                )}
                <PublishField checked={entry.isPublished} />
                <div className="edit-actions">
                  <button className="studio-save" type="submit" disabled={busy}>
                    keep these changes
                  </button>
                  <button
                    className="studio-delete"
                    type="button"
                    disabled={busy}
                    onClick={() => remove(entry)}
                  >
                    remove this {itemNoun}
                  </button>
                </div>
              </form>
            </details>
          ))}
        </section>
      )}
    </>
  );
}

function EntryFields({
  entry,
  listening = false,
  reading = false,
  thoughts = false,
}: {
  entry?: ContentEntry;
  listening?: boolean;
  reading?: boolean;
  thoughts?: boolean;
}) {
  if (listening) {
    return (
      <div className="studio-fields listening-fields">
        <label>
          <span>type</span>
          <select name="contentType" defaultValue={entry?.contentType ?? "album"}>
            <option value="album">album</option>
            <option value="single">single</option>
            <option value="podcast">podcast show</option>
            <option value="podcast-episode">podcast episode</option>
            <option value="other">other audio</option>
          </select>
        </label>
        <label>
          <span>date <i>optional</i></span>
          <input type="date" name="entryDate" defaultValue={entry?.entryDate ?? ""} />
        </label>
        <label className="field-wide">
          <span>title</span>
          <input name="title" defaultValue={entry?.title ?? ""} maxLength={120} />
        </label>
        <label className="field-wide">
          <span>artist / creator <i>optional</i></span>
          <input name="creator" defaultValue={entry?.creator ?? ""} maxLength={160} />
        </label>
        <label className="field-wide">
          <span>my little note <i>optional</i></span>
          <textarea name="note" defaultValue={entry?.note ?? ""} rows={4} maxLength={500} />
        </label>
        <label className="field-wide">
          <span>listening URL <i>optional</i></span>
          <input
            type="url"
            name="externalUrl"
            defaultValue={entry?.externalUrl ?? ""}
            placeholder="https://…"
            maxLength={1000}
          />
        </label>
      </div>
    );
  }

  if (reading) {
    return (
      <div className="studio-fields reading-fields">
        <label>
          <span>loose type</span>
          <select name="contentType" defaultValue={entry?.contentType ?? "book"}>
            <option value="book">book</option>
            <option value="article">article</option>
            <option value="line">line / quote</option>
            <option value="lyric">lyric</option>
            <option value="passage">passage</option>
            <option value="other">other writing</option>
          </select>
        </label>
        <label>
          <span>date <i>optional</i></span>
          <input type="date" name="entryDate" defaultValue={entry?.entryDate ?? ""} />
        </label>
        <label className="field-wide">
          <span>title <i>optional</i></span>
          <input name="title" defaultValue={entry?.title ?? ""} maxLength={180} />
        </label>
        <label className="field-wide">
          <span>author / artist / source <i>optional</i></span>
          <input name="creator" defaultValue={entry?.creator ?? ""} maxLength={180} />
        </label>
        <label className="field-wide">
          <span>the words I kept <i>short or long</i></span>
          <textarea name="longText" defaultValue={entry?.longText ?? ""} rows={8} />
        </label>
        <label className="field-wide">
          <span>my note / thought <i>optional</i></span>
          <textarea name="note" defaultValue={entry?.note ?? ""} rows={5} maxLength={2000} />
        </label>
        <label className="field-wide">
          <span>external link <i>optional</i></span>
          <input
            type="url"
            name="externalUrl"
            defaultValue={entry?.externalUrl ?? ""}
            placeholder="https://…"
            maxLength={1000}
          />
        </label>
      </div>
    );
  }

  if (thoughts) {
    return (
      <div className="studio-fields thought-fields">
        <label>
          <span>date <i>optional</i></span>
          <input type="date" name="entryDate" defaultValue={entry?.entryDate ?? ""} />
        </label>
        <label>
          <span>little heading <i>optional</i></span>
          <input name="title" defaultValue={entry?.title ?? ""} maxLength={120} />
        </label>
        <label className="field-wide">
          <span>what&apos;s stuck in your head?</span>
          <textarea name="shortText" defaultValue={entry?.shortText ?? ""} rows={5} maxLength={1200} />
        </label>
        <label className="field-wide">
          <span>the longer version <i>optional</i></span>
          <textarea name="longText" defaultValue={entry?.longText ?? ""} rows={7} maxLength={5000} />
        </label>
        <label className="field-wide">
          <span>tiny caption / afterthought <i>optional</i></span>
          <input name="note" defaultValue={entry?.note ?? ""} maxLength={280} />
        </label>
      </div>
    );
  }

  return (
    <div className="studio-fields">
      <label>
        <span>title <i>optional</i></span>
        <input name="title" defaultValue={entry?.title ?? ""} maxLength={120} />
      </label>
      <label>
        <span>date <i>optional</i></span>
        <input type="date" name="entryDate" defaultValue={entry?.entryDate ?? ""} />
      </label>
      <label className="field-wide">
        <span>a quick line <i>optional</i></span>
        <input name="shortText" defaultValue={entry?.shortText ?? ""} maxLength={280} />
      </label>
      <label className="field-wide">
        <span>the longer version <i>optional</i></span>
        <textarea name="longText" defaultValue={entry?.longText ?? ""} rows={6} />
      </label>
      <label className="field-wide">
        <span>tiny caption / note <i>optional</i></span>
        <input name="note" defaultValue={entry?.note ?? ""} maxLength={240} />
      </label>
    </div>
  );
}

function PublishField({ checked = true }: { checked?: boolean }) {
  return (
    <label className="publish-check">
      <input type="checkbox" name="isPublished" defaultChecked={checked} />
      let visitors see this one
    </label>
  );
}
