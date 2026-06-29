"use client";

import { useEffect, useState } from "react";

const FLAGS = ["bms", "client", "payments", "misc"];
const PRIOS = [
  { id: "high", label: "High" },
  { id: "med", label: "Medium" },
  { id: "low", label: "Low" },
];
const COLS = [
  { id: "todo", label: "This Week" },
  { id: "doing", label: "In Progress" },
  { id: "done", label: "Done" },
  { id: "archive", label: "Archive" },
];

export default function CardModal({
  task,
  onClose,
  onUpdate,
  onMove,
  onDelete,
  onToggleCheck,
  onAddCheck,
  onDelCheck,
  onAddLink,
  onDelLink,
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || "");
  const [newCheck, setNewCheck] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes || "");
  }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const checks = task.checklist || [];
  const links = task.links || [];
  const doneCount = checks.filter((c) => c.done).length;
  const pct = checks.length ? Math.round((doneCount / checks.length) * 100) : 0;

  function saveTitle() {
    const v = title.trim();
    if (v && v !== task.title) onUpdate(task.id, { title: v });
  }
  function saveNotes() {
    if (notes !== task.notes) onUpdate(task.id, { notes });
  }
  function toggleFlag(f) {
    const cur = task.flags || [];
    const next = cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f];
    onUpdate(task.id, { flags: next });
  }
  function setPrio(p) {
    onUpdate(task.id, { priority: task.priority === p ? null : p });
  }
  function submitCheck(e) {
    e.preventDefault();
    const v = newCheck.trim();
    if (v) onAddCheck(task.id, v);
    setNewCheck("");
  }
  function submitLink(e) {
    e.preventDefault();
    let url = linkUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    onAddLink(task.id, linkLabel.trim() || url, url);
    setLinkUrl("");
    setLinkLabel("");
  }

  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <textarea
          className="title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          rows={2}
        />

        <div className="row-controls">
          <select
            className="select"
            value={task.column}
            onChange={(e) => onMove(task.id, e.target.value)}
          >
            {COLS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <input
            className="input"
            type="date"
            value={task.dueDate || ""}
            onChange={(e) => onUpdate(task.id, { dueDate: e.target.value || null })}
            style={{ maxWidth: 170 }}
          />
        </div>

        <div className="field">
          <label>Priority</label>
          <div className="chip-row">
            {PRIOS.map((p) => (
              <span key={p.id} className={`chip ${task.priority === p.id ? "on" : ""}`} onClick={() => setPrio(p.id)}>
                {p.label}
              </span>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Flags</label>
          <div className="chip-row">
            {FLAGS.map((f) => (
              <span key={f} className={`chip ${(task.flags || []).includes(f) ? "on" : ""}`} onClick={() => toggleFlag(f)}>
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Description</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Add more detail…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
          />
        </div>

        <div className="field">
          <label>Checklist {checks.length > 0 && `(${doneCount}/${checks.length})`}</label>
          {checks.length > 0 && (
            <div className="check-progress" style={{ marginBottom: 8 }}>
              <div style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="checklist">
            {checks.map((c) => (
              <div key={c.id} className={`check ${c.done ? "done" : ""}`}>
                <input type="checkbox" checked={c.done} onChange={() => onToggleCheck(task.id, c.id)} />
                <span style={{ flex: 1 }}>{c.text}</span>
                <button className="mini-del" onClick={() => onDelCheck(task.id, c.id)} aria-label="Remove">×</button>
              </div>
            ))}
          </div>
          <form onSubmit={submitCheck}>
            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder="Add a checklist item + Enter"
              value={newCheck}
              onChange={(e) => setNewCheck(e.target.value)}
            />
          </form>
        </div>

        <div className="field">
          <label>Links & attachments</label>
          <div className="links">
            {links.map((l) => (
              <div key={l.id} className="link-row">
                <a href={l.url} target="_blank" rel="noreferrer">🔗 {l.label}</a>
                <button className="mini-del" onClick={() => onDelLink(task.id, l.id)} aria-label="Remove">×</button>
              </div>
            ))}
          </div>
          <form onSubmit={submitLink} className="link-form">
            <input className="input" placeholder="Paste a URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            <input className="input" placeholder="Label (optional)" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
            <button className="btn" type="submit">Add</button>
          </form>
        </div>

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={() => { if (window.confirm(`Delete "${task.title}"?`)) onDelete(task.id); }}>Delete card</button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
