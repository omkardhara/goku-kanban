"use client";

import { useMemo, useState } from "react";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function gcalSearchUrl(title) {
  return "https://calendar.google.com/calendar/r/search?q=" + encodeURIComponent(title);
}

function labelForDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// Weekly-synced events only carry a free-text label like "Monday, June 29"
// (no year, sometimes wrapped as "Just outside this week (Tuesday, July 7)").
// Recover a real date by finding the nearest year where that weekday lands
// on that month/day. Manually created or edited events always carry a
// proper `date` and skip this entirely.
function parseDayLabel(label) {
  if (!label) return null;
  const inner = /\(([^)]+)\)\s*$/.exec(label);
  const text = (inner ? inner[1] : label).trim();
  const m = /^([a-z]+),\s*([a-z]+)\s+(\d{1,2})/i.exec(text);
  if (!m) return null;
  return { weekday: m[1].toLowerCase(), month: m[2], dayNum: +m[3] };
}
function resolveDate(e) {
  if (e.date) return e.date;
  const parsed = parseDayLabel(e.day);
  if (!parsed) return null;
  const thisYear = new Date().getFullYear();
  for (const year of [thisYear, thisYear + 1, thisYear - 1]) {
    const d = new Date(`${parsed.month} ${parsed.dayNum}, ${year}`);
    if (!isNaN(d) && WEEKDAYS[d.getDay()] === parsed.weekday) return d.toISOString().slice(0, 10);
  }
  return null;
}
function mondayOf(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}
function buildWeek() {
  const monday = mondayOf(new Date().toISOString().slice(0, 10));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, label: labelForDate(iso) });
  }
  return days;
}

const emptyForm = { date: "", time: "", title: "", location: "", bring: "", link: "" };

export default function CalendarView({ events = [], onDelete, onAdd, onUpdate }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);

  const week = useMemo(() => buildWeek(), []);
  const weekDates = useMemo(() => new Set(week.map((d) => d.date)), [week]);

  const { byDate, other } = useMemo(() => {
    const byDate = {};
    const other = [];
    for (const e of events) {
      const d = resolveDate(e);
      if (d && weekDates.has(d)) (byDate[d] ||= []).push(e);
      else other.push(e);
    }
    for (const list of Object.values(byDate)) list.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    other.sort((a, b) => (a.date || a.day || "").localeCompare(b.date || b.day || ""));
    return { byDate, other };
  }, [events, weekDates]);

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const day = form.date ? labelForDate(form.date) : "";
    onAdd({ ...form, title: form.title.trim(), day });
    setForm(emptyForm);
    setAdding(false);
  }

  function startEdit(e) {
    setEditingId(e.id);
    setEditForm({
      date: resolveDate(e) || "", time: e.time || "", title: e.title || "",
      location: e.location || "", link: e.link || "", bring: e.bring || "",
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }
  function submitEdit(e) {
    e.preventDefault();
    if (!editForm.title.trim()) return;
    const day = editForm.date ? labelForDate(editForm.date) : "";
    onUpdate(editingId, { ...editForm, title: editForm.title.trim(), day });
    cancelEdit();
  }

  function relink(ev) {
    const next = window.prompt(`New meeting link for "${ev.title}" (leave blank to clear):`, ev.link || "");
    if (next === null) return;
    onUpdate(ev.id, { link: next.trim() });
  }

  function handleDrop(targetDate, e) {
    e.preventDefault();
    setDragOverDate(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const ev = events.find((x) => x.id === id);
    if (!ev || resolveDate(ev) === targetDate) return;
    onUpdate(id, { date: targetDate, day: labelForDate(targetDate) });
  }

  function renderEvent(e) {
    const editing = editingId === e.id;
    return (
      <div
        key={e.id}
        className="cal-event"
        draggable={!editing}
        onDragStart={(ev) => {
          ev.dataTransfer.setData("text/plain", e.id);
          ev.dataTransfer.effectAllowed = "move";
          ev.currentTarget.classList.add("dragging");
        }}
        onDragEnd={(ev) => ev.currentTarget.classList.remove("dragging")}
      >
        {editing ? (
          <form className="cal-edit" onSubmit={submitEdit}>
            <input className="input" type="date" value={editForm.date} onChange={(ev) => setEditForm({ ...editForm, date: ev.target.value })} />
            <input className="input" placeholder="Time" value={editForm.time} onChange={(ev) => setEditForm({ ...editForm, time: ev.target.value })} />
            <input className="input" placeholder="Title" value={editForm.title} onChange={(ev) => setEditForm({ ...editForm, title: ev.target.value })} autoFocus />
            <input className="input" placeholder="Location" value={editForm.location} onChange={(ev) => setEditForm({ ...editForm, location: ev.target.value })} />
            <input className="input" placeholder="Meeting link" value={editForm.link} onChange={(ev) => setEditForm({ ...editForm, link: ev.target.value })} />
            <input className="input" placeholder="Bring / prep" value={editForm.bring} onChange={(ev) => setEditForm({ ...editForm, bring: ev.target.value })} />
            <div className="cal-edit-actions">
              <button className="btn btn-primary" type="submit">Save</button>
              <button className="btn" type="button" onClick={cancelEdit}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div className="cal-event-top">
              {e.time && <span className="cal-time">{e.time}</span>}
              <a
                className="cal-title cal-title-link"
                href={e.link || gcalSearchUrl(e.title)}
                target="_blank"
                rel="noreferrer"
                title={e.link ? "Open meeting link" : "Search in Google Calendar"}
              >{e.title}</a>
              <button type="button" className="mini-act" title="Relink meeting URL" onClick={() => relink(e)}>🔗</button>
              <button type="button" className="mini-act" title="Edit date, time or link" onClick={() => startEdit(e)}>✎</button>
              <button type="button" className="mini-del" onClick={() => { if (window.confirm("Delete this meeting?")) onDelete(e.id); }} aria-label="Remove">×</button>
            </div>
            {e.location && <div className="cal-loc">📍 {e.location}</div>}
            {e.attendees && <div className="cal-att">👥 {e.attendees}</div>}
            {e.bring && <div className="cal-bring">Bring: {e.bring}</div>}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="view-pane">
      <div className="view-head">
        <h2>This week's meetings</h2>
        <button className="btn btn-primary" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "+ Add meeting"}
        </button>
      </div>

      {adding && (
        <form className="cal-add" onSubmit={submit}>
          <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className="input" placeholder="Time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          <input className="input" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className="input" placeholder="Meeting link (optional)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <input className="input" placeholder="Bring / prep" value={form.bring} onChange={(e) => setForm({ ...form, bring: e.target.value })} />
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
      )}

      <p className="muted cal-hint">Drag a meeting onto another day to reschedule it, or use ✎ to edit the date/time/link directly.</p>

      <div className="cal-week">
        {week.map((d) => (
          <div
            key={d.date}
            className={`cal-day${dragOverDate === d.date ? " cal-day-dragover" : ""}`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOverDate !== d.date) setDragOverDate(d.date); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverDate(null); }}
            onDrop={(e) => handleDrop(d.date, e)}
          >
            <div className="cal-day-label">{d.label}</div>
            {(byDate[d.date] || []).length === 0 ? (
              <div className="cal-day-empty muted">No meetings</div>
            ) : (
              byDate[d.date].map(renderEvent)
            )}
          </div>
        ))}
      </div>

      {other.length > 0 && (
        <>
          <div className="closed-head">Other meetings</div>
          <div className="cal-days">
            <div className="cal-day cal-day-loose">{other.map(renderEvent)}</div>
          </div>
        </>
      )}

      {events.length === 0 && (
        <p className="muted">No meetings yet. They sync in with your weekly run, or add one above.</p>
      )}
    </div>
  );
}
