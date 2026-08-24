import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const siteOwner = sqliteTable("site_owner", {
  id: integer("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  email: text("email").notNull(),
  claimedAt: integer("claimed_at", { mode: "timestamp_ms" }).notNull(),
});

export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    sessionSlug: text("session_slug").notNull(),
    title: text("title"),
    entryDate: text("entry_date"),
    shortText: text("short_text"),
    longText: text("long_text"),
    note: text("note"),
    isPublished: integer("is_published", { mode: "boolean" })
      .notNull()
      .default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("idx_entries_session_published_date").on(
      table.sessionSlug,
      table.isPublished,
      table.entryDate,
    ),
  ],
);

export const entryImages = sqliteTable(
  "entry_images",
  {
    id: text("id").primaryKey(),
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull().unique(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    altText: text("alt_text"),
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_entry_images_entry_order").on(table.entryId, table.sortOrder)],
);
