"use client";

import { useState } from "react";

export default function Home() {
  const [nightMode, setNightMode] = useState(false);

  return (
    <main className={`cover-shell${nightMode ? " night-mode" : ""}`}>
      <section
        className="reference-cover"
        aria-label="Cynthia 的桌面：一个收藏生活碎片的手绘书桌"
      >
        <img
          className="reference-art"
          src="/cynthia-desk-reference-crisp.png"
          alt="Cynthia 的手绘桌面，摆着书本与线轴、相机、纸团、有线耳机、咖啡、钥匙、落在桌面上的盆栽、独立台灯、手账和一只青蛙。"
        />

        <span className="night-wash" aria-hidden="true" />
        <span className="lamp-glow" aria-hidden="true" />

        <span className="old-water-label-cover" aria-hidden="true" />
        <span className="plant-water-label" aria-hidden="true">
          water
          <br />
          me ♡
        </span>

        <a
          className="desk-hotspot camera-hotspot"
          href="/sessions/little-things-i-noticed"
          target="_top"
          aria-label="Open little things I noticed"
        >
          <span className="sr-only">little things I noticed</span>
        </a>

        <a
          className="desk-hotspot made-hotspot"
          href="/sessions/things-i-made"
          target="_top"
          aria-label="Open things I made"
        >
          <span className="sr-only">things I made</span>
        </a>

        <a
          className="desk-hotspot pages-hotspot"
          href="/sessions/pages-i-kept"
          target="_top"
          aria-label="Open pages I kept"
        >
          <span className="sr-only">pages I kept</span>
        </a>

        <a
          className="desk-hotspot drink-hotspot"
          href="/sessions/favorite-drink"
          target="_top"
          aria-label="Open favorite drink"
        >
          <span className="sr-only">favorite drink</span>
        </a>

        <a
          className="desk-hotspot forget-hotspot"
          href="/sessions/things-i-dont-want-to-forget"
          target="_top"
          aria-label="Open things I don't want to forget"
        >
          <span className="sr-only">things I don&apos;t want to forget</span>
        </a>

        <a
          className="desk-hotspot listening-hotspot"
          href="/sessions/things-i-listened-to"
          target="_top"
          aria-label="Open things I listened to"
        >
          <span className="sr-only">things I listened to</span>
        </a>

        <a
          className="desk-hotspot thoughts-hotspot"
          href="/sessions/things-stuck-in-my-head"
          target="_top"
          aria-label="Open things stuck in my head"
        >
          <span className="sr-only">things stuck in my head</span>
        </a>

        <button
          className="lamp-switch"
          type="button"
          aria-label={nightMode ? "Turn off night mode" : "Turn on night mode"}
          aria-pressed={nightMode}
          onClick={() => setNightMode((isNight) => !isNight)}
        >
          <span className="switch-mark" aria-hidden="true" />
        </button>

        <span className="sr-only" role="status" aria-live="polite">
          {nightMode ? "Night light is on" : "Night light is off"}
        </span>
      </section>
    </main>
  );
}
