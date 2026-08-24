"use client";

import { useMemo, useState } from "react";
import type { ContentEntry } from "../../../lib/content-store";
import { dateKey, entryDay, entryExcerpt, entryLabel, sessionTone } from "../../../lib/timeline";
import { getSession } from "../../../lib/sessions";

type View = "day" | "week" | "month";

export default function TimeArchive({ entries, initialView, initialDate }: { entries: ContentEntry[]; initialView: View; initialDate?: string }) {
  const today = dateKey(new Date());
  const [view, setView] = useState<View>(initialView);
  const [selected, setSelected] = useState(initialDate || today);
  const [summary, setSummary] = useState("");
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryMessage, setSummaryMessage] = useState("");

  const datedEntries = useMemo(
    () => [...entries].sort((a, b) => entryDay(b).localeCompare(entryDay(a)) || b.createdAt - a.createdAt),
    [entries],
  );
  const period = useMemo(() => periodFor(view, selected), [view, selected]);
  const periodEntries = useMemo(
    () => datedEntries.filter((entry) => entryDay(entry) >= period.start && entryDay(entry) <= period.end),
    [datedEntries, period],
  );

  function chooseView(next: View) {
    setView(next);
    setSummary("");
    setSummaryMessage("");
    updateAddress(next, selected);
  }

  function chooseDate(next: string) {
    setSelected(next);
    setSummary("");
    setSummaryMessage("");
    updateAddress(view, next);
  }

  function move(direction: -1 | 1) {
    const date = parseDay(selected);
    if (view === "day") date.setUTCDate(date.getUTCDate() + direction);
    if (view === "week") date.setUTCDate(date.getUTCDate() + direction * 7);
    if (view === "month") date.setUTCMonth(date.getUTCMonth() + direction, 1);
    chooseDate(toDay(date));
  }

  async function makeSummary() {
    if (view === "day") return;
    setSummaryBusy(true);
    setSummary("");
    setSummaryMessage("");
    const response = await fetch("/api/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "period", granularity: view, start: period.start, end: period.end }),
    });
    const result = (await response.json().catch(() => ({}))) as { reflection?: string; error?: string };
    setSummaryBusy(false);
    if (result.reflection) setSummary(result.reflection);
    else setSummaryMessage(result.error || "the box stayed quiet this time.");
  }

  const completed = period.end < today;

  return (
    <main className="time-archive">
      <span className="archive-grain" aria-hidden="true" />
      <header className="archive-heading">
        {/* The site runs inside an embedded browser; target=_top intentionally leaves the archive room. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" target="_top">← back to the desk</a>
        <p>the calendar on the wall</p>
        <h1>the box, over time</h1>
        <small>the same little things, arranged by when they happened to stay</small>
      </header>

      <section className="archive-calendar-paper" aria-label="Choose a date and archive view">
        <div className="archive-view-tabs">
          {(["day", "week", "month"] as View[]).map((item) => (
            <button type="button" className={view === item ? "active" : ""} onClick={() => chooseView(item)} key={item}>{item}</button>
          ))}
        </div>
        <div className="archive-period-nav">
          <button type="button" onClick={() => move(-1)} aria-label={`Previous ${view}`}>←</button>
          <strong>{period.label}</strong>
          <button type="button" onClick={() => move(1)} aria-label={`Next ${view}`}>→</button>
        </div>
        <MonthPicker selected={selected} today={today} onChoose={(day) => chooseDate(day)} />
        <button className="archive-today" type="button" onClick={() => chooseDate(today)}>return to today · {prettyDate(today)}</button>
      </section>

      {view === "month" && <MonthChapter entries={periodEntries} label={period.label} />}

      {view !== "day" && (
        <section className="period-reflection-slot">
          <p>{view === "week" ? "this week in the box" : `${monthWord(selected)} in the box`}</p>
          {summary ? (
            <div className="archive-ai-paper">
              <small>a little summary, made from your box ✦</small>
              <p>{summary}</p>
              <div><button type="button" onClick={() => setSummary("")}>hide</button><button type="button" onClick={makeSummary}>regenerate</button></div>
            </div>
          ) : (
            <button type="button" onClick={makeSummary} disabled={summaryBusy || !completed || periodEntries.length === 0}>
              {summaryBusy ? "reading the scraps…" : !completed ? `available when this ${view} is complete` : periodEntries.length ? "make a gentle summary ✦" : "not enough left here to summarize"}
            </button>
          )}
          {summaryMessage && <small className="summary-message">{summaryMessage}</small>}
        </section>
      )}

      <ArchiveFlow view={view} period={period} entries={periodEntries} />
    </main>
  );
}

function MonthPicker({ selected, today, onChoose }: { selected: string; today: string; onChoose: (day: string) => void }) {
  const date = parseDay(selected);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  return (
    <div className="archive-month-picker">
      <div aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div>{cells.map((day, index) => day ? (() => {
        const key = toDay(new Date(Date.UTC(year, month, day)));
        return <button type="button" className={`${key === selected ? "selected " : ""}${key === today ? "today" : ""}`} onClick={() => onChoose(key)} key={day}>{day}</button>;
      })() : <span key={`blank-${index}`} />)}</div>
    </div>
  );
}

function MonthChapter({ entries, label }: { entries: ContentEntry[]; label: string }) {
  if (!entries.length) return null;
  const counts = new Map<string, number>();
  entries.forEach((entry) => counts.set(entry.sessionSlug, (counts.get(entry.sessionSlug) || 0) + 1));
  const favorite = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const name = favorite ? getSession(favorite)?.name || favorite : "the box";
  return (
    <aside className="month-chapter">
      <span>chapter note</span>
      <strong>{label}</strong>
      <p>{entries.length} little thing{entries.length === 1 ? "" : "s"} stayed. The busiest corner was <em>{name}</em>.</p>
    </aside>
  );
}

function ArchiveFlow({ view, period, entries }: { view: View; period: ReturnType<typeof periodFor>; entries: ContentEntry[] }) {
  if (!entries.length) return <section className="archive-empty"><span>○</span><p>nothing left here {view === "day" ? "that day" : `that ${view}`}.</p></section>;

  if (view === "day") {
    return <section className="archive-flow"><DayGroup day={period.start} entries={entries} /></section>;
  }

  if (view === "week") {
    const days = Array.from({ length: 7 }, (_, index) => addDays(period.start, index));
    return <section className="archive-flow week-flow">{days.map((day) => <DayGroup day={day} entries={entries.filter((entry) => entryDay(entry) === day)} key={day} quiet />)}</section>;
  }

  const weeks = groupMonthWeeks(period.start, period.end, entries);
  return (
    <section className="archive-flow month-flow">
      {weeks.map((week, index) => (
        <section className="archive-week" key={week.start}>
          <header><span>↓</span><h2>week {index + 1}</h2><small>{shortDate(week.start)} — {shortDate(week.end)}</small></header>
          {week.entries.length ? groupByDay(week.entries).map(([day, items]) => <DayGroup day={day} entries={items} key={day} quiet />) : <p className="quiet-week">nothing tucked in during this stretch.</p>}
        </section>
      ))}
    </section>
  );
}

function DayGroup({ day, entries, quiet = false }: { day: string; entries: ContentEntry[]; quiet?: boolean }) {
  return (
    <section className={`archive-day${quiet ? " quiet-day" : ""}`}>
      <header><time dateTime={day}>{prettyDate(day)}</time><span>{entries.length ? `${entries.length} kept` : "quiet"}</span></header>
      {entries.length ? <div className="day-keeps">{entries.map((entry, index) => <ArchiveEntry entry={entry} index={index} key={entry.id} />)}</div> : <p>nothing left here that day.</p>}
    </section>
  );
}

function ArchiveEntry({ entry, index }: { entry: ContentEntry; index: number }) {
  const session = getSession(entry.sessionSlug);
  return (
    <article className={`archive-entry archive-${sessionTone(entry.sessionSlug)} archive-turn-${(index % 3) + 1}`}>
      <span className="archive-fastener" aria-hidden="true" />
      {entry.images[0] && <figure><img src={`/media/${entry.images[0].objectKey}`} alt={entry.images[0].altText || entryLabel(entry)} /></figure>}
      <div>
        <small>{session?.name || entry.sessionSlug}</small>
        <h3>{entryLabel(entry)}</h3>
        <p>{entryExcerpt(entry)}</p>
        {entry.creator && <em>{entry.creator}</em>}
        <a href={`/sessions/${entry.sessionSlug}`} target="_top">back to its room ↗</a>
      </div>
    </article>
  );
}

function periodFor(view: View, selected: string) {
  const date = parseDay(selected);
  if (view === "day") return { start: selected, end: selected, label: prettyDate(selected) };
  if (view === "week") {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    const start = new Date(date); start.setUTCDate(start.getUTCDate() - mondayOffset);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
    return { start: toDay(start), end: toDay(end), label: `${prettyDate(toDay(start))} — ${prettyDate(toDay(end))}` };
  }
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: toDay(start), end: toDay(end), label: new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(start) };
}

function groupMonthWeeks(start: string, end: string, entries: ContentEntry[]) {
  const weeks: Array<{ start: string; end: string; entries: ContentEntry[] }> = [];
  let cursor = parseDay(start);
  while (toDay(cursor) <= end) {
    const weekStart = toDay(cursor);
    const weekEnd = addDays(weekStart, Math.min(6, Math.floor((parseDay(end).getTime() - cursor.getTime()) / 86_400_000)));
    weeks.push({ start: weekStart, end: weekEnd, entries: entries.filter((entry) => entryDay(entry) >= weekStart && entryDay(entry) <= weekEnd) });
    cursor = parseDay(addDays(weekEnd, 1));
  }
  return weeks;
}

function groupByDay(entries: ContentEntry[]) {
  const groups = new Map<string, ContentEntry[]>();
  entries.forEach((entry) => groups.set(entryDay(entry), [...(groups.get(entryDay(entry)) || []), entry]));
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function parseDay(value: string) { return new Date(`${value}T12:00:00Z`); }
function toDay(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(value: string, count: number) { const date = parseDay(value); date.setUTCDate(date.getUTCDate() + count); return toDay(date); }
function prettyDate(value: string) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(parseDay(value)); }
function shortDate(value: string) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }).format(parseDay(value)); }
function monthWord(value: string) { return new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(parseDay(value)); }
function updateAddress(view: View, date: string) { window.history.replaceState(null, "", `?view=${view}&date=${date}`); }
