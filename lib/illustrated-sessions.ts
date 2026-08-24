export type IllustratedSessionConfig = {
  slug:
    | "things-i-made"
    | "favorite-drink"
    | "things-i-dont-want-to-forget"
    | "things-i-listened-to";
  name: string;
  theme: string;
  kicker: string;
  intro: string;
  emptyText: string;
  emptyHint: string;
  addLabel: string;
  studioTitle: string;
  freshLabel: string;
  collectionLabel: string;
  itemNoun: string;
  storageLabel: string;
  editorKind?: "listening";
};

export const illustratedSessions: IllustratedSessionConfig[] = [
  {
    slug: "things-i-made",
    name: "things I made",
    theme: "made-session",
    kicker: "from the thread spool",
    intro: "small things that began in my hands",
    emptyText: "the first handmade thing is still finding its page.",
    emptyHint: "the thread is waiting.",
    addLabel: "add something I made",
    studioTitle: "beside the thread spool",
    freshLabel: "a new thing from my hands",
    collectionLabel: "things already stitched into the book",
    itemNoun: "made thing",
    storageLabel: "the making table",
  },
  {
    slug: "favorite-drink",
    name: "favorite drink",
    theme: "drink-session",
    kicker: "from the little cup",
    intro: "drinks, places, and the feelings left at the bottom",
    emptyText: "the cup has not kept a drink yet.",
    emptyHint: "it is waiting for the first sip.",
    addLabel: "add another drink",
    studioTitle: "behind the little cup",
    freshLabel: "a drink worth keeping",
    collectionLabel: "drinks already kept in the cupboard",
    itemNoun: "drink",
    storageLabel: "the little cupboard",
  },
  {
    slug: "things-i-dont-want-to-forget",
    name: "things I don't want to forget",
    theme: "forget-session",
    kicker: "from the memory drawer",
    intro: "people, places, words, and moments I want to hold onto",
    emptyText: "this drawer slot is still empty.",
    emptyHint: "something precious will live here.",
    addLabel: "keep another memory",
    studioTitle: "inside the memory drawer",
    freshLabel: "something I want to remember",
    collectionLabel: "memories already tucked in the drawer",
    itemNoun: "memory",
    storageLabel: "the memory drawer",
  },
  {
    slug: "things-i-listened-to",
    name: "things I listened to",
    theme: "listening-session",
    kicker: "from the headphones",
    intro: "sounds I kept close, and the little moments attached to them",
    emptyText: "the listening wall is quiet for now.",
    emptyHint: "the first sleeve is waiting.",
    addLabel: "something new? ♫",
    studioTitle: "behind the listening wall",
    freshLabel: "something new for the wall",
    collectionLabel: "things already hanging on the wall",
    itemNoun: "listening thing",
    storageLabel: "the listening wall",
    editorKind: "listening",
  },
];

export function getIllustratedSession(slug: string) {
  return illustratedSessions.find((session) => session.slug === slug) ?? null;
}
