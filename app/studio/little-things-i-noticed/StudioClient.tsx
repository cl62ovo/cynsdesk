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
  workbenchFields?: boolean;
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
  workbenchFields = false,
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
        <EntryFields
          listening={listeningFields}
          reading={readingFields}
          thoughts={thoughtFields}
          workbench={workbenchFields}
        />
        <label className="photo-pocket">
          <span>
            {workbenchFields
              ? "leave photos, screenshots, sketches, or references here"
              : thoughtFields
              ? "tape up an image or a few little pictures"
              : listeningFields || readingFields
                ? "drop a cover / image here"
                : "drop up to 6 photos here"}
          </span>
          <small>up to 10 · JPG, PNG, GIF or WebP · 8 MB each</small>
          <input type="file" name="photos" accept="image/*" multiple />
        </label>
        {workbenchFields && <DocumentPocket />}
        <PublishField />
        <button className="studio-save" type="submit" disabled={busy}>
          {busy ? "tucking it away…" : "keep this one"}
        </button>
      </form>

      {message && <p className="studio-message" role="status">{message}</p>}

      <section className="studio-existing" aria-label="Edit existing entries">
        <h2>{collectionLabel}</h2>
        {entries.length === 0 ? (
          <div className="studio-empty-existing" role="status">
            <strong>nothing saved yet — there is nothing to delete</strong>
            <p>
              {workbenchFields
                ? "The objects previously shown on the workbench were sample placeholders. They have now been removed."
                : `Add your first ${itemNoun} above; saved items will appear here with edit and delete controls.`}
            </p>
          </div>
        ) : (
          <>
          {entries.map((entry) => (
            <details className="edit-scrap" id={`entry-${entry.id}`} key={entry.id}>
              <summary>{entry.title || entry.shortText || `an untitled ${itemNoun}`}</summary>
              <form onSubmit={(event) => save(event, "PATCH")}>
                <input type="hidden" name="entryId" value={entry.id} />
                <EntryFields
                  entry={entry}
                  listening={listeningFields}
                  reading={readingFields}
                  thoughts={thoughtFields}
                  workbench={workbenchFields}
                />
                {workbenchFields && (
                  <>
                    <label className="photo-pocket add-more-photos">
                      <span>add more traces of trying</span>
                      <small>new photos will join the ones already here</small>
                      <input type="file" name="photos" accept="image/*" multiple />
                    </label>
                    <DocumentPocket compact />
                  </>
                )}
                {entry.images.length > 0 && (
                  <p className="kept-photos-note">
                    {entry.images.length} photo{entry.images.length === 1 ? " is" : "s are"} already tucked here.
                  </p>
                )}
                {entry.files.length > 0 && (
                  <p className="kept-photos-note">
                    {entry.files.length} PDF {entry.files.length === 1 ? "is" : "files are"} already clipped here.
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
                    {workbenchFields ? "delete this attempt · 删除" : `remove this ${itemNoun}`}
                  </button>
                </div>
              </form>
            </details>
          ))}
          </>
        )}
      </section>
    </>
  );
}

function DocumentPocket({ compact = false }: { compact?: boolean }) {
  return (
    <label className={`photo-pocket document-pocket${compact ? " compact-document-pocket" : ""}`}>
      <span>{compact ? "clip on more PDF notes / ebooks" : "clip on PDF files or ebooks"}</span>
      <small>up to 5 at a time · PDF only · 25 MB each</small>
      <input type="file" name="documents" accept="application/pdf,.pdf" multiple />
    </label>
  );
}

function EntryFields({
  entry,
  listening = false,
  reading = false,
  thoughts = false,
  workbench = false,
}: {
  entry?: ContentEntry;
  listening?: boolean;
  reading?: boolean;
  thoughts?: boolean;
  workbench?: boolean;
}) {
  if (workbench) {
    const extras = parseExtras(entry?.extraData);
    return (
      <div className="studio-fields workbench-fields">
        <label>
          <span>where is it now?</span>
          <select name="contentType" defaultValue={entry?.contentType ?? "idea"}>
            <option value="idea">a tiny idea · maybe someday</option>
            <option value="trying">currently trying</option>
            <option value="tried">tried it · whatever happened</option>
          </select>
        </label>
        <label>
          <span>what kind of mess? <i>optional</i></span>
          <select name="workbenchKind" defaultValue={extras.workbenchKind ?? "random"}>
            <option value="random">whatever this is</option>
            <option value="coding">coding / web / AI</option>
            <option value="sewing">sewing / fabric</option>
            <option value="embroidery">embroidery</option>
            <option value="drawing">drawing / sketching</option>
            <option value="cooking">cooking</option>
            <option value="craft">craft / making</option>
          </select>
        </label>
        <label>
          <span>date <i>optional</i></span>
          <input type="date" name="entryDate" defaultValue={entry?.entryDate ?? ""} />
        </label>
        <label>
          <span>current status <i>anything goes</i></span>
          <input name="creator" defaultValue={entry?.creator ?? ""} placeholder="still figuring it out / ???" maxLength={180} />
        </label>
        <label className="field-wide">
          <span>what are you trying?</span>
          <input name="title" defaultValue={entry?.title ?? ""} placeholder="I tried making…" maxLength={180} />
        </label>
        <label className="field-wide">
          <span>the first spark / quick version <i>worth keeping as it grows</i></span>
          <textarea name="shortText" defaultValue={entry?.shortText ?? ""} rows={3} maxLength={1200} />
        </label>
        <label className="field-wide">
          <span>why did this seem interesting? <i>optional</i></span>
          <textarea name="why" defaultValue={extras.why ?? ""} rows={3} maxLength={1500} />
        </label>
        <label>
          <span>materials / pieces I have <i>optional</i></span>
          <textarea name="materialsHave" defaultValue={extras.materialsHave ?? ""} rows={4} />
        </label>
        <label>
          <span>things I still need <i>optional</i></span>
          <textarea name="materialsNeed" defaultValue={extras.materialsNeed ?? ""} rows={4} />
        </label>
        <label className="field-wide">
          <span>need to figure out <i>optional</i></span>
          <textarea name="figuringOut" defaultValue={extras.figuringOut ?? ""} rows={3} />
        </label>
        <label className="field-wide">
          <span>attempts / versions <i>failed versions welcome</i></span>
          <textarea name="attempts" defaultValue={extras.attempts ?? ""} rows={7} placeholder={'attempt #01 — I thought this would work. it did not.\n\nattempt #02 — slightly less terrible.'} />
        </label>
        <label className="field-wide">
          <span>process / messy workbench notes <i>optional</i></span>
          <textarea name="longText" defaultValue={entry?.longText ?? ""} rows={7} />
        </label>
        <label className="field-wide">
          <span>next, maybe… <i>optional</i></span>
          <textarea name="nextSteps" defaultValue={extras.nextSteps ?? ""} rows={3} />
        </label>
        <label className="field-wide">
          <span>thoughts afterward / what I learned <i>optional</i></span>
          <textarea name="reflection" defaultValue={extras.reflection ?? ""} rows={4} />
        </label>
        <label className="field-wide">
          <span>note to future me <i>optional</i></span>
          <textarea name="note" defaultValue={entry?.note ?? ""} rows={3} maxLength={1200} />
        </label>
        <label className="field-wide">
          <span>one main link <i>optional</i></span>
          <input type="url" name="externalUrl" defaultValue={entry?.externalUrl ?? ""} placeholder="https://…" maxLength={1000} />
        </label>
        <label className="field-wide">
          <span>more reference links <i>one per line · optional</i></span>
          <textarea name="referenceLinks" defaultValue={extras.referenceLinks ?? ""} rows={4} placeholder="https://…" />
        </label>
      </div>
    );
  }

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

function parseExtras(value: string | null | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}

function PublishField({ checked = true }: { checked?: boolean }) {
  return (
    <label className="publish-check">
      <input type="checkbox" name="isPublished" defaultChecked={checked} />
      let visitors see this one
    </label>
  );
}
