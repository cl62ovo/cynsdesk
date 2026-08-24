import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  createEntry,
  isOwner,
  updateEntry,
  type EntryFields,
} from "../../../../../lib/content-store";
import { getSession } from "../../../../../lib/sessions";

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getChatGPTUser();
  if (!(await isOwner(user?.userId))) {
    return Response.json({ error: "Only the desk owner can add things." }, { status: 403 });
  }

  const { slug } = await params;
  if (!getSession(slug)) {
    return Response.json({ error: "Unknown session." }, { status: 404 });
  }

  const form = await request.formData();
  const fields = readFields(form);
  const photos = form
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const validationError = validate(fields, photos);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const id = await createEntry(slug, fields, photos);
  return Response.json({ ok: true, id }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getChatGPTUser();
  if (!(await isOwner(user?.userId))) {
    return Response.json({ error: "Only the desk owner can edit things." }, { status: 403 });
  }

  const { slug } = await params;
  if (!getSession(slug)) {
    return Response.json({ error: "Unknown session." }, { status: 404 });
  }

  const form = await request.formData();
  const entryId = textValue(form, "entryId");
  if (!entryId) return Response.json({ error: "Missing entry." }, { status: 400 });

  const fields = readFields(form);
  const validationError = validate(fields, []);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const updated = await updateEntry(entryId, slug, fields);
  if (!updated) return Response.json({ error: "Entry not found." }, { status: 404 });
  return Response.json({ ok: true });
}

function readFields(form: FormData): EntryFields {
  return {
    title: textValue(form, "title"),
    entryDate: textValue(form, "entryDate"),
    shortText: textValue(form, "shortText"),
    longText: textValue(form, "longText"),
    note: textValue(form, "note"),
    isPublished: form.get("isPublished") === "on",
  };
}

function textValue(form: FormData, key: string) {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function validate(fields: EntryFields, photos: File[]) {
  if (
    !fields.title &&
    !fields.shortText &&
    !fields.longText &&
    !fields.note &&
    photos.length === 0
  ) {
    return "Add a photo or a little bit of text first.";
  }
  if (photos.length > MAX_PHOTOS) return `Choose no more than ${MAX_PHOTOS} photos.`;
  for (const photo of photos) {
    if (!photo.type.startsWith("image/")) return "Only image files can be tucked here.";
    if (photo.size > MAX_PHOTO_BYTES) return "Each photo must be smaller than 8 MB.";
  }
  return null;
}
