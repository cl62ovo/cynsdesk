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
          aria-label="Open little things I noticed"
        >
          <span className="sr-only">little things I noticed</span>
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
