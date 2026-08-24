export const sessions = [
  { slug: "things-i-made", name: "things I made", object: "thread and books" },
  {
    slug: "little-things-i-noticed",
    name: "little things I noticed",
    object: "camera",
  },
  {
    slug: "things-stuck-in-my-head",
    name: "things stuck in my head",
    object: "crumpled note",
  },
  { slug: "pages-i-kept", name: "pages I kept", object: "book stack" },
  { slug: "things-i-tried", name: "things I tried", object: "laptop" },
  {
    slug: "things-i-listened-to",
    name: "things I listened to",
    object: "headphones",
  },
  { slug: "favorite-drink", name: "favorite drink", object: "cup" },
  { slug: "my-pet-frogs", name: "my pet frogs", object: "frog" },
  {
    slug: "things-i-dont-want-to-forget",
    name: "things I don't want to forget",
    object: "memory drawer",
  },
  { slug: "the-box-over-time", name: "the box, over time", object: "calendar" },
  { slug: "show-me-sth", name: "show me sth", object: "center drawer" },
] as const;

export type SessionSlug = (typeof sessions)[number]["slug"];

export function getSession(slug: string) {
  return sessions.find((session) => session.slug === slug) ?? null;
}
