"use client";

import { useState } from "react";

const FLAGS = ["bms", "client", "payments", "misc"];
const PRIOS = [
  { id: "high", label: "High" },
  { id: "med", label: "Medium" },
  { id: "low", label: "Low" },
];

export default function TaskModal({ column, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState(null);
  const [flags, setFlags] = useState([]);

  function toggleFlag(f) {
    setFlags((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      notes: notes.trim(),
      dueDate: dueDate || null,
      priority,
      flags,
      column,
      source: "manual",
    });
  }

  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>New card</h3>
        <form onSubmit={submit}>
          <div className="field">
            <label>Title</label>
            <input
              className="input"
              autoFocus
              placeholder="What needs doing?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Notes (optional)</label>
            <textarea
              className="input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Due date (optional)</label>
            <input
              className="input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Priority</label>
            <div className="chip-row">
              {PRIOS.map((p) => (
                <span
                  key={p.id}
                  className={`chip ${priority === p.id ? "on" : ""}`}
                  onClick={() => setPriority(priority === p.id ? null : p.id)}
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Flags</label>
            <div className="chip-row">
              {FLAGS.map((f) => (
                <span
                  key={f}
                  className={`chip ${flags.includes(f) ? "on" : ""}`}
                  onClick={() => toggleFlag(f)}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
