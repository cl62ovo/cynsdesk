import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  createEntry,
  deleteEntry,
  isOwner,
  reorderEntries,
  updateEntry,
  type EntryFields,
} from "../../../../../lib/content-store";
import { getSession } from "../../../../../lib/sessions";

const MAX_PHOTOS = 10;
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
  const photos = form
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const validationError = validate(fields, photos);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const updated = await updateEntry(entryId, slug, fields, photos);
  if (!updated) return Response.json({ error: "Entry not found." }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getChatGPTUser();
  if (!(await isOwner(user?.userId))) {
    return Response.json({ error: "Only the desk owner can remove things." }, { status: 403 });
  }

  const { slug } = await params;
  if (!getSession(slug)) {
    return Response.json({ error: "Unknown session." }, { status: 404 });
  }

  const form = await request.formData();
  const entryId = textValue(form, "entryId");
  if (!entryId) return Response.json({ error: "Missing entry." }, { status: 400 });

  const deleted = await deleteEntry(entryId, slug);
  if (!deleted) return Response.json({ error: "Entry not found." }, { status: 404 });
  return Response.json({ ok: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getChatGPTUser();
  if (!(await isOwner(user?.userId))) {
    return Response.json({ error: "Only the desk owner can rearrange things." }, { status: 403 });
  }

  const { slug } = await params;
  if (!getSession(slug)) {
    return Response.json({ error: "Unknown session." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { entryIds?: unknown } | null;
  const entryIds = body?.entryIds;
  if (
    !Array.isArray(entryIds) ||
    entryIds.length > 500 ||
    entryIds.some((id) => typeof id !== "string" || id.length > 100) ||
    new Set(entryIds).size !== entryIds.length
  ) {
    return Response.json({ error: "That arrangement could not be read." }, { status: 400 });
  }

  await reorderEntries(slug, entryIds as string[]);
  return Response.json({ ok: true });
}

function readFields(form: FormData): EntryFields {
  const workbenchExtras = Object.fromEntries(
    [
      "workbenchKind",
      "why",
      "materialsHave",
      "materialsNeed",
      "figuringOut",
      "nextSteps",
      "attempts",
      "reflection",
      "referenceLinks",
    ]
      .map((key) => [key, textValue(form, key)] as const)
      .filter(([, value]) => value),
  );

  return {
    title: textValue(form, "title"),
    entryDate: textValue(form, "entryDate"),
    shortText: textValue(form, "shortText"),
    longText: textValue(form, "longText"),
    note: textValue(form, "note"),
    contentType: textValue(form, "contentType"),
    creator: textValue(form, "creator"),
    externalUrl: textValue(form, "externalUrl"),
    extraData: Object.keys(workbenchExtras).length
      ? JSON.stringify(workbenchExtras)
      : null,
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
  const hasWorkbenchText = hasMeaningfulWorkbenchData(fields.extraData);
  if (
    !fields.title &&
    !fields.shortText &&
    !fields.longText &&
    !fields.note &&
    !fields.creator &&
    !fields.externalUrl &&
    !hasWorkbenchText &&
    photos.length === 0
  ) {
    return "Add a photo or a little bit of text first.";
  }
  if (photos.length > MAX_PHOTOS) return `Choose no more than ${MAX_PHOTOS} photos.`;
  if (
    fields.contentType &&
    ![
      "album", "single", "podcast", "podcast-episode",
      "book", "article", "line", "lyric", "passage", "other",
      "idea", "trying", "tried",
    ].includes(fields.contentType)
  ) {
    return "Choose a known item type.";
  }
  if (fields.extraData && fields.extraData.length > 30000) {
    return "The workbench notes are a little too long for one object.";
  }
  if (fields.externalUrl) {
    try {
      const url = new URL(fields.externalUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "External links must start with http:// or https://.";
      }
    } catch {
      return "Add a complete listening link.";
    }
  }
  for (const photo of photos) {
    if (!photo.type.startsWith("image/")) return "Only image files can be tucked here.";
    if (photo.size > MAX_PHOTO_BYTES) return "Each photo must be smaller than 8 MB.";
  }
  return null;
}

function hasMeaningfulWorkbenchData(value: string | null) {
  if (!value) return false;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(parsed).some(
      ([key, item]) => key !== "workbenchKind" && typeof item === "string" && item.trim(),
    );
  } catch {
    return false;
  }
}
