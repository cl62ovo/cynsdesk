"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContentEntry } from "../../../lib/content-store";
import {
  addDays,
  memoryEntries,
  memoryPeriod,
  monthlyMemory,
  parseDay,
  prettyDate,
  shortDate,
  toDay,
  type MemoryPeriod,
} from "../../../lib/memory-layer";
import { dateKey, entryDay, entryExcerpt, entryLabel, sessionTone } from "../../../lib/timeline";
import { getSession } from "../../../lib/sessions";

type View = "day" | "week" | "month";
type ReflectionSource = { id: string; sessionSlug: string; sessionName: string; date: string; label: string; excerpt: string };

export default function TimeArchive({ entries, initialView, initialDate, owner }: { entries: ContentEntry[]; initialView: View; initialDate?: string; owner: boolean }) {
  const today = dateKey(new Date());
  const [view, setView] = useState<View>(initialView);
  const [selected, setSelected] = useState(initialDate || today);
  const [summary, setSummary] = useState("");
  const [sources, setSources] = useState<ReflectionSource[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryMessage, setSummaryMessage] = useState("");
  const [summaryStale, setSummaryStale] = useState(false);
  const [showOriginal, setShowOriginal] = useState(initialView !== "month");

  const datedEntries = useMemo(() => memoryEntries(entries), [entries]);
  const period = useMemo(() => memoryPeriod(view, selected), [view, selected]);
  const periodEntries = useMemo(() => memoryEntries(datedEntries, { start: period.start, end: period.end }), [datedEntries, period]);

  useEffect(() => {
    let active = true;
    if (view === "day" || periodEntries.length === 0) return () => { active = false; };
    void fetch("/api/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "period", granularity: view, start: period.start, end: period.end, readOnly: true }),
    }).then(async (response) => ({ response, result: await response.json().catch(() => ({})) as ReflectionResult }))
      .then(({ response, result }) => {
        if (!active || !response.ok || !result.reflection) return;
        setSummary(result.reflection);
        setSources(result.sources ?? []);
        setSummaryStale(Boolean(result.stale));
      });
    return () => { active = false; };
  }, [view, period.start, period.end, periodEntries.length]);

  function chooseView(next: View) {
    resetSummary();
    setView(next);
    setShowOriginal(next !== "month");
    updateAddress(next, selected);
  }

  function chooseDate(next: string) {
    resetSummary();
    setSelected(next);
    updateAddress(view, next);
  }

  function resetSummary() {
    setSummary("");
    setSources([]);
    setSourcesOpen(false);
    setSummaryMessage("");
    setSummaryStale(false);
  }

  function move(direction: -1 | 1) {
    const date = parseDay(selected);
    if (view === "day") date.setUTCDate(date.getUTCDate() + direction);
    if (view === "week") date.setUTCDate(date.getUTCDate() + direction * 7);
    if (view === "month") date.setUTCMonth(date.getUTCMonth() + direction, 1);
    chooseDate(toDay(date));
  }

  async function makeSummary(regenerate = false) {
    if (view === "day") return;
    setSummaryBusy(true);
    setSummaryMessage("");
    const response = await fetch("/api/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "period", granularity: view, start: period.start, end: period.end, regenerate }),
    });
    const result = (await response.json().catch(() => ({}))) as ReflectionResult;
    setSummaryBusy(false);
    if (result.reflection) {
      setSummary(result.reflection);
      setSources(result.sources ?? []);
      setSummaryStale(Boolean(result.stale));
    } else setSummaryMessage(result.error || "the box stayed quiet this time. your original archive is still here.");
  }

  const completed = period.end < today;

  return (
    <main className="time-archive">
      <span className="archive-grain" aria-hidden="true" />
      <header className="archive-heading">
        {/* The site runs in an embedded browser; this intentionally leaves the archive room. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" target="_top">← back to the desk</a>
        <p>the calendar on the wall</p>
        <h1>the box, over time</h1>
        <small>the same little things, arranged by when they happened to stay</small>
      </header>

      <section className="archive-calendar-paper" aria-label="Choose a date and archive view">
        <div className="archive-view-tabs">
          {(["day", "week", "month"] as View[]).map((item) => <button type="button" className={view === item ? "active" : ""} onClick={() => chooseView(item)} key={item}>{item}</button>)}
        </div>
        <div className="archive-period-nav">
          <button type="button" onClick={() => move(-1)} aria-label={`Previous ${view}`}>←</button>
          <strong>{period.label}</strong>
          <button type="button" onClick={() => move(1)} aria-label={`Next ${view}`}>→</button>
        </div>
        <MonthPicker selected={selected} today={today} onChoose={chooseDate} />
        <button className="archive-today" type="button" onClick={() => chooseDate(today)}>return to today · {prettyDate(today)}</button>
      </section>

      {view === "month" && <MonthStory entries={periodEntries} period={period} />}

      {view !== "day" && (
        <ReflectionPaper
          view={view}
          summary={summary}
          sources={sources}
          sourcesOpen={sourcesOpen}
          stale={summaryStale}
          busy={summaryBusy}
          message={summaryMessage}
          completed={completed}
          hasEntries={periodEntries.length > 0}
          owner={owner}
          onGenerate={() => void makeSummary(false)}
          onRegenerate={() => void makeSummary(true)}
          onHide={() => setSummary("")}
          onToggleSources={() => setSourcesOpen((value) => !value)}
        />
      )}

      {view === "month" && periodEntries.length > 0 && (
        <button className="see-originals" type="button" onClick={() => setShowOriginal((value) => !value)}>
          {showOriginal ? "fold the full archive away" : "see everything from this month"} {showOriginal ? "↑" : "↓"}
        </button>
      )}
      {(showOriginal || view !== "month") && <ArchiveFlow view={view} period={period} entries={periodEntries} />}
    </main>
  );
}

type ReflectionResult = { reflection?: string; sources?: ReflectionSource[]; error?: string; stale?: boolean };

function ReflectionPaper({ view, summary, sources, sourcesOpen, stale, busy, message, completed, hasEntries, owner, onGenerate, onRegenerate, onHide, onToggleSources }: {
  view: "week" | "month"; summary: string; sources: ReflectionSource[]; sourcesOpen: boolean; stale: boolean; busy: boolean; message: string; completed: boolean; hasEntries: boolean; owner: boolean; onGenerate: () => void; onRegenerate: () => void; onHide: () => void; onToggleSources: () => void;
}) {
  return (
    <section className="period-reflection-slot">
      <p>{view === "week" ? "this week in the box" : "a final page from the box"}</p>
      {summary ? (
        <div className="archive-ai-paper">
          <small>a little summary, made from your box ✦</small>
          <p>{summary}</p>
          {stale && <em>more things have been added since this page was made.</em>}
          <div className="reflection-paper-actions">
            {sources.length > 0 && <button type="button" onClick={onToggleSources}>{sourcesOpen ? "hide what this came from" : "what this came from"}</button>}
            <button type="button" onClick={onHide}>hide</button>
            {owner && <button type="button" onClick={onRegenerate} disabled={busy}>{busy ? "looking through the box…" : "regenerate summary"}</button>}
          </div>
          {sourcesOpen && <SourceScraps sources={sources} />}
        </div>
      ) : (
        <button type="button" onClick={onGenerate} disabled={busy || !completed || !hasEntries || !owner}>
          {busy ? "looking through the box…" : !hasEntries ? "not enough left here to summarize" : !completed ? `available when this ${view} is complete` : owner ? "make a gentle summary ✦" : "the box hasn’t written this page yet"}
        </button>
      )}
      {busy && <span className="paper-flip" aria-hidden="true">▱ ▰ ▱</span>}
      {message && <small className="summary-message">{message}</small>}
    </section>
  );
}

function SourceScraps({ sources }: { sources: ReflectionSource[] }) {
  return <div className="source-scraps" aria-label="Original entries supporting this AI reflection">{sources.map((source) => (
    <a href={`/sessions/${source.sessionSlug}`} target="_top" key={source.id}>
      <time>{shortDate(source.date)}</time><strong>{source.label}</strong><small>{source.sessionName}</small>
    </a>
  ))}</div>;
}

function MonthStory({ entries, period }: { entries: ContentEntry[]; period: MemoryPeriod }) {
  if (!entries.length) return <section className="archive-empty"><span>○</span><p>nothing has settled into {period.label} yet.</p></section>;
  const story = monthlyMemory(entries);
  const busiest = story.sessionCounts[0];
  return (
    <section className="month-story" aria-label={`${period.label} scrapbook recap`}>
      <header className="month-cover-spread"><span>the box looked back</span><h2>{period.label.split(" ")[0]} in the box</h2><p><b>{story.total}</b> little thing{story.total === 1 ? "" : "s"} stayed here.</p></header>

      <div className="month-spread session-spread">
        <p className="spread-kicker">the corners you returned to</p>
        <div>{story.sessionCounts.slice(0, 6).map(({ slug, count }, index) => <a href={`/sessions/${slug}`} target="_top" style={{ "--turn": `${index % 2 ? 1 : -1}deg` } as React.CSSProperties} key={slug}><b>{count}</b><span>{getSession(slug)?.name ?? slug}</span></a>)}</div>
        {busiest && <small>The fullest corner was <em>{getSession(busiest.slug)?.name ?? busiest.slug}</em>.</small>}
      </div>

      {story.photos.length > 0 && <div className="month-spread photo-spread"><p className="spread-kicker">a few things that looked back</p><div>{story.photos.slice(0, 4).map((entry, index) => <a href={`/sessions/${entry.sessionSlug}`} target="_top" className={`polaroid polaroid-${index + 1}`} key={entry.id}><img src={`/media/${entry.images[0].objectKey}`} alt={entry.images[0].altText || entryLabel(entry)} /><span>{entryLabel(entry)}</span></a>)}</div></div>}

      {(story.listening.length > 0 || story.reading.length > 0 || story.making.length > 0) && <div className="month-spread kept-shelves">
        <MemoryShelf symbol="♫" title="things that played" entries={story.listening} />
        <MemoryShelf symbol="▤" title="pages that stayed" entries={story.reading} />
        <MemoryShelf symbol="✂" title="things made or tried" entries={story.making} />
      </div>}

      {(story.recurringWords.length > 0 || story.quotes.length > 0) && <div className="month-spread words-spread">
        <div><p className="spread-kicker">words that kept turning up</p><p className="word-cloud">{story.recurringWords.map(({ word, count }) => <span style={{ fontSize: `${Math.min(1.55, .78 + count * .13)}em` }} key={word}>{word}</span>)}</p></div>
        <div><p className="spread-kicker">lines Cynthia left here</p>{story.quotes.slice(0, 3).map((entry) => <blockquote key={entry.id}>“{clip(entry.shortText || entry.note || entry.longText || "", 105)}”<a href={`/sessions/${entry.sessionSlug}`} target="_top">{shortDate(entryDay(entry))} ↗</a></blockquote>)}</div>
      </div>}

      {story.connections.length > 0 && <div className="month-spread connection-spread"><p className="spread-kicker">threads across different corners</p>{story.connections.map((connection) => <div key={`${connection.left.id}-${connection.right.id}`}><a href={`/sessions/${connection.left.sessionSlug}`} target="_top">{entryLabel(connection.left)}</a><span>⤳{connection.shared.length ? ` ${connection.shared.join(" · ")} ` : " around the same days "}⤳</span><a href={`/sessions/${connection.right.sessionSlug}`} target="_top">{entryLabel(connection.right)}</a></div>)}</div>}
    </section>
  );
}

function MemoryShelf({ symbol, title, entries }: { symbol: string; title: string; entries: ContentEntry[] }) {
  if (!entries.length) return null;
  return <section><span>{symbol}</span><h3>{title}</h3>{entries.slice(0, 4).map((entry) => <a href={`/sessions/${entry.sessionSlug}`} target="_top" key={entry.id}>{entryLabel(entry)}</a>)}</section>;
}

function MonthPicker({ selected, today, onChoose }: { selected: string; today: string; onChoose: (day: string) => void }) {
  const date = parseDay(selected); const year = date.getUTCFullYear(); const month = date.getUTCMonth();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  return <div className="archive-month-picker"><div aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div>{cells.map((day, index) => day ? (() => { const key = toDay(new Date(Date.UTC(year, month, day))); return <button type="button" className={`${key === selected ? "selected " : ""}${key === today ? "today" : ""}`} onClick={() => onChoose(key)} key={day}>{day}</button>; })() : <span key={`blank-${index}`} />)}</div></div>;
}

function ArchiveFlow({ view, period, entries }: { view: View; period: MemoryPeriod; entries: ContentEntry[] }) {
  if (!entries.length) return <section className="archive-empty"><span>○</span><p>nothing left here {view === "day" ? "that day" : `that ${view}`}.</p></section>;
  if (view === "day") return <section className="archive-flow"><DayGroup day={period.start} entries={entries} /></section>;
  if (view === "week") { const days = Array.from({ length: 7 }, (_, index) => addDays(period.start, index)); return <section className="archive-flow week-flow">{days.map((day) => <DayGroup day={day} entries={entries.filter((entry) => entryDay(entry) === day)} key={day} quiet />)}</section>; }
  const weeks = groupMonthWeeks(period.start, period.end, entries);
  return <section className="archive-flow month-flow">{weeks.map((week, index) => <section className="archive-week" key={week.start}><header><span>↓</span><h2>week {index + 1}</h2><small>{shortDate(week.start)} — {shortDate(week.end)}</small></header>{week.entries.length ? groupByDay(week.entries).map(([day, items]) => <DayGroup day={day} entries={items} key={day} quiet />) : <p className="quiet-week">nothing tucked in during this stretch.</p>}</section>)}</section>;
}

function DayGroup({ day, entries, quiet = false }: { day: string; entries: ContentEntry[]; quiet?: boolean }) {
  return <section className={`archive-day${quiet ? " quiet-day" : ""}`}><header><time dateTime={day}>{prettyDate(day)}</time><span>{entries.length ? `${entries.length} kept` : "quiet"}</span></header>{entries.length ? <div className="day-keeps">{entries.map((entry, index) => <ArchiveEntry entry={entry} index={index} key={entry.id} />)}</div> : <p>nothing left here that day.</p>}</section>;
}

function ArchiveEntry({ entry, index }: { entry: ContentEntry; index: number }) {
  const session = getSession(entry.sessionSlug);
  return <article className={`archive-entry archive-${sessionTone(entry.sessionSlug)} archive-turn-${(index % 3) + 1}`}><span className="archive-fastener" aria-hidden="true" />{entry.images[0] && <figure><img src={`/media/${entry.images[0].objectKey}`} alt={entry.images[0].altText || entryLabel(entry)} /></figure>}<div><small>{session?.name || entry.sessionSlug}</small><h3>{entryLabel(entry)}</h3><p>{entryExcerpt(entry)}</p>{entry.creator && <em>{entry.creator}</em>}<a href={`/sessions/${entry.sessionSlug}`} target="_top">back to its room ↗</a></div></article>;
}

function groupMonthWeeks(start: string, end: string, entries: ContentEntry[]) { const weeks: Array<{ start: string; end: string; entries: ContentEntry[] }> = []; let cursor = parseDay(start); while (toDay(cursor) <= end) { const weekStart = toDay(cursor); const weekEnd = addDays(weekStart, Math.min(6, Math.floor((parseDay(end).getTime() - cursor.getTime()) / 86_400_000))); weeks.push({ start: weekStart, end: weekEnd, entries: entries.filter((entry) => entryDay(entry) >= weekStart && entryDay(entry) <= weekEnd) }); cursor = parseDay(addDays(weekEnd, 1)); } return weeks; }
function groupByDay(entries: ContentEntry[]) { const groups = new Map<string, ContentEntry[]>(); entries.forEach((entry) => groups.set(entryDay(entry), [...(groups.get(entryDay(entry)) || []), entry])); return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0])); }
function clip(value: string, length: number) { const clean = value.replace(/\s+/g, " ").trim(); return clean.length > length ? `${clean.slice(0, length - 1).trim()}…` : clean; }
function updateAddress(view: View, date: string) { window.history.replaceState(null, "", `?view=${view}&date=${date}`); }
