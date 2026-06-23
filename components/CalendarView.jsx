"use client";

import { useState } from "react";

// Groups events by their day label (preserving date order), then renders each
// day with its meetings.
function groupByDay(events) {
  const sorted = [...events].sort((a, b) => {
    const da = a.date || "9999";
    const db = b.date || "9999";
    if (da !== db) return da < db ? -1 : 1;
    return (a.time || "").localeCompare(b.time || "");
  });
  const groups = [];
  const byKey = {};
  for (const e of sorted) {
    const key = e.day || e.date || "Unscheduled";
    if (!byKey[key]) {
      byKey[key] = { day: key, items: [] };
      groups.push(byKey[key]);
    }
    byKey[key].items.push(e);
  }
  return groups;
}

export default function CalendarView({ events = [], onDelete, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ day: "", time: "", title: "", location: "", bring: "" });

  const groups = groupByDay(events);

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAdd({ ...form, title: form.title.trim() });
    setForm({ day: "", time: "", title: "", location: "", bring: "" });
    setAdding(false);
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
          <input className="input" placeholder="Day (e.g. Tuesday, June 23)" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} />
          <input className="input" placeholder="Time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          <input className="input" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className="input" placeholder="Bring / prep" value={form.bring} onChange={(e) => setForm({ ...form, bring: e.target.value })} />
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
      )}

      {groups.length === 0 ? (
        <p className="muted">No meetings yet. They sync in with your weekly run, or add one above.</p>
      ) : (
        <div className="cal-days">
          {groups.map((g) => (
            <div key={g.day} className="cal-day">
              <div className="cal-day-label">{g.day}</div>
              {g.items.map((e) => (
                <div key={e.id} className="cal-event">
                  <div className="cal-event-top">
                    {e.time && <span className="cal-time">{e.time}</span>}
                    <span className="cal-title">{e.title}</span>
                    <button className="mini-del" onClick={() => { if (window.confirm('Delete this meeting?')) onDelete(e.id); }} aria-label="Remove">×</button>
                  </div>
                  {e.location && <div className="cal-loc">📍 {e.location}</div>}
                  {e.attendees && <div className="cal-att">👥 {e.attendees}</div>}
                  {e.bring && <div className="cal-bring">Bring: {e.bring}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
