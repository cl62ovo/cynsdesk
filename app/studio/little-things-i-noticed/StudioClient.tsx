"use client";

import { useState, type FormEvent } from "react";
import type { ContentEntry } from "../../../lib/content-store";

type Props = {
  entries: ContentEntry[];
  canClaim?: boolean;
};

export default function StudioClient({ entries, canClaim = false }: Props) {
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
    const response = await fetch("/api/sessions/little-things-i-noticed/entries", {
      method,
      body: new FormData(form),
    });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(result.error ?? "That note would not stay put.");
    if (method === "POST") form.reset();
    setMessage(method === "POST" ? "tucked safely behind the camera ✓" : "changes kept ✓");
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
        <p className="studio-number">a fresh little noticing</p>
        <EntryFields />
        <label className="photo-pocket">
          <span>drop up to 6 photos here</span>
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
          <h2>things already in the camera</h2>
          {entries.map((entry) => (
            <details className="edit-scrap" key={entry.id}>
              <summary>{entry.title || entry.shortText || "an untitled noticing"}</summary>
              <form onSubmit={(event) => save(event, "PATCH")}>
                <input type="hidden" name="entryId" value={entry.id} />
                <EntryFields entry={entry} />
                {entry.images.length > 0 && (
                  <p className="kept-photos-note">
                    {entry.images.length} photo{entry.images.length === 1 ? " is" : "s are"} already tucked here.
                  </p>
                )}
                <PublishField checked={entry.isPublished} />
                <button className="studio-save" type="submit" disabled={busy}>
                  keep these changes
                </button>
              </form>
            </details>
          ))}
        </section>
      )}
    </>
  );
}

function EntryFields({ entry }: { entry?: ContentEntry }) {
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
