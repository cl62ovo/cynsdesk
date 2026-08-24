"use client";

import { useEffect, useState } from "react";
import type { ContentEntry } from "../lib/content-store";
import { entryDay, entryExcerpt, entryLabel, sessionTone } from "../lib/timeline";
import { getSession } from "../lib/sessions";

type FrogMood = { behavior: string; message: string };
type ReflectionSource = { id: string; sessionSlug: string; sessionName: string; date: string; label: string; excerpt: string };

const frogBehaviors = [
  { behavior: "croak", message: "…ribbit." },
  { behavior: "blink", message: "blink." },
  { behavior: "hop", message: "tiny hop!" },
  { behavior: "turn", message: "looking at the other frog." },
  { behavior: "hide", message: "not here." },
  { behavior: "sleepy", message: "five more lily-pad minutes…" },
  { behavior: "excited", message: "!!!" },
  { behavior: "sing", message: "♪ la la la… ♪" },
  { behavior: "remember", message: "the box smells familiar." },
];

export default function Home() {
  const [lampOn, setLampOn] = useState(false);
  const [timePhase, setTimePhase] = useState("daytime");
  const [plantWatered, setPlantWatered] = useState(false);
  const [frogOne, setFrogOne] = useState<FrogMood | null>(null);
  const [frogTwo, setFrogTwo] = useState<FrogMood | null>(null);
  const [paperOpen, setPaperOpen] = useState(false);
  const [keyMoved, setKeyMoved] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [entry, setEntry] = useState<ContentEntry | null>(null);
  const [drawerBusy, setDrawerBusy] = useState(false);
  const [drawerMessage, setDrawerMessage] = useState("");
  const [reflection, setReflection] = useState("");
  const [reflectionMessage, setReflectionMessage] = useState("");
  const [reflectionBusy, setReflectionBusy] = useState(false);
  const [reflectionSources, setReflectionSources] = useState<ReflectionSource[]>([]);
  const [reflectionSourcesOpen, setReflectionSourcesOpen] = useState(false);

  useEffect(() => {
    window.queueMicrotask(() => {
      setLampOn(sessionStorage.getItem("cynthia-lamp") === "on");
      setTimePhase(localTimePhase());
    });
    const timer = window.setInterval(() => setTimePhase(localTimePhase()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function remember(key: string, value: string) {
    sessionStorage.setItem(key, value);
  }

  function toggleLamp() {
    setLampOn((current) => {
      remember("cynthia-lamp", current ? "off" : "on");
      return !current;
    });
  }

  function waterPlant() {
    setPlantWatered(false);
    window.setTimeout(() => setPlantWatered(true), 10);
    window.setTimeout(() => setPlantWatered(false), 1800);
  }

  async function greetFrog(which: 1 | 2) {
    const chosen = frogBehaviors[Math.floor(Math.random() * frogBehaviors.length)];
    const setter = which === 1 ? setFrogOne : setFrogTwo;
    const otherSetter = which === 1 ? setFrogTwo : setFrogOne;
    setter(chosen);
    if (chosen.behavior === "croak") playTinySound("croak");
    if (chosen.behavior === "sing") playTinySound("hum");
    if (chosen.behavior === "sing" || chosen.behavior === "remember") {
      const response = await fetch(`/api/frog-memory?mode=${chosen.behavior}`, { cache: "no-store" });
      const result = (await response.json().catch(() => ({}))) as { memory?: string | null };
      if (result.memory) setter({ ...chosen, message: result.memory });
    }
    if (Math.random() < .32) {
      window.setTimeout(() => otherSetter({ behavior: "turn", message: which === 1 ? "frog two noticed." : "frog one is listening." }), 260);
      window.setTimeout(() => otherSetter(null), 2350);
    }
    window.setTimeout(() => setter(null), 2800);
  }

  async function pullFromDrawer() {
    setDrawerBusy(true);
    setDrawerMessage("");
    setReflection("");
    setReflectionMessage("");
    setReflectionSources([]);
    setReflectionSourcesOpen(false);
    const query = new URLSearchParams({ turn: String(Date.now()) });
    if (entry) query.set("exclude", entry.id);
    const response = await fetch(`/api/random-entry?${query}`, { cache: "no-store" });
    const result = (await response.json().catch(() => ({}))) as { entry?: ContentEntry | null; error?: string };
    setDrawerBusy(false);
    if (!response.ok) return setDrawerMessage(result.error || "the drawer is stuck for a moment.");
    setEntry(result.entry ?? null);
    if (!result.entry) setDrawerMessage("nothing has been tucked into the box yet.");
  }

  function toggleDrawer() {
    if (drawerOpen) {
      setDrawerOpen(false);
      return;
    }
    setDrawerOpen(true);
    void pullFromDrawer();
  }

  async function askForConnection() {
    if (!entry) return;
    setReflectionBusy(true);
    setReflection("");
    setReflectionMessage("");
    const response = await fetch("/api/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "connection", entryId: entry.id, variation: Date.now() }),
    });
    const result = (await response.json().catch(() => ({}))) as { reflection?: string; sources?: ReflectionSource[]; error?: string };
    setReflectionBusy(false);
    if (result.reflection) {
      setReflection(result.reflection);
      setReflectionSources(result.sources ?? []);
    }
    else setReflectionMessage(result.error || "the box stayed quiet this time.");
  }

  return (
    <main className={`cover-shell time-${timePhase}${lampOn ? " lamp-on" : ""}`}>
      <section
        className={`reference-cover${plantWatered ? " plant-watered" : ""}${drawerOpen ? " chance-drawer-open" : ""}`}
        aria-label="Cynthia 的桌面：一个会回应、会记得时间的手绘收藏盒"
      >
        <img
          className="reference-art"
          src="/cynthia-desk-reference-crisp.png"
          alt="Cynthia 的手绘桌面，摆着书本与线轴、相机、纸团、有线耳机、咖啡、钥匙、盆栽、台灯、手账和青蛙。"
        />

        <span className="night-wash" aria-hidden="true" />
        <span className="lamp-glow" aria-hidden="true" />
        <span className="window-time-scene" aria-hidden="true"><i className="window-moon" /><i className="window-stars">· ✦ ·</i></span>

        <DeskCalendar />

        <button className="plant-control" type="button" onClick={waterPlant} aria-label="Water the plant">
          <span className="plant-drops" aria-hidden="true">···</span>
          <span className="plant-water-label" aria-hidden="true">water<br />me ♡</span>
        </button>
        <span className="old-water-label-cover" aria-hidden="true" />

        <button className={`frog-control frog-one${frogOne ? ` frog-reacting frog-${frogOne.behavior}` : ""}`} type="button" onClick={() => void greetFrog(1)} aria-label="Say hello to frog one">
          <span className="frog-reply" role="status">{frogOne?.message}</span>
        </button>
        <button className={`frog-control frog-two${frogTwo ? ` frog-reacting frog-${frogTwo.behavior}` : ""}`} type="button" onClick={() => void greetFrog(2)} aria-label="Say hello to frog two">
          <span className="frog-reply" role="status">{frogTwo?.message}</span>
        </button>

        <button className={`kind-note-control${paperOpen ? " note-unfolded" : ""}`} type="button" onClick={() => setPaperOpen((value) => !value)} aria-label="Unfold the little kindness note">
          <span>{paperOpen ? "you have come farther than you think ♡" : "unfold"}</span>
        </button>

        <button className={`key-control${keyMoved ? " key-moved" : ""}`} type="button" onClick={() => { setKeyMoved(true); window.setTimeout(() => setKeyMoved(false), 1500); }} aria-label="Nudge the little key">
          <span role="status">{keyMoved ? "a tiny door clicked somewhere." : ""}</span>
        </button>

        <SessionLinks />

        <button
          className="lamp-switch"
          type="button"
          aria-label={lampOn ? "Turn the desk lamp off" : "Turn the desk lamp on"}
          aria-pressed={lampOn}
          onClick={toggleLamp}
        >
          <span className="switch-mark" aria-hidden="true" />
        </button>

        <button className="chance-drawer-handle" type="button" onClick={toggleDrawer} aria-expanded={drawerOpen} aria-controls="chance-drawer-find">
          <span className="sr-only">{drawerOpen ? "put it back" : "show me sth"}</span>
          <small>{drawerOpen ? "close the drawer" : "pull gently"}</small>
        </button>

        {drawerOpen && (
          <section className="drawer-find" id="chance-drawer-find" aria-live="polite">
            <span className="drawer-string" aria-hidden="true" />
            {drawerBusy ? (
              <p className="drawer-waiting">looking through the box… <span aria-hidden="true">▱ ▰ ▱</span></p>
            ) : entry ? (
              <RandomFind entry={entry} reflection={reflection} reflectionMessage={reflectionMessage} reflectionBusy={reflectionBusy} sources={reflectionSources} sourcesOpen={reflectionSourcesOpen} onToggleSources={() => setReflectionSourcesOpen((value) => !value)} onHideReflection={() => { setReflection(""); setReflectionSourcesOpen(false); }} onAnother={pullFromDrawer} onReflect={askForConnection} onClose={() => setDrawerOpen(false)} />
            ) : (
              <p className="drawer-waiting">{drawerMessage || "nothing came loose this time."}</p>
            )}
          </section>
        )}

        <span className="sr-only" role="status" aria-live="polite">
          {lampOn ? "The desk lamp is on" : "The desk lamp is off"}. Outside the window it is {timePhase.replace("-", " ")}.
        </span>
      </section>
    </main>
  );
}

function SessionLinks() {
  const links = [
    ["camera-hotspot", "/sessions/little-things-i-noticed", "Open little things I noticed", "little things I noticed"],
    ["made-hotspot", "/sessions/things-i-made", "Open things I made", "things I made"],
    ["pages-hotspot", "/sessions/pages-i-kept", "Open pages I kept", "pages I kept"],
    ["drink-hotspot", "/sessions/favorite-drink", "Open favorite drink", "favorite drink"],
    ["forget-hotspot", "/sessions/things-i-dont-want-to-forget", "Open things I don't want to forget", "things I don't want to forget"],
    ["listening-hotspot", "/sessions/things-i-listened-to", "Open things I listened to", "things I listened to"],
    ["thoughts-hotspot", "/sessions/things-stuck-in-my-head", "Open things stuck in my head", "things stuck in my head"],
    ["tried-hotspot", "/sessions/things-i-tried", "Wake the laptop and open things I tried", "things I tried"],
  ];
  return links.map(([className, href, label, text]) => (
    <a className={`desk-hotspot ${className}`} href={href} target="_top" aria-label={label} key={href}>
      <span className="sr-only">{text}</span>
    </a>
  ));
}

function DeskCalendar() {
  const [now, setNow] = useState(() => hongKongToday());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(hongKongToday()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const first = new Date(Date.UTC(now.year, now.month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(now.year, now.month, 0)).getUTCDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  const monthName = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(first);

  return (
    <section className="living-calendar" aria-label={`${monthName} ${now.year} calendar`}>
      <a className="calendar-title" href={`/sessions/the-box-over-time?view=month&date=${dateString(now.year, now.month, now.day)}`} target="_top">
        {monthName} {now.year}<small>the box, over time ↗</small>
      </a>
      <div className="calendar-weekdays" aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="calendar-days">
        {cells.map((day, index) => day ? (
          <a key={day} href={`/sessions/the-box-over-time?view=day&date=${dateString(now.year, now.month, day)}`} target="_top" aria-current={day === now.day ? "date" : undefined}>{day}</a>
        ) : <span key={`blank-${index}`} />)}
      </div>
    </section>
  );
}

function RandomFind({ entry, reflection, reflectionMessage, reflectionBusy, sources, sourcesOpen, onToggleSources, onHideReflection, onAnother, onReflect, onClose }: { entry: ContentEntry; reflection: string; reflectionMessage: string; reflectionBusy: boolean; sources: ReflectionSource[]; sourcesOpen: boolean; onToggleSources: () => void; onHideReflection: () => void; onAnother: () => void; onReflect: () => void; onClose: () => void }) {
  const session = getSession(entry.sessionSlug);
  return (
    <article className={`random-find random-find-${sessionTone(entry.sessionSlug)}`}>
      <p className="find-origin">from your box · {session?.name || entry.sessionSlug}</p>
      {entry.images[0] && <figure><img src={`/media/${entry.images[0].objectKey}`} alt={entry.images[0].altText || entryLabel(entry)} /></figure>}
      <time dateTime={entryDay(entry)}>{formatLongDate(entryDay(entry))}</time>
      <h2>{entryLabel(entry)}</h2>
      <p className="find-excerpt">{entryExcerpt(entry)}</p>
      {entry.externalUrl && <a className="find-external" href={entry.externalUrl} target="_blank" rel="noreferrer">follow the little link ↗</a>}
      <a className="find-session-link" href={`/sessions/${entry.sessionSlug}`} target="_top">put it back in its room ↗</a>
      {reflection && <aside className="ai-reflection"><small>a little thought from the box's own index ✦</small><p>{reflection}</p><div className="drawer-reflection-actions">{sources.length > 0 && <button type="button" onClick={onToggleSources}>{sourcesOpen ? "hide sources" : "what this came from"}</button>}<button type="button" onClick={onHideReflection}>hide</button><button type="button" onClick={() => onReflect()}>another angle</button></div>{sourcesOpen && <div className="drawer-sources">{sources.map((source) => <a href={`/sessions/${source.sessionSlug}`} target="_top" key={source.id}><time>{source.date}</time><span>{source.label}</span></a>)}</div>}</aside>}
      {reflectionMessage && <p className="drawer-ai-message">{reflectionMessage}</p>}
      <div className="drawer-actions">
        <button type="button" onClick={() => onAnother()}>show me another</button>
        {!reflection && <button type="button" onClick={() => onReflect()} disabled={reflectionBusy}>{reflectionBusy ? "looking through the box…" : "a little connection ✦"}</button>}
        <button type="button" onClick={onClose}>put it back</button>
      </div>
    </article>
  );
}

function hongKongToday() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day };
}

function dateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function localTimePhase() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour >= 5 && hour < 8) return "early-morning";
  if (hour >= 8 && hour < 17.5) return "daytime";
  if (hour >= 17.5 && hour < 20) return "evening";
  return "night";
}

function playTinySound(kind: "croak" | "hum") {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = kind === "croak" ? "sawtooth" : "sine";
  oscillator.frequency.setValueAtTime(kind === "croak" ? 118 : 330, context.currentTime);
  if (kind === "croak") oscillator.frequency.exponentialRampToValueAtTime(78, context.currentTime + .13);
  else oscillator.frequency.linearRampToValueAtTime(392, context.currentTime + .19);
  gain.gain.setValueAtTime(.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(kind === "croak" ? .035 : .018, context.currentTime + .02);
  gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + (kind === "croak" ? .18 : .28));
  oscillator.connect(gain); gain.connect(context.destination);
  oscillator.start(); oscillator.stop(context.currentTime + (kind === "croak" ? .2 : .3));
  oscillator.addEventListener("ended", () => void context.close(), { once: true });
}
