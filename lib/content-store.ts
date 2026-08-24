import { env } from "cloudflare:workers";

export type ContentImage = {
  id: string;
  entryId: string;
  objectKey: string;
  originalName: string;
  mimeType: string;
  altText: string | null;
  caption: string | null;
  sortOrder: number;
};

export type ContentEntry = {
  id: string;
  sessionSlug: string;
  title: string | null;
  entryDate: string | null;
  shortText: string | null;
  longText: string | null;
  note: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  images: ContentImage[];
};

type EntryRow = Omit<ContentEntry, "images" | "isPublished"> & {
  isPublished: number;
};

type ImageRow = ContentImage;

let schemaReady: Promise<void> | null = null;

function database() {
  if (!env.DB) throw new Error("The content database is unavailable.");
  return env.DB;
}

export function mediaBucket(): R2Bucket {
  const media = (env as typeof env & { MEDIA?: R2Bucket }).MEDIA;
  if (!media) throw new Error("The media bucket is unavailable.");
  return media;
}

export async function ensureContentSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = database();
      await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS site_owner (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          user_id TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL,
          claimed_at INTEGER NOT NULL
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS entries (
          id TEXT PRIMARY KEY,
          session_slug TEXT NOT NULL,
          title TEXT,
          entry_date TEXT,
          short_text TEXT,
          long_text TEXT,
          note TEXT,
          is_published INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS entry_images (
          id TEXT PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
          object_key TEXT NOT NULL UNIQUE,
          original_name TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          alt_text TEXT,
          caption TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        )`),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_entries_session_published_date
          ON entries(session_slug, is_published, entry_date)`),
        db.prepare(`CREATE INDEX IF NOT EXISTS idx_entry_images_entry_order
          ON entry_images(entry_id, sort_order)`),
      ]);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

export async function getOwnerId(): Promise<string | null> {
  await ensureContentSchema();
  const row = await database()
    .prepare("SELECT user_id AS userId FROM site_owner WHERE id = 1")
    .first<{ userId: string }>();
  return row?.userId ?? null;
}

export async function claimOwner(userId: string, email: string) {
  await ensureContentSchema();
  await database()
    .prepare(
      "INSERT OR IGNORE INTO site_owner (id, user_id, email, claimed_at) VALUES (1, ?, ?, ?)",
    )
    .bind(userId, email, Date.now())
    .run();
  return (await getOwnerId()) === userId;
}

export async function isOwner(userId: string | null | undefined) {
  return Boolean(userId && (await getOwnerId()) === userId);
}

export async function getEntries(
  sessionSlug: string,
  includeDrafts = false,
): Promise<ContentEntry[]> {
  await ensureContentSchema();
  const where = includeDrafts
    ? "WHERE session_slug = ?"
    : "WHERE session_slug = ? AND is_published = 1";
  const result = await database()
    .prepare(
      `SELECT id, session_slug AS sessionSlug, title, entry_date AS entryDate,
        short_text AS shortText, long_text AS longText, note,
        is_published AS isPublished, sort_order AS sortOrder,
        created_at AS createdAt, updated_at AS updatedAt
      FROM entries ${where}
      ORDER BY COALESCE(entry_date, '') DESC, sort_order ASC, created_at DESC`,
    )
    .bind(sessionSlug)
    .all<EntryRow>();

  const rows = result.results ?? [];
  if (!rows.length) return [];

  const placeholders = rows.map(() => "?").join(", ");
  const imageResult = await database()
    .prepare(
      `SELECT id, entry_id AS entryId, object_key AS objectKey,
        original_name AS originalName, mime_type AS mimeType,
        alt_text AS altText, caption, sort_order AS sortOrder
      FROM entry_images WHERE entry_id IN (${placeholders})
      ORDER BY sort_order ASC, created_at ASC`,
    )
    .bind(...rows.map((row) => row.id))
    .all<ImageRow>();

  const imagesByEntry = new Map<string, ContentImage[]>();
  for (const image of imageResult.results ?? []) {
    const images = imagesByEntry.get(image.entryId) ?? [];
    images.push(image);
    imagesByEntry.set(image.entryId, images);
  }

  return rows.map((row) => ({
    ...row,
    isPublished: Boolean(row.isPublished),
    images: imagesByEntry.get(row.id) ?? [],
  }));
}

export type EntryFields = {
  title: string | null;
  entryDate: string | null;
  shortText: string | null;
  longText: string | null;
  note: string | null;
  isPublished: boolean;
};

export async function createEntry(
  sessionSlug: string,
  fields: EntryFields,
  uploads: File[],
) {
  await ensureContentSchema();
  const entryId = crypto.randomUUID();
  const now = Date.now();
  const storedKeys: string[] = [];

  try {
    const imageRows = [];
    for (const [index, file] of uploads.entries()) {
      const imageId = crypto.randomUUID();
      const extension = safeExtension(file);
      const objectKey = `entries/${entryId}/${imageId}.${extension}`;
      await mediaBucket().put(objectKey, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { originalName: file.name },
      });
      storedKeys.push(objectKey);
      imageRows.push({ imageId, objectKey, file, index });
    }

    const statements = [
      database()
        .prepare(
          `INSERT INTO entries (
            id, session_slug, title, entry_date, short_text, long_text, note,
            is_published, sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        )
        .bind(
          entryId,
          sessionSlug,
          fields.title,
          fields.entryDate,
          fields.shortText,
          fields.longText,
          fields.note,
          fields.isPublished ? 1 : 0,
          now,
          now,
        ),
      ...imageRows.map(({ imageId, objectKey, file, index }) =>
        database()
          .prepare(
            `INSERT INTO entry_images (
              id, entry_id, object_key, original_name, mime_type,
              alt_text, caption, sort_order, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            imageId,
            entryId,
            objectKey,
            file.name,
            file.type,
            fields.title,
            fields.note,
            index,
            now,
          ),
      ),
    ];
    await database().batch(statements);
    return entryId;
  } catch (error) {
    await Promise.allSettled(storedKeys.map((key) => mediaBucket().delete(key)));
    throw error;
  }
}

export async function updateEntry(
  entryId: string,
  sessionSlug: string,
  fields: EntryFields,
) {
  await ensureContentSchema();
  const result = await database()
    .prepare(
      `UPDATE entries SET title = ?, entry_date = ?, short_text = ?,
        long_text = ?, note = ?, is_published = ?, updated_at = ?
      WHERE id = ? AND session_slug = ?`,
    )
    .bind(
      fields.title,
      fields.entryDate,
      fields.shortText,
      fields.longText,
      fields.note,
      fields.isPublished ? 1 : 0,
      Date.now(),
      entryId,
      sessionSlug,
    )
    .run();
  return result.meta.changes > 0;
}

export async function deleteEntry(entryId: string, sessionSlug: string) {
  await ensureContentSchema();
  const db = database();
  const imageResult = await db
    .prepare(
      `SELECT object_key AS objectKey
      FROM entry_images
      WHERE entry_id = ?
        AND EXISTS (
          SELECT 1 FROM entries
          WHERE entries.id = entry_images.entry_id AND entries.session_slug = ?
        )`,
    )
    .bind(entryId, sessionSlug)
    .all<{ objectKey: string }>();

  const [, entryResult] = await db.batch([
    db.prepare(
      `DELETE FROM entry_images
      WHERE entry_id = ?
        AND EXISTS (
          SELECT 1 FROM entries
          WHERE entries.id = entry_images.entry_id AND entries.session_slug = ?
        )`,
    ).bind(entryId, sessionSlug),
    db.prepare(
      "DELETE FROM entries WHERE id = ? AND session_slug = ?",
    ).bind(entryId, sessionSlug),
  ]);

  if (entryResult.meta.changes < 1) return false;

  await Promise.allSettled(
    (imageResult.results ?? []).map(({ objectKey }) => mediaBucket().delete(objectKey)),
  );
  return true;
}

function safeExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type === "image/png" ? "png" : "jpg";
}
