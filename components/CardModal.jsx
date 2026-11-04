"use client";

import { useEffect, useState } from "react";

const FLAGS = ["bms", "client", "payments", "misc"];
const PRIOS = [
  { id: "high", label: "High" },
  { id: "med", label: "Medium" },
  { id: "low", label: "Low" },
];
export default function CardModal({
  task,
  columns,
  onClose,
  onUpdate,
  onMove,
  onDelete,
  onToggleCheck,
  onAddCheck,
  onAddList,
  onRenameList,
  onDelList,
  onUpdateCheck,
  onDelCheck,
  onReorderCheck,
  onAddLink,
  onDelLink,
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || "");
  const [newChecks, setNewChecks] = useState({});
  const [newListTitle, setNewListTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [editingCheckId, setEditingCheckId] = useState(null);
  const [editingCheckText, setEditingCheckText] = useState("");
  const [dragOverCheckId, setDragOverCheckId] = useState(null);
  const [dragCheckPos, setDragCheckPos] = useState("after");

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes || "");
  }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const cols = [...(columns || []), { id: "archive", title: "Archive" }];
  const checks = task.checklist || [];
  const lists = [{ id: "", title: "Checklist" }, ...(task.checklists || [])];
  const links = task.links || [];

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
  function submitCheck(e, listId) {
    e.preventDefault();
    const v = (newChecks[listId] || "").trim();
    if (v) onAddCheck(task.id, v, listId || undefined);
    setNewChecks((m) => ({ ...m, [listId]: "" }));
  }
  function submitList(e) {
    e.preventDefault();
    const v = newListTitle.trim();
    if (v) onAddList(task.id, v);
    setNewListTitle("");
  }
  function startEditCheck(item) {
    setEditingCheckId(item.id);
    setEditingCheckText(item.text);
  }
  function commitEditCheck() {
    const v = editingCheckText.trim();
    if (v) onUpdateCheck(task.id, editingCheckId, v);
    setEditingCheckId(null);
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
            {cols.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
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

        {lists.map((list) => {
          const listChecks = checks.filter((c) => (c.list || "") === list.id);
          const ld = listChecks.filter((c) => c.done).length;
          const lp = listChecks.length ? Math.round((ld / listChecks.length) * 100) : 0;
          return (
        <div className="field" key={list.id || "main"}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {list.id ? (
              <input
                className="input"
                style={{ flex: 1, padding: "2px 6px" }}
                defaultValue={list.title}
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== list.title) onRenameList(task.id, list.id, v); }}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              />
            ) : (
              <span style={{ flex: 1 }}>{list.title}</span>
            )}
            {listChecks.length > 0 && <span>({ld}/{listChecks.length})</span>}
            {list.id && (
              <button type="button" className="mini-del" aria-label="Delete checklist"
                onClick={() => { if (window.confirm(`Delete checklist "${list.title}"?`)) onDelList(task.id, list.id); }}>×</button>
            )}
          </label>
          {listChecks.length > 0 && (
            <div className="check-progress" style={{ marginBottom: 8 }}>
              <div style={{ width: `${lp}%` }} />
            </div>
          )}
              <div className="checklist">
                {listChecks.map((c) => (
                  <div
                    key={c.id}
                    className={`check-slot${dragOverCheckId === c.id ? ` insert-${dragCheckPos}` : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setDragOverCheckId(c.id);
                      setDragCheckPos(e.clientY < rect.top + rect.height / 2 ? "before" : "after");
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCheckId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const pos = dragCheckPos;
                      setDragOverCheckId(null);
                      const draggedId = e.dataTransfer.getData("text/plain");
                      if (draggedId && draggedId !== c.id) onReorderCheck(task.id, draggedId, c.id, pos);
                    }}
                  >
                    <div className={`check ${c.done ? "done" : ""}`}>
                      <span
                        className="check-drag-handle"
                        draggable
                        title="Drag to reorder"
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", c.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                      >⠿</span>
                      <input type="checkbox" checked={c.done} onChange={() => onToggleCheck(task.id, c.id)} />
                      {editingCheckId === c.id ? (
                        <input
                          className="input check-edit-input"
                          autoFocus
                          value={editingCheckText}
                          onChange={(e) => setEditingCheckText(e.target.value)}
                          onBlur={commitEditCheck}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") { e.stopPropagation(); setEditingCheckId(null); }
                          }}
                        />
                      ) : (
                        <span style={{ flex: 1 }} title="Click to edit" onClick={() => startEditCheck(c)}>{c.text}</span>
                      )}
                      <button className="mini-del" onClick={() => onDelCheck(task.id, c.id)} aria-label="Remove">×</button>
                    </div>
                  </div>
                ))}
              </div>
          <form onSubmit={(e) => submitCheck(e, list.id)}>
            <input
              className="input"
              style={{ marginTop: 8 }}
              placeholder="Add a checklist item + Enter"
              value={newChecks[list.id] || ""}
              onChange={(e) => setNewChecks((m) => ({ ...m, [list.id]: e.target.value }))}
            />
          </form>
        </div>
          );
        })}

        <form className="field" onSubmit={submitList}>
          <input
            className="input"
            placeholder="+ Add another checklist (name) + Enter"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
          />
        </form>

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
