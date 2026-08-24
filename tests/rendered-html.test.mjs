import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the interactive desk cover", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Cynthia 的桌面<\/title>/i);
  assert.match(html, /cynthia-desk-reference-crisp\.png/);
  assert.match(html, /Cynthia 的手绘桌面/);
  assert.match(html, /书本与线轴、相机、纸团、有线耳机、咖啡、钥匙/);
  assert.doesNotMatch(html, /lamp-base-correction/);
  assert.match(html, /class="lamp-switch"/i);
  assert.match(html, /href="\/sessions\/little-things-i-noticed"/i);
  assert.match(html, /href="\/sessions\/things-i-made"/i);
  assert.match(html, /href="\/sessions\/favorite-drink"/i);
  assert.match(html, /href="\/sessions\/things-i-dont-want-to-forget"/i);
  assert.match(html, /href="\/sessions\/things-i-listened-to"/i);
  assert.match(html, /href="\/sessions\/pages-i-kept"/i);
  assert.match(html, /target="_top"/i);
  assert.match(html, /aria-label="Open little things I noticed"/i);
  assert.match(html, /class="plant-water-label"/i);
  assert.match(html, /aria-label="Turn on night mode"/i);
  assert.match(html, /aria-pressed="false"/i);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton|codex-preview/i);
});

test("keeps the first session on the reusable content system", async () => {
  const [homePage, sessionPage, studio, studioClient, apiRoute, contentStore, schema, registry] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/sessions/little-things-i-noticed/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/studio/little-things-i-noticed/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/studio/little-things-i-noticed/StudioClient.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/sessions/[slug]/entries/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/content-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/sessions.ts", import.meta.url), "utf8"),
  ]);

  assert.match(sessionPage, /getEntries\("little-things-i-noticed"\)/);
  assert.match(sessionPage, /owner-add-polaroid/);
  assert.match(sessionPage, /index % 8/);
  assert.match(studio, /getOwnerId/);
  assert.match(studioClient, /method: "DELETE"/);
  assert.match(studioClient, /window\.confirm/);
  assert.match(apiRoute, /export async function DELETE/);
  assert.match(contentStore, /export async function deleteEntry/);
  assert.match(contentStore, /mediaBucket\(\)\.delete/);
  assert.match(schema, /entryImages/);
  assert.match(schema, /longText/);
  assert.match(registry, /show me sth/);
  assert.match(registry, /the box, over time/);
  assert.doesNotMatch(homePage, /next\/link/);
  assert.doesNotMatch(sessionPage, /next\/link/);
  assert.doesNotMatch(studio, /next\/link/);
  assert.doesNotMatch(studioClient, /router\.refresh/);
});

test("keeps the starter preview out of the finished site", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|next\/font/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("opens the three new desk objects into reusable galleries and studios", async () => {
  const [homePage, galleryPage, studioPage, studioClient, configs, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sessions/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/studio/little-things-i-noticed/StudioClient.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/illustrated-sessions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  for (const slug of [
    "things-i-made",
    "favorite-drink",
    "things-i-dont-want-to-forget",
  ]) {
    assert.match(homePage, new RegExp(`/sessions/${slug}`));
    assert.match(configs, new RegExp(`slug: "${slug}"`));
  }

  assert.match(galleryPage, /getEntries\(config\.slug\)/);
  assert.match(galleryPage, /href={`\/studio\/\$\{config\.slug\}`}/);
  assert.match(studioPage, /getEntries\(config\.slug, true\)/);
  assert.match(studioClient, /`\/api\/sessions\/\$\{sessionSlug\}\/entries`/);
  assert.match(studioClient, /method: "DELETE"/);
  assert.match(styles, /\.made-hotspot\s*{[^}]*width:\s*4\.7%/s);
});

test("keeps the session rooms physical and adds the listening wall", async () => {
  const [camera, gallery, listeningPage, listeningWall, studioClient, store, schema, api, migration] =
    await Promise.all([
      readFile(
        new URL("../app/sessions/little-things-i-noticed/page.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../app/sessions/[slug]/page.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../app/sessions/things-i-listened-to/page.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/sessions/things-i-listened-to/ListeningWall.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/studio/little-things-i-noticed/StudioClient.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../lib/content-store.ts", import.meta.url), "utf8"),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/sessions/[slug]/entries/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../drizzle/0001_keen_the_phantom.sql", import.meta.url), "utf8"),
    ]);

  assert.match(camera, /camera-session physical-room/);
  assert.match(gallery, /physical-room/);
  assert.match(listeningPage, /ListeningWall/);
  assert.match(listeningWall, /put it back/);
  assert.match(listeningWall, /♫ listen ↗/);
  assert.match(listeningWall, /play me something/);
  assert.match(listeningWall, /vinyl-record/);
  assert.match(studioClient, /name="contentType"/);
  assert.match(studioClient, /name="creator"/);
  assert.match(studioClient, /name="externalUrl"/);
  assert.match(store, /content_type AS contentType/);
  assert.match(schema, /contentType: text\("content_type"\)/);
  assert.match(api, /External links must start/);
  assert.match(migration, /ADD `content_type` text/);
  assert.match(migration, /ADD `external_url` text/);
});

test("opens the book stack into a mixed archive of kept pages", async () => {
  const [homePage, pagesPage, archive, studio, configs, styles, api] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sessions/pages-i-kept/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sessions/pages-i-kept/PagesArchive.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/studio/little-things-i-noticed/StudioClient.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/illustrated-sessions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/sessions/[slug]/entries/route.ts", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(homePage, /href="\/sessions\/pages-i-kept"/);
  assert.match(pagesPage, /getEntries\("pages-i-kept"\)/);
  assert.match(pagesPage, /PagesArchive/);
  assert.match(archive, /book → opens|book-object/);
  assert.match(archive, /close the book/);
  assert.match(archive, /fold it back/);
  assert.match(archive, /read \/ find this ↗/);
  assert.match(archive, /kept-original-words/);
  assert.match(archive, /kept-my-thought/);
  assert.match(studio, /reading-fields/);
  assert.match(studio, /value="book"/);
  assert.match(studio, /value="lyric"/);
  assert.match(configs, /slug: "pages-i-kept"/);
  assert.match(api, /"book", "article", "line", "lyric", "passage"/);
  assert.match(styles, /\.pages-hotspot\s*{[^}]*clip-path:/s);
  assert.match(styles, /\.made-hotspot\s*{[^}]*width:\s*4\.7%/s);
});
