"use client";

import { useState } from "react";

function fmtDue(d) {
  if (!d) return null;
  try {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

export default function Card({ task, onToggleCheck, onAddCheck, onDelete, onDragStart, onDragEnd }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const isDone = task.column === "done";
  const checks = task.checklist || [];
  const doneCount = checks.filter((c) => c.done).length;
  const pct = checks.length ? Math.round((doneCount / checks.length) * 100) : 0;
  const overdue =
    task.dueDate && !isDone && new Date(task.dueDate + "T23:59:59") < new Date();

  function submitCheck(e) {
    e.preventDefault();
    const v = text.trim();
    if (v) onAddCheck(task.id, v);
    setText("");
    setAdding(false);
  }

  return (
    <div
      className={`card ${isDone ? "is-done" : ""} ${task.priority ? "prio-" + task.priority : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.classList.add("dragging");
        onDragStart && onDragStart(task.id);
      }}
      onDragEnd={(e) => {
        e.currentTarget.classList.remove("dragging");
        onDragEnd && onDragEnd();
      }}
    >
      <div className="card-top">
        <div className="card-title">{task.title}</div>
        <button
          className="card-del"
          title="Delete card"
          onClick={() => onDelete(task.id)}
        >
          ×
        </button>
      </div>

      {task.notes ? <div className="hint">{task.notes}</div> : null}

      {task.flags && task.flags.length > 0 && (
        <div className="flags">
          {task.flags.map((f) => (
            <span key={f} className={`flag ${f}`}>
              {f}
            </span>
          ))}
        </div>
      )}

      {checks.length > 0 && (
        <>
          <div className="checklist">
            {checks.map((c) => (
              <label key={c.id} className={`check ${c.done ? "done" : ""}`}>
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={() => onToggleCheck(task.id, c.id)}
                />
                <span>{c.text}</span>
              </label>
            ))}
          </div>
          <div className="check-progress">
            <div style={{ width: `${pct}%` }} />
          </div>
        </>
      )}

      {adding ? (
        <form onSubmit={submitCheck}>
          <input
            className="input"
            style={{ marginTop: 8, fontSize: 13 }}
            autoFocus
            placeholder="Checklist item…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={submitCheck}
          />
        </form>
      ) : (
        <button className="add-check" onClick={() => setAdding(true)}>
          + checklist item
        </button>
      )}

      <div className="card-meta">
        {task.dueDate && (
          <span className={`due ${overdue ? "overdue" : ""}`}>
            {overdue ? "⚑ " : "📅 "}
            {fmtDue(task.dueDate)}
          </span>
        )}
        {checks.length > 0 && (
          <span>
            {doneCount}/{checks.length}
          </span>
        )}
        {task.week && <span className="week-tag">{task.week}</span>}
      </div>
    </div>
  );
}
