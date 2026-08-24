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
